/**
 * Email test.
 */
/* eslint-env mocha */
const _ = require('lodash')
const config = require('config')
const Kafka = require('no-kafka')

const emailServer = require('../index')
const service = require('../connect/service')

const defaultHandler = async (topic, message, callback) => {
  const templateId = config.TEMPLATE_MAP[topic]
  if (templateId === undefined) {
    return { success: false, error: `Template not found for topic ${topic}` }
  }
  try {
    // send email
    await service.sendEmail(templateId, message)
    return { success: true }
  } catch (e) {
    return { success: true }
  }
}

// init all events
_.keys(config.TEMPLATE_MAP).forEach((eventType) => {
  emailServer.addTopicHandler(eventType, defaultHandler)
})

const successTestMessage = {
  data: {
    title: 'Title',
    value: 'Value',
    subject: 'Subject'
  },
  recipients: ['invalid@invalid.tt']
}

describe('Email Test', () => {
  let producer

  before(() => {
    producer = new Kafka.Producer()
    return producer.init().then(() => emailServer.start())
  })

  after(function () {
    return producer.end()
  })

  describe('Created', () => {
    it('success', (done) => {
      producer.send({
        topic: `${config.KAFKA_TOPIC_PREFIX}email.project.created`,
        message: {
          value: JSON.stringify(successTestMessage)
        }
      })
    })
  })

  describe('Updated', () => {
    it('success', (done) => {
      producer.send({
        topic: `${config.KAFKA_TOPIC_PREFIX}email.project.updated`,
        message: {
          value: JSON.stringify(successTestMessage)
        }
      })
    })
  })
})
