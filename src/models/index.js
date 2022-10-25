/**
 * Copyright (C) 2022TopCoder Inc., All Rights Reserved.
 */

const sequelizeInstance = require('./datasource')
const DataTypes = require('sequelize/lib/data-types')
const logger = require('../common/logger')

async function defineEmailModel (sequelize, DataTypes) {
  const span = await logger.startSpan('defineEmailModel')
  const Email = sequelize.define('Email', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    topicName: { type: DataTypes.STRING, allowNull: true, field: 'topic_name' },
    data: { type: DataTypes.TEXT, allowNull: false },
    recipients: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false }
  })
  await Email.sync()
  await logger.endSpan(span)
  return Email
}

async function loadSequelizeModule () {
  const span = await logger.startSpan('loadSequelizeModule')
  const res = await sequelizeInstance.getSequelize()
  await logger.endSpan(span)
  return res
}
async function loadEmailModule () {
  const span = await logger.startSpan('loadEmailModule')
  const sequelize = await loadSequelizeModule()
  await logger.endSpan(span)
  return defineEmailModel(sequelize, DataTypes)
}

async function init () {
  logger.info('Initializing models')
  const span = await logger.startSpan('init')
  const sequelize = await loadSequelizeModule()
  await sequelize.sync()
  await logger.endSpan(span)
}

module.exports = {
  loadEmailModule,
  init
}

logger.buildService(module.exports)
