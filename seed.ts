import { PrismaClient } from "@prisma/client"
import { promises as fs } from "fs"
import { join } from "path"
import { saveFile } from "./bucket/localBucket"
import { createDirectory } from "./directory/service"
import { createFileRecord } from "./file/service"
import { generateFileName } from "./utils/generators"
import { v4 as uuidv4 } from "uuid"
import { getMimeTypeFromExtension } from "./utils/parsers"

export async function seed(): Promise<void> {
  const seedFilesPath = `${__dirname}/../seedfile`
  const client = new PrismaClient()
  try {
    const existingRootDirectory = await client.directory.findFirst({
      where: { name: "root" },
    })
    const rootDirectory =
      existingRootDirectory ??
      (await client.directory.create({
        data: { name: "root" },
      }))

    const subDir1 = await createDirectory(
      client,
      "sub-Directory 1",
      rootDirectory.id
    )

    const subDir2 = await createDirectory(
      client,
      "sub-Directory 2",
      rootDirectory.id
    )

    const subsubDir1 = await createDirectory(
      client,
      "sub-sub-Directory 1",
      subDir1.id
    )

    const subsubDir2 = await createDirectory(
      client,
      "sub-sub-Directory 2",
      subDir1.id
    )

    const fileDir = await fs.readdir(seedFilesPath)
    const files = fileDir.filter(
      (file) => file !== ".DS_Store" && file !== ".git"
    )

    for (const [index, file] of files.entries()) {
      const name = generateFileName()
      const key = uuidv4()
      const mimeType = getMimeTypeFromExtension(file)
      const buffer = await fs.readFile(join(seedFilesPath, file))
      const size = buffer.byteLength

      await saveFile(key, {
        ContentLength: size,
        LastModified: new Date(),
        ContentType: mimeType,
        Body: buffer,
      })

      const directoryId =
        index < 21
          ? subsubDir2.id
          : index < 42
          ? subsubDir1.id
          : index < 63
          ? subDir2.id
          : index < 84
          ? subDir1.id
          : rootDirectory.id

      await createFileRecord(client, {
        name,
        key,
        directoryId: directoryId,
        mimeType,
        size,
      })
    }
  } catch (error) {
    console.log(error)
  }
  await client.$disconnect()
}

void seed()
