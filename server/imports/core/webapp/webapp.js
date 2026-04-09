import { WebApp } from "meteor/webapp"
import Papa from "papaparse"
import { Logger } from "/server/imports/modules"
import { MongoDBGridFS, MongoDB, Settings } from "../index"

const dot = require("dot-object")

WebApp.connectHandlers.use("/exportMongoclient", async (req, res) => {
  try {
    await Settings.exportSettings({ res })
  } catch (error) {
    Logger.error({ message: "export-mongoclient-error", metadataToLog: { error } })
    res.writeHead(500)
    res.end("Failed to export Mongoclient data")
  }
})

WebApp.connectHandlers.use("/export", async (req, res) => {
  try {
    const urlParts = decodeURI(req.url).split("&")
    const format = urlParts[0].substr(urlParts[0].indexOf("=") + 1)
    const selectedCollection = urlParts[1].substr(urlParts[1].indexOf("=") + 1)
    const selector = JSON.parse(urlParts[2].substr(urlParts[2].indexOf("=") + 1))
    const cursorOptions = JSON.parse(
      urlParts[3].substr(urlParts[3].indexOf("=") + 1)
    )
    const sessionId = urlParts[4].substr(urlParts[4].indexOf("=") + 1)

    const methodArray = [
      {
        find: [selector],
      },
    ]
    Object.keys(cursorOptions).forEach((key) => {
      if (cursorOptions[key]) {
        const obj = {}
        obj[key] = [cursorOptions[key]]
        methodArray.push(obj)
      }
    })

    methodArray.push({ toArray: [] })

    const result = await MongoDB.execute({
      selectedCollection,
      methodArray,
      sessionId,
    })
    const resultError = result.err || (result.result && result.result.error)
    if (resultError) {
      Logger.error({
        message: "export-find-result",
        metadataToLog: { error: resultError },
      })
      res.writeHead(400)
      res.end(
        `Query error: ${JSON.stringify(result.err)} ${JSON.stringify(
          result.result ? result.result.error : ""
        )}`
      )
    } else {
      const headers = {
        "Content-type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=export_result.${format}`,
      }
      if (format === "JSON") {
        res.writeHead(200, headers)
        res.end(JSON.stringify(result.result))
      } else if (format === "CSV") {
        res.writeHead(200, headers)
        const exportValue = []
        result.result.forEach((item) => {
          exportValue.push(dot.dot(item))
        })
        res.end(Papa.unparse(exportValue, { delimiter: ";", newLine: "\n" }))
      } else {
        res.writeHead(400)
        res.end(`Unsupported format: ${format}`)
      }
    }
  } catch (error) {
    Logger.error({ message: "export-handler-error", metadataToLog: { error } })
    res.writeHead(500)
    res.end("Unexpected export error")
  }
})

WebApp.connectHandlers.use("/healthcheck", (req, res) => {
  res.writeHead(200)
  res.end("Server is up and running !")
})

WebApp.connectHandlers.use("/download", async (req, res) => {
  await MongoDBGridFS.download({ req, res })
})
