import { Meteor } from 'meteor/meteor';
import { Settings, Connection } from '/server/imports/core';

Meteor.methods({
  async handleSubscriber({ email }) {
    await Settings.subscribe(email);
  },

  checkMongoclientVersion() {
    return Settings.checkMongoclientVersion();
  },

  async updateSettings({ settings }) {
    await Settings.updateSettings(settings);
  },

  async importMongoclient({ file }) {
    await Settings.importSettings(file);
    await Connection.importConnections(file);
  },

  async saveQueryHistory({ history }) {
    await Settings.saveQueryHistory(history);
  },

  async removeSchemaAnalyzeResult({ sessionId }) {
    await Settings.removeSchemaAnalyzeResult({ sessionId });
  }
});
