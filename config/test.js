/**
 * The test configuration file. These config will override default config.
 */
module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 4000,
  KAFKA_TOPIC_PREFIX: process.env.KAFKA_TOPIC_PREFIX || 'joan-26673.',
  // mapping from event type to sendgrid email template id
  TEMPLATE_MAP: {
    'email.project.created': 'f6f1e082-b12d-4117-a9f1-509013624465',
    'email.project.updated': 'fb89a4e1-cf42-4d7d-9f03-c22a601a5554',
  },
};
