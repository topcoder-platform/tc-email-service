/**
 * The production configuration file. These config will override default config.
 */
module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'error',
  PORT: process.env.PORT || 4000,
  DISABLE_LOGGING: process.env.DISABLE_LOGGING || 'true',
};
