'use strict';

module.exports = {
  '/templates/eventType/:name': {
    get: {
      controller: 'TemplateController',
      method: 'eventTypes',
    },
  },
  '/health': {
    get: {
      controller: 'HealthController',
      method: 'health',
    },
  },
};
