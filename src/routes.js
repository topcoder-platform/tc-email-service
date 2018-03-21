'use strict';

const config = require('config');

const routes = {};

const oldkeyEventType = '/email/templates/eventType/:name'
routes[oldkeyEventType] = {
  get: {
    controller: 'TemplateController',
    method: 'eventTypes',
  }
};

const oldkeyHealthCheck = '/email/health'
routes[oldkeyHealthCheck] = {
  get: {
    controller: 'HealthController',
    method: 'health',
  }
};

const keyEventType = `${config.API_CONTEXT_PATH}/${config.API_VERSION}/templates/eventType/:name`;
routes[keyEventType] = {
  get: {
    controller: 'TemplateController',
    method: 'eventTypes',
  }
};

const keyHealthCheck = `${config.API_CONTEXT_PATH}/${config.API_VERSION}/health`;
routes[keyHealthCheck] = {
  get: {
    controller: 'HealthController',
    method: 'health',
  }
};


module.exports = routes;
