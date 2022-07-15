import { File, Prisma, PrismaClient } from "@prisma/client"
import { uuid } from "uuidv4"
import { getBucket } from '../bucket/bucket'

const fileInputFields = Prisma.validator<Prisma.FileArgs>()({
  select: { name: true, directoryId: true },
})

export type CreateFileInput = Prisma.FileGetPayload<typeof fileInputFields> & {
  key?: string
  mimeType: string
  size: number
}

export async function createFileRecord( client: PrismaClient, file: CreateFileInput):
Promise<{ file: File; url: string }> {
  const { name, directoryId, size, mimeType, key: keyInput } = file
  const key = keyInput ?? (uuid())
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
  const fileData = await client.file.create({data, include: {fileVersions: true}})
  const bucket = getBucket()
    const url = await bucket.getSignedUrl('put', key)
    return {file: fileData, url}
}