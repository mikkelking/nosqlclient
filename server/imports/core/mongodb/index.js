import { Meteor } from "meteor/meteor"
import Logger from "/server/imports/modules/logger/index"
import Database from "/server/imports/modules/database/index"
import Error from "/server/imports/modules/error_handler/index"
import Connection from "/server/imports/core/connection/index"
import MongoDBHelper from "./helper"
import MongoDBShell from "./shell"
import { MongoClient } from "mongodb"

const tunnelSsh = require("tunnel-ssh")
const spawn = require("cross-spawn")

const MongoDB = function () {
  this.dbObjectsBySessionId = {}
  this.tunnelsBySessionId = {}
}

const buildResult = ({ result = null, error = null }) => {
  const payload = { result, error }
  payload.err = error
  return payload
}

const proceedConnectingMongodb = async function (
  dbName,
  sessionId,
  connectionUrl,
  connectionOptions = {}
) {
  const metadataToLog = {
    sessionId,
    connectionOptions: MongoDBHelper.clearConnectionOptionsForLog(
      connectionOptions
    ),
  }
  const client = new MongoClient(connectionUrl, connectionOptions)
  try {
    await client.connect()
    Logger.debug({ message: "mongo-connected", metadataToLog })

    this.dbObjectsBySessionId[sessionId] = {
      db: client.db(dbName),
      client,
    }
    const collections = await this.dbObjectsBySessionId[sessionId].db
      .listCollections()
      .toArray()

    Logger.info({
      message: "connect",
      metadataToLog: {
        sessionLength: `${Object.keys(this.dbObjectsBySessionId).length}`,
      },
    })
    return buildResult({ result: collections })
  } catch (exception) {
    const error = Error.createWithoutThrow({
      type: Error.types.ConnectionError,
      metadataToLog,
      externalError: exception,
    })

    try {
      await client.close()
    } catch (closeError) {
      Logger.error({
        message: "mongo-client-close-error",
        metadataToLog: { sessionId, closeError },
      })
    }
    if (this.tunnelsBySessionId[sessionId]) {
      this.tunnelsBySessionId[sessionId].close()
      this.tunnelsBySessionId[sessionId] = null
    }

    return buildResult({ error })
  }
}

const connectThroughTunnel = function ({
  connection,
  sessionId,
  connectionUrl,
  connectionOptions,
  username,
  password,
}) {
  const config = {
    dstPort: connection.ssh.destinationPort,
    localPort: connection.ssh.localPort
      ? connection.ssh.localPort
      : connection.servers[0].port,
    host: connection.ssh.host,
    port: connection.ssh.port,
    readyTimeout: 99999,
    username: connection.ssh.username,
  }

  if (connection.ssh.certificateFile)
    config.privateKey = Buffer.from(connection.ssh.certificateFile)
  if (connection.ssh.passPhrase) config.passphrase = connection.ssh.passPhrase
  if (connection.ssh.password) config.password = connection.ssh.password

  if (this.tunnelsBySessionId[sessionId])
    this.tunnelsBySessionId[sessionId].close()

  Logger.info({ message: "connect-ssh", metadataToLog: { sessionId, config } })
  return new Promise((resolve) => {
    let settled = false
    const metadataToLog = {
      sessionId,
      connectionOptions: MongoDBHelper.clearConnectionOptionsForLog(
        connectionOptions
      ),
      username,
    }
    const settle = (payload, closeTunnelOnError = false) => {
      if (settled) return
      settled = true
      if (closeTunnelOnError && this.tunnelsBySessionId[sessionId]) {
        this.tunnelsBySessionId[sessionId].close()
        this.tunnelsBySessionId[sessionId] = null
      }
      resolve(payload)
    }

    this.tunnelsBySessionId[sessionId] = tunnelSsh(
      config,
      Meteor.bindEnvironment(async (error) => {
        if (error) {
          const err = Error.createWithoutThrow({
            type: Error.types.ConnectionError,
            metadataToLog,
            externalError: error,
          })
          settle(buildResult({ error: err }), true)
          return
        }

        try {
          const result = await proceedConnectingMongodb.call(
            this,
            connection.databaseName,
            sessionId,
            connectionUrl,
            connectionOptions
          )
          if (result.error) {
            settle(result, true)
            return
          }

          await MongoDBShell.connectToShell({
            connectionId: connection._id,
            username,
            password,
            sessionId,
          })
          settle(result)
        } catch (exception) {
          const err = Error.createWithoutThrow({
            type: Error.types.ConnectionError,
            metadataToLog,
            externalError: exception,
          })
          settle(buildResult({ error: err }), true)
        }
      })
    )

    this.tunnelsBySessionId[sessionId].on("error", (err) => {
      const error = Error.createWithoutThrow({
        type: Error.types.ConnectionError,
        metadataToLog,
        externalError: err,
      })
      settle(buildResult({ error }), true)
    })
  })
}

