/**
 * The configuration file.
 */
module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL,
  PORT: process.env.PORT,
  AUTH_SECRET: process.env.AUTH_SECRET,
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

  VALID_ISSUERS: process.env.VALID_ISSUERS,
  KAFKA_URL: process.env.KAFKA_URL,

  // max bytes 2MB
  KAFKA_MAXBYTES: process.env.MAXBYTES || 2097152,

  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID,
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT ? process.env.KAFKA_CLIENT_CERT.replace('\\n', '\n') : null,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY ?
    process.env.KAFKA_CLIENT_CERT_KEY.replace('\\n', '\n') : null,

  // mapping from event type to sendgrid email template id
  TEMPLATE_MAP: process.env.TEMPLATE_MAP,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@topcoder.com',
  
  // temporary not in use feature
  EMAIL_MAX_ERRORS: process.env.EMAIL_MAX_ERRORS || 2,
  EMAIL_PAUSE_TIME: process.env.EMAIL_PAUSE_TIME || 30,

  //in every 2 minutes will retry for failed status
  EMAIL_RETRY_SCHEDULE: process.env.EMAIL_RETRY_SCHEDULE || '0 */2 * * * *',
  //wont't retry failed emails older than this time (msec)
  EMAIL_RETRY_MAX_AGE: process.env.EMAIL_RETRY_MAX_AGE || 1000*60*60*24,

  API_CONTEXT_PATH: process.env.API_CONTEXT_PATH || '/v5/email',

  PAYLOAD_SENDGRID_TEMPLATE_KEY: process.env.PAYLOAD_SENDGRID_TEMPLATE_KEY || 'sendgrid_template_id',

};
