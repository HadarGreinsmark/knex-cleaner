'use strict';

var Promise = require('bluebird');
var _ = require('lodash');

var DefaultOptions = {
  ignoreTables: []     // List of tables to not filter out
}

function getTablesNameSql(knex) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return "show tables";
      break;
    case 'postgresql':
      return "SELECT tablename FROM pg_catalog.pg_tables"
        + " WHERE schemaname='public';";
      break;
    case 'sqlite3':
      return "SELECT name FROM sqlite_master WHERE type='table';";
      break;
    default:
      throw new Error('Could not get the sql to select table names from client: ' + client);
      break;
  }
}

function getSqlRows(knex, resp) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return resp[0];
      break;
    case 'postgresql':
      return resp.rows
      break;
    case 'sqlite3':
      return resp.rows;
      break;
    default:
      throw new Error('Could not get the sql response from client: ' + client);
      break;
  }
}

function getDropTables(knex, tables) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return knex.transaction(function(trx) {
        knex.raw('SET FOREIGN_KEY_CHECKS=0').transacting(trx)
        .then(function() {
          return Promise.map(tables, function(tableName) {
            return knex.schema.dropTable(tableName).transacting(trx);
          });
        })
        .then(trx.commit)
        .then(function() {
          return knex.raw('SET FOREIGN_KEY_CHECKS=1').transacting(trx);
        });
      });
      break;
    case 'postgresql':
      return knex.raw('DROP TABLE IF EXISTS ' + tables.join(",") + ' CASCADE');
      break;
    case 'sqlite3':
      return Promise.map(tables, function(tableName) {
        return knex.schema.dropTable(tableName).transacting(trx);
      });
      break;
    default:
      throw new Error('Could not drop tables for the client: ' + client);
      break;
  }
}

function getTableNames(knex, options) {
  options = _.defaults(typeof options !== 'undefined' ? options : {}, DefaultOptions);

  return knex.raw(getTablesNameSql(knex))
    .then(function(resp) {
      return getSqlRows(knex, resp)
        .map(function(table) {
          return table[Object.keys(table)[0]];
        })
        .filter(function(tableName) {
          return !_.contains(options.ignoreTables, tableName);
        });
    });
}

function getTableRowCount(knex, tableName) {
  var client = knex.client.dialect;

  switch(client) {
    case 'mysql':
      return knex(tableName).count().then(function(resp) {
        return Number(resp[0]['count(*)']);
      });
      break;
    case 'postgresql':
      return knex(tableName).count().then(function(resp) {
        return Number(resp[0].count);
      });
      break;
    case 'sqlite3':
      return knex(tableName).count().then(function(resp) {
        return Number(resp[0].count);
      });
      break;
    default:
      throw new Error('Could not get the table row count from client: ' + client);
      break;
  }
}

module.exports = {
  getTableNames: function(knex, options) {
    return getTableNames(knex, options);
  },
  getTableRowCount: function(knex, tableName) {
    return getTableRowCount(knex, tableName);
  },
  getDropTables: function(knex, tables) {
    return getDropTables(knex, tables);
  },
};
