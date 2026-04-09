import { Meteor } from 'meteor/meteor';
import { MongoDB } from '/server/imports/core';

Meteor.methods({
  async top({ sessionId }) {
    const methodArray = [
      {
        executeDbAdminCommand: [{ top: 1 }, {}],
      }
    ];

    return await MongoDB.executeAdmin({ methodArray, sessionId });
  },

  async dbStats({ sessionId }) {
    const methodArray = [
      {
        stats: [],
      }
    ];

    return await MongoDB.executeAdmin({ methodArray, sessionId });
  },

  async validateCollection({ collectionName, options, sessionId }) {
    const methodArray = [
      {
        validateCollection: [collectionName, options],
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB: true, sessionId });
  },

  async serverStatus({ sessionId }) {
    const methodArray = [
      {
        serverStatus: [],
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB: true, sessionId });
  },

  async serverInfo({ sessionId }) {
    const methodArray = [
      {
        serverInfo: [],
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB: true, sessionId });
  },

  async replSetGetStatus({ sessionId }) {
    const methodArray = [
      {
        replSetGetStatus: [],
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB: true, sessionId });
  },

  async removeUser({ username, runOnAdminDB, sessionId }) {
    const methodArray = [
      {
        removeUser: [username],
      },
    ];

    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB, sessionId });
  },

  async ping({ sessionId }) {
    const methodArray = [
      {
        ping: []
      }
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB: true, sessionId });
  },

  async listDatabases({ sessionId }) {
    const methodArray = [
      {
        listDatabases: []
      }
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB: true, sessionId });
  },

  async command({ command, runOnAdminDB, options, sessionId }) {
    const methodArray = [
      {
        command: [command, options],
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB, sessionId });
  },

  async addUser({ username, password, options, runOnAdminDB, sessionId }) {
    const methodArray = [
      {
        addUser: [username, password, options]
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB, sessionId });
  },

  async buildInfo({ sessionId }) {
    const methodArray = [
      {
        buildInfo: []
      },
    ];
    return await MongoDB.executeAdmin({ methodArray, runOnAdminDB: true, sessionId });
  },

  async dropDB({ sessionId }) {
    const methodArray = [
      {
        dropDatabase: []
      }
    ];
    return await MongoDB.executeAdmin({ methodArray, sessionId });
  },

  async dropAllCollections({ sessionId }) {
    return await MongoDB.dropAllCollections({ sessionId });
  },

  async createCollection({ collectionName, options, sessionId }) {
    const methodArray = [
      {
        createCollection: [collectionName, options]
      }
    ];
    return await MongoDB.executeAdmin({ methodArray, sessionId, removeCollectionTopology: true });
  }
});