const checkConnectionIsAlive = async function (sessionId, metadataToLog) {
  if (!this.dbObjectsBySessionId[sessionId]) {
    await this.disconnect({ sessionId })
    Error.create({
      type: Error.types.ConnectionError,
      externalError: "connection-closed",
      metadataToLog,
    })
  }
}

MongoDB.prototype = {
  async executeClientMethod({ dbName, methodArray, sessionId }) {
    const metadataToLog = { methodArray, dbName, sessionId }
    Logger.info({ message: "client-query-execution", metadataToLog })

    await checkConnectionIsAlive.call(this, sessionId, metadataToLog)

    const execution = this.dbObjectsBySessionId[sessionId].client.db(dbName)
    return await MongoDBHelper.proceedExecutingQuery({
      methodArray,
      execution,
      metadataToLog,
    })
  },

  async execute({
    selectedCollection,
    methodArray,
    sessionId,
    removeCollectionTopology,
  }) {
    const metadataToLog = { methodArray, selectedCollection, sessionId }
    Logger.info({ message: "collection-query-execution", metadataToLog })

    await checkConnectionIsAlive.call(this, sessionId, metadataToLog)

    const execution =
      this.dbObjectsBySessionId[sessionId].db.collection(selectedCollection)
    return await MongoDBHelper.proceedExecutingQuery({
      methodArray,
      execution,
      removeCollectionTopology,
      metadataToLog,
    })
  },

  async executeAdmin({
    methodArray,
    runOnAdminDB,
    sessionId,
    removeCollectionTopology,
  }) {
    const metadataToLog = { methodArray, runOnAdminDB, sessionId }
    Logger.info({ message: "admin-query-execution", metadataToLog })

    await checkConnectionIsAlive.call(this, sessionId, metadataToLog)

    const execution = runOnAdminDB
      ? this.dbObjectsBySessionId[sessionId].db.admin()
      : this.dbObjectsBySessionId[sessionId].db
    return await MongoDBHelper.proceedExecutingQuery({
      methodArray,
      execution,
      removeCollectionTopology,
      metadataToLog,
    })
  },

  async executeMapReduce({
    selectedCollection,
    map,
    reduce,
    options,
    sessionId,
  }) {
    const metadataToLog = {
      selectedCollection,
      map,
      reduce,
      options,
      sessionId,
    }
    Logger.info({ message: "mapreduce-query-execution", metadataToLog })

    await checkConnectionIsAlive.call(this, sessionId, metadataToLog)

    const execution =
      this.dbObjectsBySessionId[sessionId].db.collection(selectedCollection)
    return await MongoDBHelper.proceedMapReduceExecution({
      execution,
      map,
      reduce,
      options,
      metadataToLog,
    })
  },

  async connect({ connectionId, username, password, sessionId }) {
    const connection = await Database.readOne({
      type: Database.types.Connections,
      query: { _id: connectionId },
    })
    const connectionUrl = await Connection.getConnectionUrl(
      connection,
      username,
      password
    )
    const connectionOptions = Connection.getConnectionOptions(connection)
    const metadataToLog = {
      connectionUrl,
      options: MongoDBHelper.clearConnectionOptionsForLog(connectionOptions),
      sessionId,
    }

    Logger.debug({ message: "connect", metadataToLog })

    try {
      if (connection.ssh && connection.ssh.enabled) {
        return await connectThroughTunnel.call(this, {
          connection,
          sessionId,
          connectionUrl,
          connectionOptions,
          username,
          password,
        })
      }

      return await proceedConnectingMongodb.call(
        this,
        connection.databaseName,
        sessionId,
        connectionUrl,
        connectionOptions
      )
    } catch (exception) {
      return buildResult({
        error: Error.createWithoutThrow({
          type: Error.types.ConnectionError,
          metadataToLog,
          externalError: exception,
        }),
      })
    }
  },

  async disconnect({ sessionId }) {
    Logger.info({ message: "disconnect", metadataToLog: sessionId })

    const dbObject = this.dbObjectsBySessionId[sessionId]
    if (dbObject && dbObject.client) {
      try {
        await dbObject.client.close()
      } catch (error) {
        Logger.error({
          message: "disconnect-error",
          metadataToLog: { sessionId, error },
        })
      } finally {
        delete this.dbObjectsBySessionId[sessionId]
      }
    }

    if (this.tunnelsBySessionId[sessionId]) {
      this.tunnelsBySessionId[sessionId].close()
      delete this.tunnelsBySessionId[sessionId]
    }

    if (MongoDBShell.spawnedShellsBySessionId[sessionId]) {
      MongoDBShell.spawnedShellsBySessionId[sessionId].stdin.end()
      MongoDBShell.spawnedShellsBySessionId[sessionId] = null
    }

    await Database.removeAsync({
      type: Database.types.ShellCommands,
      selector: {},
    })
    await Database.removeAsync({
      type: Database.types.SchemaAnalyzeResult,
      selector: {},
    })
    await Database.removeAsync({ type: Database.types.Dumps, selector: {} })
  },

  async dropAllCollections({ sessionId }) {
    Logger.info({
      message: "drop-all-collections",
      metadataToLog: { sessionId },
    })

    await checkConnectionIsAlive.call(this, sessionId, { sessionId })

    try {
      const collections = await this.dbObjectsBySessionId[sessionId].db.collections()
      await MongoDBHelper.keepDroppingCollections(collections)
      return buildResult({ result: {} })
    } catch (exception) {
      return buildResult({
        error: Error.createWithoutThrow({
          type: Error.types.QueryError,
          message: "drop-all-collections-error",
          metadataToLog: { sessionId },
          externalError: exception,
        }),
      })
    }
  },

  async analyzeSchema({ connectionId, username, password, collection, sessionId }) {
    const connection = await Database.readOne({
      type: Database.types.Connections,
      query: { _id: connectionId },
    })
    const connectionUrl = await Connection.getConnectionUrl(
      connection,
      username,
      password,
      true,
      true
    )
    const args = [
      connectionUrl,
      "--quiet",
      "--eval",
      `var collection =\"${collection}\", outputFormat=\"json\"`,
      `${MongoDBHelper.getMongoExternalsPath()}/variety/variety.js_`,
    ]
    const metadataToLog = { sessionId, args, collection }

    Logger.debug({ message: "analyze-schema", metadataToLog })
    try {
      const mongoPath = await MongoDBHelper.getProperBinary("mongo")
      const spawned = spawn(mongoPath, args)
      let message = ""
      spawned.stdout.on(
        "data",
        Meteor.bindEnvironment(async (data) => {
          if (data.toString()) {
            message += data.toString()
          }
        })
      )

      spawned.stderr.on(
        "data",
        Meteor.bindEnvironment(async (data) => {
          if (data.toString()) {
            try {
              await Database.create({
                type: Database.types.SchemaAnalyzeResult,
                document: {
                  date: Date.now(),
                  sessionId,
                  connectionId,
                  message: data.toString(),
                },
              })
            } catch (error) {
              Logger.error({
                message: "analyze-schema-log-error",
                metadataToLog: { sessionId, connectionId, error },
              })
            }
          }
        })
      )

      spawned.on(
        "close",
        Meteor.bindEnvironment(async () => {
          try {
            await Database.create({
              type: Database.types.SchemaAnalyzeResult,
              document: {
                date: Date.now(),
                sessionId,
                connectionId,
                message,
              },
            })
          } catch (error) {
            Logger.error({
              message: "analyze-schema-log-error",
              metadataToLog: { sessionId, connectionId, error },
            })
          }
        })
      )

      spawned.stdin.end()
    } catch (exception) {
      Error.create({
        type: Error.types.SchemaAnalyzeError,
        externalError: exception,
        metadataToLog,
      })
    }
  },
}

export default new MongoDB()
