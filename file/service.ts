import { File, FileVersion, Prisma, PrismaClient } from "@prisma/client"
import { uuid } from "uuidv4"
import { CreateFileVersionInput } from "../fileVersion/service"
import { getBucket } from "../bucket/bucket"

const fileInputFields = Prisma.validator<Prisma.FileArgs>()({
  select: { name: true, directoryId: true },
})

export type CreateFileInput = Prisma.FileGetPayload<typeof fileInputFields> &
  Omit<CreateFileVersionInput, "fileId" | "key"> & { key?: FileVersion["key"] }

export async function createFileRecord(
  client: PrismaClient,
  file: CreateFileInput
): Promise<{ file: File; url: string }> {
  const { name, directoryId, size, mimeType, key: keyInput } = file
  const key = keyInput ?? uuid()
  const data = {
    name,
    directoryId,
    fileVersions: {
      create: {
        name,
        key,
        mimeType,
        size,
      },
    },
  }
  const fileData = await client.file.create({
    data,
    include: { fileVersions: true },
  })
  const bucket = getBucket()
  const url = await bucket.getSignedUrl("put", key)
  return { file: fileData, url }
}

export async function getFile(
  client: PrismaClient,
  id: File["id"]
): Promise<File | null> {
  return await client.file.findUnique({
    where: { id },
    include: { fileVersions: true },
  })
}

export async function moveFile(
  client: PrismaClient,
  id: File["id"],
  directoryId: File["directoryId"]
): Promise<File> {
  return await client.file.update({
    where: { id },
    data: { directoryId },
    include: { fileVersions: true },
  })
}

export async function renameFile(
  client: PrismaClient,
  id: File["id"],
  name: File["name"]
): Promise<File> {
  return await client.file.update({
    where: { id },
    data: { name },
    include: { fileVersions: true },
  })
}

export async function deleteFile(
  client: PrismaClient,
  id: File["id"]
): Promise<boolean> {
  const allFileVersions = await client.file
    .findUnique({ where: { id } }).fileVersions()
  await client.$transaction([
    client.fileVersion.deleteMany({ where: { fileId: id } }),
    client.file.delete({ where: { id } }),
  ])
  for (const version of allFileVersions) {
    await getBucket().deleteObject(version.key)
  }
  return true
}
