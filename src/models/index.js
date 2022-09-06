/**
 * Copyright (C) 2018 TopCoder Inc., All Rights Reserved.
 */

/**
 * the sequelize schema index
 *
 * @author      TCSCODER
 * @version     1.0
 */

const sequelizeInstance = require('./datasource');
const DataTypes = require('sequelize/lib/data-types');
const Email = require('./Email')

async function loadSequelizeModule() {
  return await sequelizeInstance.getSequelize();
}
async function loadEmailModule() {
  const sequelize = await loadSequelizeModule();
  return await Email(sequelize, DataTypes);
}

async function init() {
  const sequelize = await loadSequelizeModule();
  await sequelize.sync();
}


module.exports = {
  Email: loadEmailModule,
  init,
};
