/**
 * Contains endpoints related to service health
 */
const config = require('config')
const _ = require('lodash')
const logger = require('../common/logger')

let kafkaModulePromise

function loadKafkaModule () {
  if (!kafkaModulePromise) {
    kafkaModulePromise = import('@platformatic/kafka')
  }
  return kafkaModulePromise
}

/**
 * Health Check.  Ensures we have a proper, valid connection to Kafka
 * If we do have a valid connection, return 200/ok
 * If the Kafka connection has failed, return a 500/internal server error
 * @param req the request
 * @param res the response
 */
async function health (req, res) {
  try {
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

    logger.info('Health check testing connection to Kafka...')

    await consumer.metadata({ topics: [] })
    await consumer.close()
    const healthData = { health: 'ok' }
    console.log('health', healthData)
    res.json(healthData)
  } catch (err) {
    const errorMessage = err && err.message ? err.message : String(err)
    console.log('health', { health: 'error', error: errorMessage })
    res.sendStatus(500)
  }
}

// Exports
module.exports = {
  health
}
