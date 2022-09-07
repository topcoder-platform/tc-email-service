/**
 * This is TopCoder connect email service.
 */
'use strict';

const sgMail = require('@sendgrid/mail');
const config = require('config');

// set api key for SendGrid email client
sgMail.setApiKey(config.SENDGRID_API_KEY);

const sendEmail = (templateId, message) => { // send email

  let msg = {}
  const from = message.from ? message.from : config.EMAIL_FROM;
  const replyTo = message.replyTo ? message.replyTo : config.EMAIL_FROM;
  const substitutions = message.data;
  const categories = message.categories ? message.categories : [];
  const to = message.recipients;
  const cc = message.cc ? message.cc : [];
  const bcc = message.bcc ? message.bcc : [];
  const sendAt = message.sendAt ? message.sendAt : undefined;
  const personalizations = message.personalizations ? message.personalizations : undefined
  const attachments = message.attachments ? message.attachments : [];

  if (message.version && message.version == "v3") {
    msg = {
      to,
      templateId,
      dynamicTemplateData: substitutions,
      personalizations,
      from,
      replyTo,
      categories,
      cc,
      bcc,
      attachments,
      sendAt
    };
  } else {
    msg = {
      to,
      templateId,
      substitutions,
      substitutionWrappers: ['{{', '}}'],
      from,
      replyTo,
      categories,
      cc,
      bcc,
    };
  }
  return sgMail.send(msg)
}
module.exports = {
  sendEmail,
}
