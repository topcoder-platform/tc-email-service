'use strict';

module.exports = {
  '/templates/:name': {
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
