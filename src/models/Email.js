/**
 * Copyright (C) 2018 TopCoder Inc., All Rights Reserved.
 */

/**
 * the email schema
 *
 * @author      TCSCODER
 * @version     1.0
 */
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

module.exports = {
  defineEmailModel
}

// sequelize will generate and manage createdAt, updatedAt fields
