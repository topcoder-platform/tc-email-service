/**
 * This is TopCoder connect email service.
 */
'use strict';

const sgMail = require('@sendgrid/mail');
const config = require('config');

// set api key for SendGrid email client
sgMail.setApiKey(config.SENDGRID_API_KEY);

const sendEmail = (templateId, to, substitutions, replyTo) => // send email
  sgMail.send({
    to,
    templateId,
    substitutions,
    from: config.EMAIL_FROM,
    substitutionWrappers: ['{{', '}}'],
    replyTo,
  });

module.exports = {
  sendEmail,
}
