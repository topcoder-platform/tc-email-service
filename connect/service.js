/**
 * This is TopCoder connect email service.
 */

const sgMail = require('@sendgrid/mail')
const config = require('config')
const logger = require('../src/common/logger')

// set api key for SendGrid email client
sgMail.setApiKey(config.SENDGRID_API_KEY)

const sendEmail = async (templateId, message) => { // send email
  const span = await logger.startSpan('sendEmail')
  let msg = {}
  const from = message.from ? message.from : config.EMAIL_FROM
  const replyTo = message.replyTo ? message.replyTo : config.EMAIL_FROM
  const substitutions = message.data
  const categories = message.categories ? message.categories : []
  const to = message.recipients
  const cc = message.cc ? message.cc : []
  const bcc = message.bcc ? message.bcc : []
  const sendAt = message.sendAt ? message.sendAt : undefined
  const personalizations = message.personalizations ? message.personalizations : undefined
  const attachments = message.attachments ? message.attachments : []

  if (message.version && message.version === 'v3') {
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
    }
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
      bcc
    }
  }
  logger.info(`Sending email with templateId: ${templateId} and message: ${JSON.stringify(msg)}`)
  try {
    await logger.endSpan(span)
    const sgSpan = await logger.startSpan('sendgrid')
    const result = await sgMail.send(msg)
    await logger.endSpan(sgSpan)
    logger.info(`Email sent successfully with result: ${JSON.stringify(result)} \n ${JSON.stringify(msg)}`)
    return result
  } catch (err) {
    logger.error(`Error occurred in sendgrid api calling: ${err}`)
    throw err
  }
}
module.exports = {
  sendEmail
}
logger.buildService(module.exports)
