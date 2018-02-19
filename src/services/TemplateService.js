/**
 * Service for email template placeholders.
 */

'use strict';

const _ = require('lodash');
const client = require('@sendgrid/client');
const config = require('config');
const Joi = require('joi');
const errors = require('../common/errors');
const logger = require('../common/logger');

// set api key for SendGrid email client
client.setApiKey(config.SENDGRID_API_KEY);

/**
 * Find placeholders inside html template string.
 *
 * @param {String} html the html string with template
 * @return {Array} the list of placeholders names
 */
function* _findPlaceholders(html) {
  const pattern = /{{(.*?)}}/g;
  const placeholders = [];
  let match = pattern.exec(html);
  while (match != null) {
    // ignore duplicates and empty placeholder
    if (match[1].length > 0 && !_.includes(placeholders, match[1])) {
      placeholders.push(match[1]);
    }
    match = pattern.exec(html);
  }
  return placeholders;
}

/**
 * Get email template placeholder name.
 *
 * @param {String} name the Kafka topic name
 * @return {Array} the list of email template placeholder names
 */
function* listPlaceholders(name) {
  const templateId = config.TEMPLATE_MAP[name];
  if (templateId === undefined) {
    throw new errors.BadRequestError(`Topic ${name} was not found`);
  }

  try {
    const response = yield client.request({
      method: 'GET',
      url: '/v3/templates/' + templateId,
    });

    const template = response[0].body;
    if (template.versions.length === 0) {
      throw new errors.NotFoundError(`Template with id ${templateId} has no version in SendGrid`);
    }
    logger.debug(template.versions[0]);

    return yield _findPlaceholders(template.versions[0].html_content + template.versions[0].subject);
  } catch (err) {
    if (err.code === 404) {
      throw new errors.NotFoundError(`Template with id ${templateId} for topic ${name} not found in SendGrid`);
    } else if (err.code === 403) {
      throw new errors.ForbiddenError('Sendgrid API key is invalid');
    } else {
      throw err;
    }
  }
}

listPlaceholders.schema = {
  name: Joi.string().required(),
};

module.exports = {
  listPlaceholders,
};
