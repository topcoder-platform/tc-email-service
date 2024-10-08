/**
 * Contains endpoints related to service health
 */
const config = require('config')
const _ = require('lodash')
const { Kafka } = require('kafkajs')
const logger = require('../common/logger')

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
    const options = { brokers }
    if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
      options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
    }

    const kafka = new Kafka(options)
    const consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID })

    logger.info("Health check testing connection to Kafka...")
    
    await consumer.connect()
    await consumer.disconnect()
    res.json({ health: 'ok' })
  }
  catch(err){
    res.sendStatus(500);
  }
  
}

// Exports
module.exports = {
  health
}
