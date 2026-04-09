import { Meteor } from 'meteor/meteor';
import { Logger, Database, Error } from '/server/imports/modules';

const { EJSON } = require('bson');
const os = require('os');
const fs = require('fs');

const MongoDBHelper = function () {};

MongoDBHelper.prototype = {
  removeConnectionTopologyFromResult(obj) {
    if (obj.result && typeof obj.result === 'object' && 'connection' in obj.result) {
      delete obj.result.connection;
    }
  },

  removeCollectionTopologyFromResult(obj) {
    if (obj.result && typeof obj.result === 'object') {
      obj.result = {};
    }
  },

  clearConnectionOptionsForLog(connectionOptions) {
    const result = Object.assign({}, connectionOptions);
    delete result.sslCert;
    delete result.sslCA;
    delete result.sslKey;

    return result;
  },

  async keepDroppingCollections(collections) {
    for (let i = 0; i < collections.length; i += 1) {
      if (collections[i].collectionName.startsWith('system')) continue;
      await collections[i].drop();
    }
  },

  async proceedMapReduceExecution({ execution, map, reduce, options, metadataToLog }) {
    const deserializedOptions = EJSON.deserialize(options);
    let error = null;
    let result = null;

    try {
      const mapReduceResult = await execution.mapReduce(map, reduce, deserializedOptions);

      if (typeof deserializedOptions.out === 'string') {
        result = await mapReduceResult.find().toArray();
      } else {
        result = mapReduceResult;
      }
    } catch (exception) {
      error = Error.createWithoutThrow({ type: Error.types.QueryError, metadataToLog, externalError: exception });
    }

    const serialized = EJSON.serialize({ result, error });
    serialized.err = serialized.error;
    return serialized;
  },

  async proceedExecutingQuery({ methodArray, execution, removeCollectionTopology, metadataToLog }) {
    const start = new Date();
    let currentExecution = execution;
    let error = null;

    try {
      for (let i = 0; i < methodArray.length; i += 1) {
        const entry = EJSON.deserialize(methodArray[i]);
        const keys = Object.keys(entry);
        for (let j = 0; j < keys.length; j += 1) {
          const key = keys[j];
          const args = entry[key] || [];
          const response = currentExecution[key](...args);
          currentExecution = response instanceof Promise ? await response : response;
        }
      }
    } catch (exception) {
      currentExecution = null;
      error = Error.createWithoutThrow({ type: Error.types.QueryError, metadataToLog, externalError: exception });
    }

    const serialized = EJSON.serialize({ result: currentExecution, error });
    if (removeCollectionTopology) this.removeCollectionTopologyFromResult(serialized);
    this.removeConnectionTopologyFromResult(serialized);
    serialized.executionTime = new Date() - start;
    serialized.err = serialized.error;

    return serialized;
  },

  async getProperBinary(binaryName) {
    const settings = (await Database.readOne({ type: Database.types.Settings, query: {} })) || {};
    const errorMessage = `binary-${binaryName}-not-found`;
    if (settings.mongoBinaryPath) {
      const dir = `${settings.mongoBinaryPath.replace(/\\/g, '/')}/`;
      Logger.info({ message: `${binaryName}`, metadataToLog: { dir: `${dir}`, binary: `${binaryName}` } });

      switch (os.platform()) {
        case 'win32':
          if (!fs.existsSync(`${dir + binaryName}.exe`)) throw new Meteor.Error(errorMessage);
          return `${dir + binaryName}.exe`;
        default:
          if (!fs.existsSync(dir + binaryName)) throw new Meteor.Error(errorMessage);
          return dir + binaryName;
      }
    } else if (!settings.mongoBinaryPath && binaryName === 'mongo') {
      const dir = this.getMongoExternalsPath();
      switch (os.platform()) {
        case 'darwin':
          return `${dir}darwin/mongo`;
        case 'win32':
          return `${dir}win32/mongo.exe`;
        case 'linux':
          return `${dir}linux/mongo`;
        default:
          throw new Meteor.Error('not-supported-os');
      }
    } else throw new Meteor.Error(errorMessage);
  },

  getMongoExternalsPath() {
    let currentDir = process.cwd().replace(/\\/g, '/');
    currentDir = `${currentDir.substring(0, currentDir.lastIndexOf('/'))}/web.browser/app/mongo/`;

    // make sure everything has correct permissions
    fs.chmodSync(currentDir, '777');
    fs.chmodSync(`${currentDir}darwin/mongo`, '777');
    fs.chmodSync(`${currentDir}win32/mongo.exe`, '777');
    fs.chmodSync(`${currentDir}linux/mongo`, '777');
    fs.chmodSync(`${currentDir}variety/variety.js_`, '777');

    return currentDir;
  }

};

export default new MongoDBHelper();
