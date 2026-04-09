import { Meteor } from "meteor/meteor";
import { Connection } from "/server/imports/core";

Meteor.methods({
  async saveConnection({ connection }) {
    await Connection.save(connection);
  },

  async checkAndSaveConnection({ connection }) {
    Connection.checkAndClear(connection);
    connection.databaseName = connection.databaseName || "admin";

    await Connection.save(connection);
  },

  parseUrl({ connection }) {
    return Connection.parseUrl(connection);
  },

  async removeConnection({ connectionId }) {
    await Connection.remove(connectionId);
  },
});
