/**
 * This is TopCoder connect email service.
 */
'use strict';

const sgMail = require('@sendgrid/mail');
const config = require('config');

// set api key for SendGrid email client
sgMail.setApiKey(config.SENDGRID_API_KEY);

const sendEmail = (templateId, message) => { // send email

  const from = message.from ? message.from : config.EMAIL_FROM;
  const replyTo = message.replyTo ? message.replyTo : config.EMAIL_FROM;
  const substitutions = message.data ;
  const categories = message.categories ? message.categories: [];
  const to = message.recipients;
  const cc =  message.cc ? message.cc : [];
  const bcc = message.bcc ? message.bcc : [];
  
  if (message.version && message.version=="v3"){
    return  sgMail.send({
      to,
      templateId,
      dynamicTemplateData: substitutions,
      from,
      replyTo,
      categories,
      cc,
      bcc,
    });
  } else{
    return  sgMail.send({
      to,
      templateId,
      substitutions,
      substitutionWrappers: ['{{', '}}'],
      from,
      replyTo,
      categories,
      cc,
      bcc,
    });
  }
}
module.exports = {
  sendEmail,
}
