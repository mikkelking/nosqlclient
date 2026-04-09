import { Meteor } from 'meteor/meteor';
import { MongoDBShell, MongoDB, MongoDBBackup, MongoDBUser } from '/server/imports/core';

Meteor.methods({
  async clearShell({ sessionId }) {
    await MongoDBShell.clearShell({ sessionId });
  },

  async executeShellCommand({ command, connectionId, username, password, sessionId }) {
    await MongoDBShell.executeShellCommand({ command, connectionId, username, password, sessionId });
  },

  async connectToShell({ connectionId, username, password, sessionId }) {
    return await MongoDBShell.connectToShell({ connectionId, username, password, sessionId });
  },

  async analyzeSchema({ connectionId, username, password, collection, sessionId }) {
    await MongoDB.analyzeSchema({ connectionId, username, password, collection, sessionId });
  },

  async mongodump({ args, sessionId }) {
    await MongoDBBackup.mongodump({ args, sessionId });
  },

  async mongorestore({ args, sessionId }) {
    await MongoDBBackup.mongorestore({ args, sessionId });
  },

  async mongoexport({ args, sessionId }) {
    await MongoDBBackup.mongoexport({ args, sessionId });
  },

  async mongoimport({ args, sessionId }) {
    await MongoDBBackup.mongoimport({ args, sessionId });
  },

  async removeDumpLogs({ sessionId, binary }) {
    await MongoDBBackup.removeDumpLogs({ sessionId, binary });
  },

  async getAllActions() {
    return await MongoDBUser.getAllActions();
  },

  getActionInfo({ action }) {
    return MongoDBUser.getActionInfo({ action });
  },

  getRoleInfo({ roleName }) {
    return MongoDBUser.getRoleInfo({ roleName });
  },

  getResourceInfo({ resource }) {
    return MongoDBUser.getResourceInfo({ resource });
  }
});
