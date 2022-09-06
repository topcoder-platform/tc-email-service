require('dotenv').config()
const config = require('config');
const jwtAuth = require('tc-core-library-js').middleware.jwtAuthenticator;
const express = require('express');
const _ = require('lodash');
const schedule = require('node-schedule');
const cors = require('cors');
const bodyParser = require('body-parser');
const helper = require('./src/common/helper');
const logger = require('./src/common/logger');
const errors = require('./src/common/errors');
const { initServer } = require('./src/init');

config.TEMPLATE_MAP = JSON.parse(config.TEMPLATE_MAP);

// key is topic name, e.g. 'notifications.connect.project.created';
// value is handler for the topic to find user ids that should receive notifications for a message,
// it is defined as: function(topic, message, callback),
// the topic is topic name,
// the message is JSON event message,
// the callback is function(error, userIds), where userIds is an array of user ids to receive notifications
const handlers = {};

/**
 * Set configuration, the default config will be overridden by the given config,
 * unspecified config parameters will not be changed, i.e. still using default values.
 *
 * Note that setConfig should be called before the initDatabase and start functions.
 *
 * @param {Object} cfg the configuration to set
 */
function setConfig(cfg) {
  if (!cfg) {
    throw new errors.ValidationError('Missing configuration.');
  }
  _.extend(config, cfg);
}

/**
 * Remove topic handler for topic.
 * @param {String} topic the topic name
 */
function removeTopicHandler(topic) {
  if (!topic) {
    throw new errors.ValidationError('Missing topic.');
  }
  delete handlers[topic];
}

/**
 * Get all topic handlers.
 * @returns {Object} all topic handlers, key is topic name, value is handler
 */
function getAllHandlers() {
  return handlers;
}

/**
 * Add topic handler for topic, override existing one if any.
 * @param {String} topic the topic name
 * @param {Function} handler the handler
 */
function addTopicHandler(topic, handler) {
  if (!topic) {
    throw new errors.ValidationError('Missing topic.');
  }
  if (!handler) {
    throw new errors.ValidationError('Missing handler.');
  }
  handlers[topic] = handler;
}

const app = express();
app.set('port', config.PORT);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const apiRouter = express.Router();

// load all routes
_.each(require('./src/routes'), (verbs, url) => {
  _.each(verbs, (def, verb) => {
    const actions = [];
    const method = require('./src/controllers/' + def.controller)[def.method];
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

console.log('app.start [3]')
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


function start() {

  initServer(handlers).then(() => {
    if (_.isEmpty(handlers)) {
      throw new errors.ValidationError('Missing handler(s).');
    }

    schedule.scheduleJob(config.EMAIL_RETRY_SCHEDULE, function () {
      app.retryEmail(handlers).catch((err) => logger.error(err));
    });
    app.listen(app.get('port'), () => {
      logger.info(`Express server listening on port ${app.get('port')}`);
    });
  })
}

// Exports
module.exports = {
  setConfig,
  addTopicHandler,
  removeTopicHandler,
  getAllHandlers,
  start
};
