import { createServerFn } from "@tanstack/react-start"
import { drive } from "~/lib/drive"

function extractFolderId(input: string): string {
  const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : input.trim()
}

export const testDriveConnection = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { folder_url: string } }) => {
    const folderId = extractFolderId(data.folder_url)
    if (!folderId) throw new Error("Please enter a Drive folder URL or ID")

    const res = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType",
    })

    if (res.data.mimeType !== "application/vnd.google-apps.folder") {
      throw new Error("The provided link is not a folder")
    }

    return { name: res.data.name ?? folderId }
  },
)
