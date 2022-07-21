import { Directory, PrismaClient } from "@prisma/client"
import { deleteFile } from "../file/service"

export async function createDirectory(
  client: PrismaClient,
  name: Directory["name"],
  parentId: Directory["parentId"]
): Promise<Directory> {
  if (name === "root") {
    throw new Error("Directory name 'root' is already reserved")
  }
  const directory = await client.directory.create({
    data: {
      name,
      parentId,
    },
  })
  return directory
}

export async function getDirectory(
  client: PrismaClient,
  id: Directory["id"]
): Promise<Directory | null> {
  return client.directory.findUnique({
    where: { id },
    include: { directories: true, files: true },
  })
}

export async function renameDirectory(
  client: PrismaClient,
  id: Directory["id"],
  name: Directory["name"]
): Promise<Directory> {
  if (name.toLowerCase() === "root") {
    throw new Error("Directory name is reserved")
  }
  const directory = await client.directory.findUnique({
    where: { id },
  })
  if (directory?.name === "root") {
    throw new Error("Root Directory cannot be changed")
  }
  return await client.directory.update({
    where: { id },
    data: { name },
    include: { directories: true, files: true },
  })
}

export async function deleteDirectory(
  client: PrismaClient,
  id: Directory["id"]
): Promise<boolean> {
  const files = await client.file.findMany({ where: { directoryId: id } })
  for (const file of files) {
    await deleteFile(client, file.id)
  }
  await client.directory.delete({ where: { id } })
  return true
}

export async function findDirectories(
  client: PrismaClient,
  query: string
): Promise<Directory[]> {
  return await client.directory.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    orderBy: [{ name: "asc" }],
  })
}
