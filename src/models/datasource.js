/**
 * Copyright (C) 2022 Topcoder Inc., All Rights Reserved.
 */

/**
 * Init  datasource
 *
 * @author      TCSCODER
 * @version     2.0
 */

const config = require('config');
const Sequelize = require('sequelize');
const logger = require('../common/logger');

let sequelizeInstance = null;

/**
 * get sequelize instance
 */
async function getSequelize() {
  if (!sequelizeInstance) {
    sequelizeInstance = new Sequelize(config.DATABASE_URL, config.DATABASE_OPTIONS);
    try {
      await sequelizeInstance.authenticate()
      logger.info('Database connection has been established successfully.');
    } catch (e) {
      logger.error('Unable to connect to the database:', err);
    }
  }
  return sequelizeInstance;
}

module.exports = {
  getSequelize,
};
