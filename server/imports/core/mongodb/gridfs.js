import { Logger, Error } from '/server/imports/modules';
import MongoDB from './index';

const mongodbApi = require('mongodb');
const { EJSON } = require('bson');

const MongoDBGridFS = function () {};

const buildSerializedResult = ({ result = null, error = null }) => {
  const serialized = EJSON.serialize({ result, error });
  serialized.err = serialized.error;
  return serialized;
};

const tryDownloadingFile = async function (sessionId, bucketName, fileId, res, metadataToLog) {
  try {
    const filesCollection = MongoDB.dbObjectsBySessionId[sessionId].db.collection(`${bucketName}.files`);
    const doc = await filesCollection.find({ _id: new mongodbApi.ObjectId(fileId) }).limit(1).next();

    if (doc) {
      const bucket = new mongodbApi.GridFSBucket(MongoDB.dbObjectsBySessionId[sessionId].db, { bucketName });
      const headers = {
        'Content-type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${encodeURIComponent(doc.filename)}`,
      };
      const downloadStream = bucket.openDownloadStream(new mongodbApi.ObjectID(fileId));
      res.writeHead(200, headers);

      downloadStream.on('error', (err) => {
        Logger.error({ message: 'download-file-stream', metadataToLog: Object.assign({ err }, metadataToLog) });
        if (!res.headersSent) res.writeHead(500);
        res.end('Unexpected error while downloading file');
      });

      downloadStream.pipe(res);
    } else {
      res.writeHead(400);
      res.end('File not found !');
    }
  } catch (exception) {
    Logger.error({ message: 'download-file', metadataToLog: Object.assign({ exception }, metadataToLog) });
    res.writeHead(500);
    res.end(`Unexpected error: ${exception.message}`);
  }
};

MongoDBGridFS.prototype = {
  async deleteFiles({ bucketName, selector, sessionId }) {
    const metadataToLog = { bucketName, selector, sessionId };
    Logger.info({ message: 'delete-files', metadataToLog });

    try {
      const parsedSelector = EJSON.deserialize(selector);
      const filesCollection = MongoDB.dbObjectsBySessionId[sessionId].db.collection(`${bucketName}.files`);
      const chunksCollection = MongoDB.dbObjectsBySessionId[sessionId].db.collection(`${bucketName}.chunks`);

      const docs = await filesCollection.find(parsedSelector, { projection: { _id: 1 } }).toArray();
      const ids = docs.map((doc) => doc._id);

      metadataToLog.ids = ids;

      Logger.info({ message: 'delete-from-files-collection', metadataToLog });
      await filesCollection.deleteMany({ _id: { $in: ids } }, {});

      Logger.info({ message: 'delete-from-chunks-collection', metadataToLog });
      await chunksCollection.deleteMany({ files_id: { $in: ids } });

      return buildSerializedResult({ result: null });
    } catch (exception) {
      const error = Error.createWithoutThrow({
        type: Error.types.GridFSError,
        formatters: ['delete-files'],
        metadataToLog,
        externalError: exception,
      });
      return buildSerializedResult({ error });
    }
  },

  async deleteFile({ bucketName, fileId, sessionId }) {
    const metadataToLog = { bucketName, fileId, sessionId };
    Logger.info({ message: 'delete-file', metadataToLog });

    try {
      const bucket = new mongodbApi.GridFSBucket(MongoDB.dbObjectsBySessionId[sessionId].db, { bucketName });
      await bucket.delete(new mongodbApi.ObjectId(fileId));
      return buildSerializedResult({ result: null });
    } catch (exception) {
      const error = Error.createWithoutThrow({
        type: Error.types.GridFSError,
        formatters: ['delete-file'],
        metadataToLog,
        externalError: exception,
      });
      return buildSerializedResult({ error });
    }
  },

  async getFilesInfo({ bucketName, selector, limit, sessionId }) {
    limit = parseInt(limit, 10) || 100;
    selector = selector || {};

    const metadataToLog = { bucketName, selector, limit, sessionId };

    Logger.info({ message: 'get-files-info', metadataToLog });

    try {
      const parsedSelector = EJSON.deserialize(selector);
      const bucket = new mongodbApi.GridFSBucket(MongoDB.dbObjectsBySessionId[sessionId].db, { bucketName });
      const files = await bucket.find(parsedSelector, { limit }).toArray();
      return buildSerializedResult({ result: files });
    } catch (exception) {
      const error = Error.createWithoutThrow({
        type: Error.types.GridFSError,
        formatters: ['get-files-info'],
        metadataToLog,
        externalError: exception,
      });
      return buildSerializedResult({ error });
    }
  },

  async uploadFile({ bucketName, blob, fileName, contentType, metaData, aliases, sessionId }) {
    const metadataToLog = { bucketName, fileName, contentType, metaData, aliases, sessionId, blobLength: blob.length };

    if (metaData) metaData = EJSON.deserialize(metaData);

    const buffer = Buffer.from(blob);

    Logger.info({ message: 'upload-file', metadataToLog });

    try {
      const bucket = new mongodbApi.GridFSBucket(MongoDB.dbObjectsBySessionId[sessionId].db, { bucketName });
      await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(fileName, {
          metadata: metaData,
          contentType,
          aliases,
        });
        uploadStream.on('error', reject);
        uploadStream.on('finish', resolve);
        uploadStream.end(buffer);
      });

      return buildSerializedResult({ result: null });
    } catch (exception) {
      const error = Error.createWithoutThrow({
        type: Error.types.GridFSError,
        formatters: ['upload-file'],
        metadataToLog,
        externalError: exception,
      });
      return buildSerializedResult({ error });
    }
  },

  async getFile({ bucketName, fileId, sessionId }) {
    const metadataToLog = { bucketName, fileId, sessionId };
    Logger.info({ message: 'get-file', metadataToLog });

    try {
      const filesCollection = MongoDB.dbObjectsBySessionId[sessionId].db.collection(`${bucketName}.files`);
      const doc = await filesCollection.find({ _id: new mongodbApi.ObjectId(fileId) }).limit(1).next();
      if (!doc) {
        return buildSerializedResult({
          error: Error.createWithoutThrow({
            type: Error.types.GridFSError,
            externalError: 'no-file-found',
            metadataToLog,
          }),
        });
      }
      return buildSerializedResult({ result: doc });
    } catch (exception) {
      const error = Error.createWithoutThrow({
        type: Error.types.GridFSError,
        formatters: ['get-file'],
        metadataToLog,
        externalError: exception,
      });
      return buildSerializedResult({ error });
    }
  },

  async download({ req, res }) {
    const urlParts = decodeURI(req.url).split('&');
    const fileId = urlParts[0].substr(urlParts[0].indexOf('=') + 1);
    const bucketName = urlParts[1].substr(urlParts[1].indexOf('=') + 1);
    const sessionId = urlParts[2].substr(urlParts[2].indexOf('=') + 1);
    const metadataToLog = { fileId, bucketName, sessionId };

    Logger.info({ message: 'download-file', metadataToLog });

    res.charset = 'UTF-8';
    if (!bucketName || !fileId) {
      res.writeHead(400);
      res.end('File not found !');
      return;
    }

    await tryDownloadingFile(sessionId, bucketName, fileId, res, metadataToLog);
  }
};

export default new MongoDBGridFS();
