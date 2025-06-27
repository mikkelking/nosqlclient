import { Meteor } from "meteor/meteor";
import { Connection } from "/server/imports/core";

Meteor.methods({
  saveConnection({ connection }) {
    Connection.save(connection);
  },

  checkAndSaveConnection({ connection }) {
    Connection.checkAndClear(connection);
    connection.databaseName = connection.databaseName || "admin";

    Connection.save(connection);
  },

  parseUrl({ connection }) {
    return Connection.parseUrl(connection);
  },

  async removeConnection({ connectionId }) {
    await Connection.removeAsync(connectionId);
  },
});
