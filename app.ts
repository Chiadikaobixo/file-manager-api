require("dotenv").config()
import { File, Directory, FileVersion } from "@prisma/client"
import express from "express"
import { graphqlHTTP } from "express-graphql"
import { createApplication, createModule, gql } from "graphql-modules"
import { directoryModule } from "./directory"
import { fileModule } from "./file"
import { fileVersionModule } from "./fileVersion"

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

      type Query {
        searchFile(query: String!): [FileNode]
      }
    `,
  ],
  resolvers: {
    FileNode: {
      __resolveType(obj: File | FileVersion | Directory ){
        if(Object.prototype.hasOwnProperty.call(obj, "parentId")){
          return "Directory"
        }
        if(Object.prototype.hasOwnProperty.call(obj, "fileId")){
          return "FileVersion"
        }
        if(Object.prototype.hasOwnProperty.call(obj, "directoryId")){
          return "File"
        }
      }
    },
    Query: {
      searchFile: () => { return []}
    }
  }
})

const api = createApplication({
  modules: [mainModule, directoryModule, fileModule, fileVersionModule]
})

const app = express()
const port = 3000
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
