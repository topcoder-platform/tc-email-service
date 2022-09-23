/**
 * Copyright (C) 2022TopCoder Inc., All Rights Reserved.
 */



const sequelizeInstance = require('./datasource');
const DataTypes = require('sequelize/lib/data-types');
const logger = require('../common/logger');

async function defineEmailModel(sequelize, DataTypes) {
  const Email = sequelize.define('Email', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    topicName: { type: DataTypes.STRING, allowNull: true, field: 'topic_name' },
    data: { type: DataTypes.TEXT, allowNull: false },
    recipients: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
  });
  await Email.sync();
  return Email;
}

async function loadSequelizeModule() {
  return await sequelizeInstance.getSequelize();
}
async function loadEmailModule() {
  const sequelize = await loadSequelizeModule();
  return defineEmailModel(sequelize, DataTypes);
}

async function init() {
  logger.info("Initializing models");
  const sequelize = await loadSequelizeModule();
  await sequelize.sync();
}


module.exports = {
  loadEmailModule,
  init,
};
