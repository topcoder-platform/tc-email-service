/**
 * Contains endpoints related to template controller
 */
'use strict';

const TemplateService = require('../services/TemplateService');

/**
 * Get list with email template placeholder names.
 * @param req the request
 * @param res the response
 */
function* eventTypes(req, res) {
  res.json(yield TemplateService.listPlaceholders(req.params.name));
}

// Exports
module.exports = {
  eventTypes,
};
