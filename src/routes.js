'use strict';

module.exports = {
  '/health': {
    get: {
      controller: 'HealthController',
      method: 'health',
    },
  },
};
