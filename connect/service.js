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
  msg.from = message.from ? message.from : config.EMAIL_FROM;
  msg.replyTo = message.replyTo ? message.replyTo : config.EMAIL_FROM;
  msg.categories = message.categories ? message.categories : [];
  msg.to = message.recipients;
  msg.cc = message.cc ? message.cc : [];
  msg.bcc = message.bcc ? message.bcc : [];
  msg.templateId = templateId;
  const sendAt = message.sendAt ? message.sendAt : undefined;
  const personalizations = message.personalizations ? message.personalizations : null
  const substitutions = message.data;
  const attachments = message.attachments ? message.attachments : [];


  if (message.version && message.version == "v3") {
    msg = {
      dynamicTemplateData: substitutions,
      attachments,
      personalizations,
      sendAt
    };
  } else {
    msg = {
      substitutions,
      substitutionWrappers: ['{{', '}}'],
    };
  }
  return sgMail.send(msg)
}
module.exports = {
  sendEmail,
}
