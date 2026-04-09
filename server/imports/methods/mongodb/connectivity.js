import { Meteor } from 'meteor/meteor';
import { MongoDB } from '/server/imports/core';

Meteor.methods({
  async listCollectionNames({ dbName, sessionId }) {
    const methodArray = [
      {
        listCollections: [],
        toArray: []
      }
    ];
    return await MongoDB.executeClientMethod({ dbName, methodArray, sessionId });
  },

  async getDatabases({ sessionId }) {
    const methodArray = [
      {
        listDatabases: []
      }
    ];
    const result = await MongoDB.executeAdmin({ methodArray, runOnAdminDB: true, sessionId });
    result.result = result.result ? result.result.databases : result.result;

    return result;
  },

  async disconnect({ sessionId }) {
    await MongoDB.disconnect({ sessionId });
  },

  async connect({ connectionId, username, password, sessionId }) {
    return await MongoDB.connect({ connectionId, username, password, sessionId });
  }
});
