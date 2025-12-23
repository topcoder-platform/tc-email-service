/**
 * The application entry point
 */

const config = require('config')
const _ = require('lodash')
const logger = require('./common/logger')
const models = require('./models')

let kafkaModulePromise

function loadKafkaModule () {
  if (!kafkaModulePromise) {
    kafkaModulePromise = import('@platformatic/kafka')
  }
  return kafkaModulePromise
}

/**
 * Configure Kafka consumer.
 * @param {Object} handlers the handlers
 */
async function configureKafkaConsumer (handlers) {
  // create group consumer
  let brokers = ['']
  if (config.KAFKA_URL.startsWith('ssl://')) {
    brokers = _.replace(config.KAFKA_URL, 'ssl://', '').split(',')
  } else {
    brokers = config.KAFKA_URL.split(',')
  }
  const options = {
    clientId: config.KAFKA_CLIENT_ID || 'tc-email-service',
    groupId: config.KAFKA_GROUP_ID,
    bootstrapBrokers: brokers
  }

  const { Consumer } = await loadKafkaModule()
  const consumer = new Consumer(options)

  logger.info('Connecting to Kafka...')
  logger.info(`Kafka options: ${JSON.stringify(options)}`)
  logger.info(`Kafka group ID: ${config.KAFKA_GROUP_ID}`)
  const topics = _.keys(handlers)
  logger.info(`Subscribing to topics: ${topics}`)
  dataHandler(consumer, topics, handlers).catch((err) => {
    console.log('error', 'Kafka consumer error', err)
    logger.error(err)
  })
}

async function dataHandler (consumer, topics, handlers) {
  try {
    const stream = await consumer.consume({ topics, autocommit: true })
    stream.on('error', (err) => {
      console.log('error', 'Kafka consumer error', err)
      logger.error(err)
    })

    const errorTypes = ['unhandledRejection', 'uncaughtException']
    const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']

    const closeConsumer = async () => {
      try {
        await stream.close()
      } catch (err) {
        logger.error(err)
      }
      try {
        await consumer.close()
      } catch (err) {
        logger.error(err)
      }
    }

    errorTypes.forEach(type => {
      process.on(type, async e => {
        try {
          console.log(`process.on ${type}`)
          console.error(e)
          await closeConsumer()
          process.exit(0)
        } catch (_) {
          process.exit(1)
        }
      })
    })

    signalTraps.forEach(type => {
      process.once(type, async () => {
        try {
          await closeConsumer()
        } finally {
          process.kill(process.pid, type)
        }
      })
    })

    for await (const message of stream) {
      const span = await logger.startSpan('dataHandler')
      const topic = message.topic
      const msg = message.value
      const partition = message.partition
      // If there is no message, return
      if (!msg) continue
      const messageValue = msg.toString('utf8')
      logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Message: ${messageValue}.`)
      // ignore configured Kafka topic prefix
      const topicName = topic
      // find handler
      const handler = handlers[topicName]
      if (!handler) {
        logger.info(`No handler configured for topic: ${topicName}`)
        // return null to ignore this message
        continue
      }
      const emailModel = await models.loadEmailModule()
      const busPayload = JSON.parse(messageValue)
      const messageJSON = busPayload.payload
      try {
        const emailInfo = {
          status: 'PENDING',
          topicName,
          data: JSON.stringify(messageJSON),
          recipients: JSON.stringify(messageJSON.recipients)
        }

        const emailObj = await emailModel.create(emailInfo)
        const result = await handler(topicName, messageJSON)

        logger.info('info', 'Email sent', {
          sender: 'Connect',
          to_address: messageJSON.recipients.join(','),
          from_address: config.EMAIL_FROM,
          status: result.success ? 'Message accepted' : 'Message rejected',
          error: result.error ? result.error.toString() : 'No error message'
        })
        const emailTries = {}
        if (result.success) {
          emailTries[topicName] = 0
          emailObj.status = 'SUCCESS'
          await emailObj.save()
        } else {
          // emailTries[topicName] += 1; //temporary disabling this feature
          if (result.error) {
            logger.error('error', 'Send email error details', result.error)
          }
        }
        await logger.endSpan(span)
      } catch (e) {
        await logger.endSpanWithError(span, e)
        logger.error(e)
      }
    }
  } catch (e) {
    logger.error(e)
  }
}

/**
 * Callback to retry sending email.
 * @param {Object} handlers the handlers
 */
async function retryEmail (handlers) {
  const span = await logger.startSpan('retryEmail')
  const loader = await models.loadEmailModule()
  const emailModel = await loader.findAll({ where: { status: 'FAILED', createdAt: { $gt: new Date(new Date() - config.EMAIL_RETRY_MAX_AGE) } } })
  if (emailModel.length > 0) {
    logger.info(`Found ${emailModel.length} e-mails to be resent`)
    emailModel.map(async m => {
      // find handler
      const handler = handlers[m.topicName]
      if (!handler) {
        logger.warn(`No handler configured for topic: ${m.topicName}`)
        await logger.endSpan(span)
        return m
      }
      const messageJSON = { data: JSON.parse(m.data), recipients: JSON.parse(m.recipients) }
      const result = await handler(m.topicName, messageJSON)
      if (result.success) {
        logger.info(`Email model with ${m.id} was sent correctly`)
        m.status = 'SUCCESS'
        await logger.endSpan(span)
        return m.save()
      }
      logger.info(`Email model with ${m.id} wasn't sent correctly`)
      await logger.endSpan(span)
      return m
    })
  } else {
    await logger.endSpan(span)
    return models
  }
}

async function initServer (handlers) {
  const span = await logger.startSpan('initServer')
  try {
    await models.init()
    await configureKafkaConsumer(handlers)
    await logger.endSpan(span)
  } catch (e) {
    await logger.endSpanWithError(span, e)
  }
}
// Exports
module.exports = {
  initServer,
  retryEmail
}

logger.buildService(module.exports)
