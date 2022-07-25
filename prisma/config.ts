import { PrismaClient } from "@prisma/client"

export function prismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  })

  prisma.$use(async (params, next) => {
    const types = ["File", "FileVersion", "Directory"]
    if (types.includes(params.model ?? "")) {
      if (params.action === "delete") {
        params.action = "update"
        if (params.args.data !== undefined) {
          params.args.data["deletedAt"] = new Date()
        } else {
          params.args["data"] = { deletedAt: new Date() }
        }
      }
      if (params.action === "deleteMany") {
        params.action = "updateMany"
        if (params.args.data !== undefined) {
          params.args.data["deletedAt"] = new Date()
        } else {
          params.args["data"] = { deletedAt: new Date() }
        }
      }
    }
    return next(params)
  })

  return prisma
}
