/**
 * The production configuration file. These config will override default config.
 */
module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  PORT: process.env.PORT || 4000,
  // mapping from event type to sendgrid email template id
  TEMPLATE_MAP: {
    'email.project.created': 'f6f1e082-b12d-4117-a9f1-509013624465',
    'email.project.updated': 'fb89a4e1-cf42-4d7d-9f03-c22a601a5554',
  },
};
