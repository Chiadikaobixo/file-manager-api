require("dotenv").config()
import { File, Directory, FileVersion } from "@prisma/client"
import express, { Request } from "express"
import { graphqlHTTP } from "express-graphql"
import { createApplication, createModule, gql } from "graphql-modules"
import { downloadLocalFile, uploadLocalFile } from "./bucket"
import { directoryModule, findDirectories } from "./directory"
import { fileModule, findFiles } from "./file"
import { fileVersionModule } from "./fileVersion"
import { prismaClient } from "./prisma"

export interface Pagination {
  pageLength: number
  page: number
}

const mainModule = createModule({
  id: "main-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      interface FileNode {
        id: ID!
        name: String!
        createdAt: String!
        updateAt: String!
      }

      input PaginationInput {
        pageLength: Int!
        page: Int!
      }

      type Query {
        searchFile(query: String!): [FileNode]
      }
    `,
  ],
  resolvers: {
    FileNode: {
      __resolveType(obj: File | FileVersion | Directory) {
        if (Object.prototype.hasOwnProperty.call(obj, "parentId")) {
          return "Directory"
        }
        if (Object.prototype.hasOwnProperty.call(obj, "fileId")) {
          return "FileVersion"
        }
        if (Object.prototype.hasOwnProperty.call(obj, "directoryId")) {
          return "File"
        }
      },
    },
    Query: {
      searchFile: async (
        _: unknown,
        { query }: { query: string }
      ): Promise<Array<Directory | File>> => {
        const directories = await findDirectories(prismaClient(), query)
        const files = await findFiles(prismaClient(), query)
        return [...directories, ...files]
      },
    },
  },
})

const api = createApplication({
  modules: [mainModule, directoryModule, fileModule, fileVersionModule],
})

const app = express()

app.get("/file", function (req, res) {
  void downloadLocalFile(
    `${req.protocol}://${req.get("host") ?? ""}${req.originalUrl}`
  )
    .then((file) => {
      res.setHeader("Content-Type", file.ContentType)
      res.status(200).send(file.Body)
    })
    .catch((error) => {
      res.status(400).send(error)
    })
})

app.use(/\/((?!graphql).)*/, express.raw({ limit: "100000kb", type: "*/*" }))

app.put("/file", function (req: Request<unknown, unknown, Buffer>, res) {
  const { headers } = req
  const data = {
    ContentType: headers["content-type"] ?? "application/octet-stream",
    Body: req.body,
  }
  void uploadLocalFile(
    `${req.protocol}://${req.get("host") ?? ""}${req.originalUrl}`,
    data
  )
    .then(() => res.status(200).send(true))
    .catch(() => res.status(400).send({ error: "e chock" }))
})

const port = process.env.LOCAL_PORT ?? 4000
app.use(
  "/graphql",
  graphqlHTTP({
    schema: api.schema,
    customExecuteFn: api.createExecution(),
    graphiql: process.env.NODE_ENV === "development",
  })
)

app.listen(port, () => {
  console.log(`Server running on port ${port}.`)
})
