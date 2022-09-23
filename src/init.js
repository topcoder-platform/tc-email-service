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
  let brokers = ['']
  if (config.KAFKA_URL.startsWith('ssl://')) {
    brokers = config.KAFKA_URL.split('ssl://')[1].split(',')
  } else {
    brokers = config.KAFKA_URL.split(',')
  }
  const options = { brokers };
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY };
  }


  const kafka = new Kafka(options)
  const consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });
  await consumer.connect()
  await consumer.subscribe({ topics: _.keys(handlers) });
  dataHandler(consumer, handlers).catch((err) => {
    logger.error(err);
  });
}


async function dataHandler(consumer, handlers) {
  await consumer.run({
    eachMessage: async (data) => {
      const topic = data.topic
      const msg = data.message
      const partition = data.partition
      //If there is no message, return
      if (!msg) return
      const message = msg.value.toString('utf8')
      logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Message: ${message}.`);
      // ignore configured Kafka topic prefix
      let topicName = topic;
      // find handler
      const handler = handlers[topicName];
      if (!handler) {
        logger.info(`No handler configured for topic: ${topicName}`);
        // return null to ignore this message
        return null;
      }
      console.log([1])
      const emailModel = await models.loadEmailModule()
      const busPayload = JSON.parse(message);
      const messageJSON = busPayload.payload;
      try {

        const emailInfo = {
          status: 'PENDING',
          topicName,
          data: JSON.stringify(messageJSON),
          recipients: JSON.stringify(messageJSON.recipients),
        }

        try {
          console.log(emailModel)
          await emailModel.create(emailInfo)

        } catch (err) {
          console.log(err)
        }
        const result = await handler(topicName, messageJSON);

        logger.info('info', 'Email sent', {
          sender: 'Connect',
          to_address: messageJSON.recipients.join(','),
          from_address: config.EMAIL_FROM,
          status: result.success ? 'Message accepted' : 'Message rejected',
          error: result.error ? result.error.toString() : 'No error message',
        });

        if (result.success) {
          emailTries[topicName] = 0;
          emailModel.status = 'SUCCESS';
          await emailModel.save();
        } else {
          // emailTries[topicName] += 1; //temporary disabling this feature 
          if (result.error) {
            logger.error('error', 'Send email error details', result.error);
          }
        }
      } catch (e) {
        console.log(e)
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
async function retryEmail(handlers) {
  const loader = await models.loadEmailModule()
  const emailModel = await loader.findAll({ where: { status: 'FAILED', createdAt: { $gt: new Date(new Date() - config.EMAIL_RETRY_MAX_AGE) } } })

  if (emailModel.length > 0) {
    logger.info(`Found ${emailModel.length} e-mails to be resent`);
    emailModel.map(async m => {
      // find handler
      const handler = handlers[m.topicName];
      if (!handler) {
        logger.warn(`No handler configured for topic: ${m.topicName}`);
        return m;
      }
      const messageJSON = { data: JSON.parse(m.data), recipients: JSON.parse(m.recipients) };
      const result = await handler(m.topicName, messageJSON);
      if (result.success) {
        logger.info(`Email model with ${m.id} was sent correctly`);
        m.status = 'SUCCESS';
        return m.save();
      }
      logger.info(`Email model with ${m.id} wasn't sent correctly`);
      return m;
    });
  } else {
    return models;
  }

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
