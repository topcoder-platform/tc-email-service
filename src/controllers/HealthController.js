/**
 * Contains endpoints related to service health
 */

/**
 * Health Check.
 * @param req the request
 * @param res the response
 */
function health(req, res) {
  res.json({ health: 'ok' });
}

// Exports
module.exports = {
  health,
};
