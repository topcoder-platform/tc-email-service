/**
 * The application entry point
 */

const config = require('config');
const _ = require('lodash');
const { Kafka } = require('kafkajs')
const logger = require('./common/logger');
const models = require('./models');

let emailTries = {};




/**
 * Configure Kafka consumer.
 * @param {Object} handlers the handlers
 */
async function configureKafkaConsumer(handlers) {
  // create group consumer
  const options = { brokers: config.KAFKA_URL.split(',') };
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY };
  }
  const kafka = new Kafka(options)
  const consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });
  // data handler
  //TODO:what is this data handler?
  const dataHandler = (messageSet, topic, partition) => Promise.all(messageSet, (m) => {
    console.log("messageSet", messageSet);
    const message = m.message.value.toString('utf8');
    logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${m.offset}; Message: ${message}.`);
    // ignore configured Kafka topic prefix
    let topicName = topic;

    // find handler
    const handler = handlers[topicName];
    if (!handler) {
      logger.info(`No handler configured for topic: ${topicName}`);
      // return null to ignore this message
      return null;
    }
    let emailModel = {};
    const busPayload = JSON.parse(message);
    const messageJSON = busPayload.payload;
    const handlerAsync = Promise.promisify(handler);
    // use handler to create notification instances for each recipient
    return models.Email.create(
      Object.assign({ status: 'PENDING' }, {
        topicName,
        data: JSON.stringify(messageJSON.data),
        recipients: JSON.stringify(messageJSON.recipients),
      })
    ).then((model) => {
      emailModel = model;
      return handlerAsync(topicName, messageJSON);
    }).then((result) => { // save email
      const now = new Date();
      logger.log('info', 'Email sent', {
        sender: 'Connect',
        to_address: messageJSON.recipients.join(','),
        from_address: config.EMAIL_FROM,
        status: result.success ? 'Message accepted' : 'Message rejected',
        error: result.error ? result.error.toString() : 'No error message',
      });
      if (result.success) {
        emailTries[topicName] = 0;
        emailModel.status = 'SUCCESS';
        return emailModel.save();
      } else {
        // emailTries[topicName] += 1; //temporary disabling this feature 
        if (result.error) {
          logger.log('error', 'Send email error details', result.error);
        }
        emailModel.status = 'FAILED';
        return emailModel.save().then(() => {
        });
      }
    }).then(() => consumer.commitOffset({ topic, partition, offset: m.offset })) // commit offset
      .catch((err) => logger.error(err));
  });


  return startKafkaConsumer(consumer, handlers, dataHandler);
}

/**
 * Start Kafka consumer.
 * @param {Object} consumer the kafka consumer
 * @param {Object} handlers the handlers map
 * @param {Object} dataHandler the kafka data handler function
 */
async function startKafkaConsumer(consumer, handlers, dataHandler) {
  await consumer.connect()
  await Promise.all(_.keys(handlers), (topicName) => { // add back the ignored topic prefix to use full topic name
    emailTries[topicName] = 0;
    return consumer.subscribe(topicName, dataHandler);
  })

}

/**
 * Callback to retry sending email.
 * @param {Object} handlers the handlers
 */
function retryEmail(handlers) {
  return models.Email.findAll({ where: { status: 'FAILED', createdAt: { $gt: new Date(new Date() - config.EMAIL_RETRY_MAX_AGE) } } })
    .then((models) => {
      if (models.length > 0) {
        logger.info(`Found ${models.length} e-mails to be resent`);
        return Promise.each(models, (m) => {
          // find handler
          const handler = handlers[m.topicName];
          if (!handler) {
            logger.warn(`No handler configured for topic: ${m.topicName}`);
            return m;
          }
          const handlerAsync = Promise.promisify(handler);
          const messageJSON = { data: JSON.parse(m.data), recipients: JSON.parse(m.recipients) };
          return handlerAsync(m.topicName, messageJSON).then((result) => { // save email
            if (result.success) {
              logger.info(`Email model with ${m.id} was sent correctly`);
              m.status = 'SUCCESS';
              return m.save();
            }
            logger.info(`Email model with ${m.id} wasn't sent correctly`);
            return m;
          });
        });
      } else {
        return models;
      }
    });
}

async function initServer(handlers) {
  await models.init()
  await configureKafkaConsumer(handlers)
}
// Exports
module.exports = {
  initServer,
  retryEmail,
};
