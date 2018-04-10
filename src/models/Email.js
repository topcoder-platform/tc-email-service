/**
 * Copyright (C) 2018 TopCoder Inc., All Rights Reserved.
 */

/**
 * the email schema
 *
 * @author      TCSCODER
 * @version     1.0
 */


module.exports = (sequelize, DataTypes) => sequelize.define('Email', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  topicName: { type: DataTypes.STRING, allowNull: true, field: 'topic_name' },
  data: { type: DataTypes.TEXT, allowNull: false },
  recipients: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
}, {});

// sequelize will generate and manage createdAt, updatedAt fields
