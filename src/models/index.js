/**
 * Copyright (C) 2018 TopCoder Inc., All Rights Reserved.
 */

/**
 * the sequelize schema index
 *
 * @author      TCSCODER
 * @version     1.0
 */

const sequelize = require('./datasource').getSequelize();
const DataTypes = require('sequelize/lib/data-types');

const Email = require('./Email')(sequelize, DataTypes);

module.exports = {
  Email,
  init: () => sequelize.sync(),
};
