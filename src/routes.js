'use strict';

const config = require('config');

var routes = {};

let oldkeyEventType = '/email/templates/eventType/:name';
routes[oldkeyEventType] = {
  get: {
    controller: 'TemplateController',
    method: 'eventTypes',
  }
};

let oldkeyHealthCheck = '/email/health';
routes[oldkeyHealthCheck] = {
  get: {
    controller: 'HealthController',
    method: 'health',
  }
};

let keyEventType = `/${config.API_VERSION}/${config.API_CONTEXT_PATH}/templates/eventType/:name`;
routes[keyEventType] = {
  get: {
    controller: 'TemplateController',
    method: 'eventTypes',
  }
};

let keyHealthCheck = `/${config.API_VERSION}/${config.API_CONTEXT_PATH}/health`;
routes[keyHealthCheck] = {
  get: {
    controller: 'HealthController',
    method: 'health',
  }
};


module.exports = routes;
