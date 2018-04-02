/**
 * The application entry point
 */
'use strict';

require('./bootstrap');

const config = require('config');
const jwtAuth = require('tc-core-library-js').middleware.jwtAuthenticator;
const express = require('express');
const _ = require('lodash');
const cors = require('cors');
const bodyParser = require('body-parser');
const Kafka = require('no-kafka');
const schedule = require('node-schedule');
const helper = require('./common/helper');
const logger = require('./common/logger');
const errors = require('./common/errors');
const models = require('./models');

let emailTries = {};

/**
 * Configure Kafka consumer.
 * @param {Object} handlers the handlers
 */
function configureKafkaConsumer(handlers) {
  // create group consumer
  const options = { groupId: config.KAFKA_GROUP_ID, connectionString: config.KAFKA_URL };
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY };
  }
  const pauseTime = parseInt(config.EMAIL_PAUSE_TIME);
  const maxErrors = parseInt(config.EMAIL_MAX_ERRORS);
  const consumer = new Kafka.SimpleConsumer(options);

  // data handler
  const dataHandler = (messageSet, topic, partition) => Promise.each(messageSet, (m) => {
    const message = m.message.value.toString('utf8');
    logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${m.offset}; Message: ${message}.`);
    // ignore configured Kafka topic prefix
    let topicName = topic;
    if (config.KAFKA_TOPIC_IGNORE_PREFIX && topicName.startsWith(config.KAFKA_TOPIC_IGNORE_PREFIX)) {
      topicName = topicName.substring(config.KAFKA_TOPIC_IGNORE_PREFIX.length);
    }
    // find handler
    const handler = handlers[topicName];
    if (!handler) {
      logger.info(`No handler configured for topic: ${topicName}`);
      // return null to ignore this message
      return null;
    }
    let emailModel = {};
    const messageJSON = JSON.parse(message);
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
        from_address: messageJSON.recipients.join(','),
        to_address: config.EMAIL_FROM,
        status: result.success ? 'Message accepted' : 'Message rejected',
      });
      if (result.success) {
        emailTries[topicName] = 0;
        emailModel.status = 'SUCCESS';
        return emailModel.save();
      } else {
        // emailTries[topicName] += 1; //temporary disabling this feature 
        emailModel.status = 'FAILED';
        return emailModel.save().then(() => {
	 /* 
	  * temporary disabling this feature as there is chance of losing message during
	  * unsubscribe/pausing due to simple kafka consumer
         */ 	
	  /*	
          const currentTries = emailTries[topicName];
          if (currentTries > maxErrors) {
            logger.debug(`Failed to send email. Will sleep for ${pauseTime}s`);
            emailTries[topicName] = 0;

            schedule.scheduleJob(new Date(now.getTime() + pauseTime * 1000), () => {
              consumer.subscribe(topic, dataHandler);
            });

            return consumer.unsubscribe(topic, partition).then(() => {
              throw result.error
            });
          } else {
            logger.debug(`Failed to send email (retries left ${maxErrors - currentTries})`);
            throw result.error;
          }*/ 
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
function startKafkaConsumer(consumer, handlers, dataHandler) {
  /*const strategies = [{
    subscriptions: _.keys(handlers),
    handler: dataHandler
  }];
  return consumer.init(strategies);*/
  return consumer
    .init()
    .then(() => Promise.each(_.keys(handlers), (topicName) => { // add back the ignored topic prefix to use full topic name
        emailTries[topicName] = 0;
        return consumer.subscribe(`${config.KAFKA_TOPIC_IGNORE_PREFIX || ''}${topicName}`, dataHandler);
      })
    );
}

/**
 * Callback to retry sending email.
 * @param {Object} handlers the handlers
 */
function retryEmail(handlers) {
  return models.Email.findAll({ where: { status: 'FAILED' } }).then((models) => {
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

/**
 * Start the email server.
 * @param {Object} handlers the handlers
 */
function start(handlers) {
  const app = express();
  app.set('port', config.PORT);

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  const apiRouter = express.Router();

  // load all routes
  _.each(require('./routes'), (verbs, url) => {
    _.each(verbs, (def, verb) => {
      const actions = [];
      const method = require('./controllers/' + def.controller)[def.method];
      if (!method) {
        throw new Error(def.method + ' is undefined');
      }
      actions.push((req, res, next) => {
        req.signature = `${def.controller}#${def.method}`;
        next();
      });
      if (url !== '/health') {
        actions.push(jwtAuth());
        actions.push((req, res, next) => {
          if (!req.authUser) {
            return next(new errors.UnauthorizedError('Authorization failed.'));
          }
          req.user = req.authUser;
          return next();
        });
      }
      actions.push(method);
      apiRouter[verb](url, helper.autoWrapExpress(actions));
    });
  });

  app.use(config.API_CONTEXT_PATH, apiRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'route not found' });
  });

  app.use((err, req, res, next) => { // eslint-disable-line
    logger.logFullError(err, req.signature);
    let status = err.httpStatus || 500;
    if (err.isJoi) {
      status = 400;
    }
    // from express-jwt
    if (err.name === 'UnauthorizedError') {
      status = 401;
    }
    res.status(status);
    if (err.isJoi) {
      res.json({
        error: 'Validation failed',
        details: err.details,
      });
    } else {
      res.json({
        error: err.message,
      });
    }
  });

  return models
    .init()
    .then(() => configureKafkaConsumer(handlers))
    .then(() => {
      return app.listen(app.get('port'), () => {
        logger.info(`Express server listening on port ${app.get('port')}`);
      });
    });
}

// Exports
module.exports = {
  start,
  retryEmail,
};
