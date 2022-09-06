/**
 * Email test.
 */

const _ = require('lodash');
const sgMail = require('@sendgrid/mail');
const config = require('config');
const assert = require('chai').assert;
const Kafka = require('no-kafka');

const emailServer = require('../index');
const service = require('../connect/service');

let globalDone = null;

const defaultHandler = (topic, message, callback) => {
  const templateId = config.TEMPLATE_MAP[topic];
  if (templateId === undefined) {
    callback(null, { success: false, error: `Template not found for topic ${topic}` });
    return finish(`Template not found for topic ${topic}`);
  }

  // send email
  service.sendEmail(templateId, message).then(() => {
    callback(null, { success: true });
    finish(null);
  }).catch((err) => {
    callback(null, { success: false, error: err });
    finish(err);
  });
};

// init all events
_.keys(config.TEMPLATE_MAP).forEach((eventType) => {
  emailServer.addTopicHandler(eventType, defaultHandler);
});

const finish = (err) => {
  if (globalDone) {
    setTimeout(() => {
      globalDone(err);
      globalDone = null;
    }, 10);
  }
}

const successTestMessage = {
  data: {
    title: 'Title',
    value: 'Value',
    subject: 'Subject'
  },
  recipients: ['invalid@invalid.tt']
}

describe('Email Test', () => {
  let producer;

  before(() => {
    producer = new Kafka.Producer();
    return producer.init().then(() => emailServer.start());
  });

  after(function () {
    return producer.end();
  });

  describe('Created', () => {
    it('success', (done) => {
      globalDone = done;
      producer.send({
        topic: `${config.KAFKA_TOPIC_PREFIX}email.project.created`,
        message: {
          value: JSON.stringify(successTestMessage)
        }
      });
    });
  });

  describe('Updated', () => {
    it('success', (done) => {
      globalDone = done;
      producer.send({
        topic: `${config.KAFKA_TOPIC_PREFIX}email.project.updated`,
        message: {
          value: JSON.stringify(successTestMessage)
        }
      });
    });
  });

});
