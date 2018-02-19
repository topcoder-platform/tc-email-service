/**
 * The configuration file.
 */
module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL,
  PORT: process.env.PORT,
  authSecret: process.env.authSecret,
  authDomain: process.env.authDomain,
  jwksUri: process.env.jwksUri,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_OPTIONS: {
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.DATABASE_SSL != null,
    },
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
  },
  DISABLE_LOGGING: process.env.DISABLE_LOGGING || 'false',

  validIssuers: process.env.validIssuers ? process.env.validIssuers.replace(/\\"/g, '') : null,
  KAFKA_URL: process.env.KAFKA_URL,
  KAFKA_TOPIC_IGNORE_PREFIX: process.env.KAFKA_TOPIC_IGNORE_PREFIX,
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID,
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT ? process.env.KAFKA_CLIENT_CERT.replace('\\n', '\n') : null,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY ?
    process.env.KAFKA_CLIENT_CERT_KEY.replace('\\n', '\n') : null,

  // mapping from event type to sendgrid email template id
  TEMPLATE_MAP: process.env.TEMPLATE_MAP,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@topcoder.com',
  EMAIL_MAX_ERRORS: process.env.EMAIL_MAX_ERRORS || 2,
  EMAIL_PAUSE_TIME: process.env.EMAIL_PAUSE_TIME || 30,
  EMAIL_RETRY_SCHEDULE: process.env.EMAIL_RETRY_SCHEDULE || '0 */2 * * *',
};