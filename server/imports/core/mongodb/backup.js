import { Meteor } from "meteor/meteor";
import { Logger, Database, Error } from "/server/imports/modules";
import MongoDBHelper from "./helper";

const spawn = require("cross-spawn");

const Backup = function () {};

const executeBinary = async function (args, sessionId, binaryName) {
  const metadataToLog = { args, sessionId, binary: binaryName };

  try {
    const binaryPath = await MongoDBHelper.getProperBinary(binaryName);
    metadataToLog.binaryPath = binaryPath;
    Logger.info({ message: `${binaryName}`, metadataToLog });

    const spawned = spawn(binaryPath, args);
    spawned.stdout.on(
      "data",
      Meteor.bindEnvironment(async (data) => {
        if (data.toString()) {
          try {
            await Database.create({
              type: Database.types.Dumps,
              document: {
                date: Date.now(),
                sessionId,
                binary: binaryName,
                message: data.toString(),
              },
            });
          } catch (error) {
            Logger.error({
              message: "backup-log-error",
              metadataToLog: { sessionId, binaryName, error },
            });
          }
        }
      })
    );

    spawned.stderr.on(
      "data",
      Meteor.bindEnvironment(async (data) => {
        if (data.toString()) {
          try {
            await Database.create({
              type: Database.types.Dumps,
              document: {
                date: Date.now(),
                sessionId,
                binary: binaryName,
                message: data.toString(),
                error: true,
              },
            });
          } catch (error) {
            Logger.error({
              message: "backup-log-error",
              metadataToLog: { sessionId, binaryName, error },
            });
          }
        }
      })
    );

    spawned.on(
      "close",
      Meteor.bindEnvironment(async () => {
        try {
          await Database.create({
            type: Database.types.Dumps,
            document: {
              date: Date.now(),
              sessionId,
              binary: binaryName,
              message: "CLOSED",
            },
          });
        } catch (error) {
          Logger.error({
            message: "backup-log-error",
            metadataToLog: { sessionId, binaryName, error },
          });
        }
      })
    );

    spawned.stdin.end();
  } catch (exception) {
    Error.create({
      type: Error.types.BackupError,
      formatters: [binaryName],
      externalError: exception,
      metadataToLog,
    });
  }
};

Backup.prototype = {
  async mongodump({ args, sessionId }) {
    await executeBinary(args, sessionId, "mongodump");
  },

  async mongorestore({ args, sessionId }) {
    await executeBinary(args, sessionId, "mongorestore");
  },

  async mongoexport({ args, sessionId }) {
    await executeBinary(args, sessionId, "mongoexport");
  },

  async mongoimport({ args, sessionId }) {
    await executeBinary(args, sessionId, "mongoimport");
  },

  async removeDumpLogs({ sessionId, binary }) {
    Logger.info({
      message: "remove-dump-logs",
      metadataToLog: { sessionId, binary },
    });
    if (!binary)
      await Database.removeAsync({
        type: Database.types.Dumps,
        selector: { sessionId },
      });
    else
      await Database.removeAsync({
        type: Database.types.Dumps,
        selector: { sessionId, binary },
      });
  },
};

export default new Backup();
