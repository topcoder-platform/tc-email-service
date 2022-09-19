/**
 * The application entry point
 */

const config = require('config');
const _ = require('lodash');
const { Kafka } = require('kafkajs')
const logger = require('./common/logger');
const models = require('./models');


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
  await consumer.connect()
  await consumer.subscribe({ topics: _.keys(handlers) });
  dataHandler(consumer).catch((err) => {
    logger.error(err);
  });
}


async function dataHandler(consumer) {
  await consumer.run({
    eachMessage: async ({ topic, partition, msg }) => {
      const message = msg.value.toString('utf8')
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
      try {

        const result = await models.Email.create({
          status: 'PENDING',
          topicName,
          data: JSON.stringify(messageJSON),
          recipients: JSON.stringify(messageJSON.recipients),
        })

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
          emailModel.save();
        } else {
          // emailTries[topicName] += 1; //temporary disabling this feature 
          if (result.error) {
            logger.log('error', 'Send email error details', result.error);
          }
        }
      } catch (e) {
        logger.error(e)
      }




    },
  })

  const errorTypes = ['unhandledRejection', 'uncaughtException']
  const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

  errorTypes.forEach(type => {
    process.on(type, async e => {
      try {
        console.log(`process.on ${type}`)
        console.error(e)
        await consumer.disconnect()
        process.exit(0)
      } catch (_) {
        process.exit(1)
      }
    })
  })

  signalTraps.forEach(type => {
    process.once(type, async () => {
      try {
        await consumer.disconnect()
      } finally {
        process.kill(process.pid, type)
      }
    })
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
