/**
 * This is TopCoder connect email server.
 */
'use strict';

global.Promise = require('bluebird');

const _ = require('lodash');
const config = require('config');
const emailServer = require('../index');
const service = require('./service');
const logger = require('../src/common/logger');

// set configuration for the server, see ../config/default.js for available config parameters
// setConfig should be called before initDatabase and start functions
emailServer.setConfig({ LOG_LEVEL: 'debug' });

// add topic handlers,
// handler is used build a notification list for a message of a topic,
// it is defined as: function(topic, message, callback),
// the topic is topic name,
// the message is JSON event message,
// the callback is function(error, templateId), where templateId is the used SendGrid template id
const handler = (topic, message, callback) => {
  const templateId = config.TEMPLATE_MAP[topic];
  if (templateId === undefined) {
    return callback(null, { success: false, error: `Template not found for topic ${topic}` });
  }

  try {
    service.sendEmail(templateId, message).then(() => {
      callback(null, { success: true });
    }).catch((err) => {
      callback(null, { success: false, error: err });
    });
  } catch (error) {
    logger.error('Unknown Error: ', error);
  }

};

// init all events
_.keys(config.TEMPLATE_MAP).forEach((eventType) => {
  emailServer.addTopicHandler(eventType, handler);
});

// init database, it will clear and re-create all tables
emailServer
  .initDatabase()
  .then(() => emailServer.start())
  .catch((e) => console.log(e)); // eslint-disable-line no-console

// if no need to init database, then directly start the server:
// emailServer.start();
