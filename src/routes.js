'use strict';

module.exports = {
  '/email/templates/eventType/:name': {
    get: {
      controller: 'TemplateController',
      method: 'eventTypes',
    },
  },
  '/email/health': {
    get: {
      controller: 'HealthController',
      method: 'health',
    },
  },
};
