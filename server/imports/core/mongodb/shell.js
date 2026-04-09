import { Meteor } from "meteor/meteor";
import Database from "/server/imports/modules/database";
import Logger from "/server/imports/modules/logger";
import Error from "/server/imports/modules/error_handler";
import Connection from "/server/imports/core/connection/index";
import MongoDBHelper from "./helper";

const spawn = require("cross-spawn");

const MongoDBShell = function () {
  this.spawnedShellsBySessionId = {};
};

const setEventsToShell = function (connectionId, sessionId) {
  Logger.info({
    message: "shell-event-bind",
    metadataToLog: { connectionId, sessionId },
  });

  this.spawnedShellsBySessionId[sessionId].on(
    "error",
    Meteor.bindEnvironment(async (error) => {
      Logger.error({
        message: "shell-event-bind",
        metadataToLog: { error, sessionId },
      });
      this.spawnedShellsBySessionId[sessionId] = null;
      if (error) {
        try {
          await Database.create({
            type: Database.types.ShellCommands,
            document: {
              date: Date.now(),
              sessionId,
              connectionId,
              message: `unexpected error ${error.message}`,
            },
          });
        } catch (dbError) {
          Logger.error({
            message: "shell-event-logging-error",
            metadataToLog: { sessionId, dbError },
          });
        }
      }
    })
  );

  this.spawnedShellsBySessionId[sessionId].stdout.on(
    "data",
    Meteor.bindEnvironment(async (data) => {
      if (data && data.toString()) {
        try {
          await Database.create({
            type: Database.types.ShellCommands,
            document: {
              date: Date.now(),
              sessionId,
              connectionId,
              message: data.toString(),
            },
          });
        } catch (dbError) {
          Logger.error({
            message: "shell-event-logging-error",
            metadataToLog: { sessionId, dbError },
          });
        }
      }
    })
  );

  this.spawnedShellsBySessionId[sessionId].stderr.on(
    "data",
    Meteor.bindEnvironment(async (data) => {
      if (data && data.toString()) {
        try {
          await Database.create({
            type: Database.types.ShellCommands,
            document: {
              date: Date.now(),
              sessionId,
              connectionId,
              message: data.toString(),
            },
          });
        } catch (dbError) {
          Logger.error({
            message: "shell-event-logging-error",
            metadataToLog: { sessionId, dbError },
          });
        }
      }
    })
  );

  this.spawnedShellsBySessionId[sessionId].on(
    "close",
    Meteor.bindEnvironment(async (code) => {
      // show ended message in codemirror
      try {
        await Database.create({
          type: Database.types.ShellCommands,
          document: {
            date: Date.now(),
            connectionId,
            sessionId,
            message: `shell closed ${code.toString()}`,
          },
        });
      } catch (dbError) {
        Logger.error({
          message: "shell-event-logging-error",
          metadataToLog: { sessionId, dbError },
        });
      }

      this.spawnedShellsBySessionId[sessionId] = null;
      Meteor.setTimeout(async () => {
        // remove all for further
        await Database.removeAsync({
          type: Database.types.ShellCommands,
          selector: { sessionId },
        });
      }, 500);
    })
  );
};

MongoDBShell.prototype = {
  async connectToShell({ connectionId, username, password, sessionId }) {
    const connection = await Database.readOne({
      type: Database.types.Connections,
      query: { _id: connectionId },
    });

    try {
      if (!this.spawnedShellsBySessionId[sessionId]) {
        const connectionUrl = await Connection.getConnectionUrl(
          connection,
          username,
          password,
          true
        );
        const mongoPath = await MongoDBHelper.getProperBinary("mongo");
        Logger.debug({
          message: "shell",
          metadataToLog: { mongoPath, connectionUrl, sessionId },
        });
        this.spawnedShellsBySessionId[sessionId] = spawn(mongoPath, [
          connectionUrl,
        ]);
        setEventsToShell.call(this, connectionId, sessionId);
      }
    } catch (ex) {
      this.spawnedShellsBySessionId[sessionId] = null;
      Error.create({
        type: Error.types.ShellError,
        externalError: ex,
        metadataToLog: { connectionId, username, sessionId },
      });
    }

    if (this.spawnedShellsBySessionId[sessionId]) {
      Logger.info({
        message: "shell",
        metadataToLog: { command: `use ${connection.databaseName}`, sessionId },
      });
      this.spawnedShellsBySessionId[sessionId].stdin.write(
        `use ${connection.databaseName}\n`
      );
      return `use ${connection.databaseName}`;
    }

    Error.create({ type: Error.types.ShellError, message: "spawn-failed" });
  },

  async clearShell({ sessionId }) {
    Logger.info({ message: "clear-shell", metadataToLog: sessionId });
    await Database.removeAsync({
      type: Database.types.ShellCommands,
      selector: { sessionId },
    });
  },

  async executeShellCommand({
    command,
    connectionId,
    username,
    password,
    sessionId,
  }) {
    Logger.info({
      message: "shell-command-execution",
      metadataToLog: { sessionId, command, connectionId },
    });
    if (!this.spawnedShellsBySessionId[sessionId])
      await this.connectToShell({ connectionId, username, password, sessionId });
    if (this.spawnedShellsBySessionId[sessionId])
      this.spawnedShellsBySessionId[sessionId].stdin.write(`${command}\n`);
  },
};

export default new MongoDBShell();
