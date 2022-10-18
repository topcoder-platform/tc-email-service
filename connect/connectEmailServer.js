/**
 * This is TopCoder connect email server.
 */
const _ = require('lodash');
const config = require('config');
const emailServer = require('../index');
const service = require('./service');
const logger = require('../src/common/logger');

// set configuration for the server, see ../config/default.js for available config parameters
// setConfig should be called before initDatabase and start functions
emailServer.setConfig({ LOG_LEVEL: config.LOG_LEVEL });

// add topic handlers,
// handler is used build a notification list for a message of a topic,
// it is defined as: function(topic, message),
// the topic is topic name,
// the message is JSON event message,
const handler = async (topic, message) => {
  let templateId = config.TEMPLATE_MAP[topic];
  templateId = _.get(message, config.PAYLOAD_SENDGRID_TEMPLATE_KEY, templateId);
  if (!templateId) {
    return { success: false, error: `Template not found for topic ${topic}` };
  }

  try {
    await service.sendEmail(templateId, message)
    return { success: true };
  } catch (err) {
    logger.error("Error occurred in sendgrid api calling:", err);
    return { success: false, error: err };
  }

};

// init all events
_.keys(config.TEMPLATE_MAP).forEach((eventType) => {
  emailServer.addTopicHandler(eventType, handler);
});

// init database, it will clear and re-create all tables
emailServer
  .initDatabase()
  .then(() => {
    logger.info('Database initialized successfully.')

    emailServer.start()
  })
  .catch((e) => {
    logger.error('Error occurred in starting email server:', e);
    process.exit(1);
  }); // eslint-disable-line no-console

// if no need to init database, then directly start the server:
// emailServer.start()