import { Meteor } from 'meteor/meteor';
import { MongoDBGridFS } from '/server/imports/core';

Meteor.methods({
  async deleteFiles({ bucketName, selector, sessionId }) {
    return await MongoDBGridFS.deleteFiles({ bucketName, selector, sessionId });
  },

  async deleteFile({ bucketName, fileId, sessionId }) {
    return await MongoDBGridFS.deleteFile({ bucketName, fileId, sessionId });
  },

  async getFilesInfo({ bucketName, selector, limit, sessionId }) {
    return await MongoDBGridFS.getFilesInfo({ bucketName, selector, limit, sessionId });
  },

  async uploadFile({ bucketName, blob, fileName, contentType, metaData, aliases, sessionId }) {
    return await MongoDBGridFS.uploadFile({ bucketName, blob, fileName, contentType, metaData, aliases, sessionId });
  },

  async getFile({ bucketName, fileId, sessionId }) {
    return await MongoDBGridFS.getFile({ bucketName, fileId, sessionId });
  }
});
