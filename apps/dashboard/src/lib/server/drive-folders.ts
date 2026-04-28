import { drive } from "~/lib/drive"

const FOLDER_MIME = "application/vnd.google-apps.folder"

async function createFolder(name: string, parentId: string): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id",
  })
  const id = res.data.id
  if (!id) throw new Error(`Drive did not return an ID for folder "${name}"`)
  return id
}

export interface PortalFolderIds {
  onboarding: string
  active: string
  deliverables: string
  archive: string
}

export async function createPortalFolders(parentFolderId: string): Promise<PortalFolderIds> {
  const [onboarding, active, deliverables, archive] = await Promise.all([
    createFolder("Onboarding", parentFolderId),
    createFolder("Active", parentFolderId),
    createFolder("Deliverables", parentFolderId),
    createFolder("Archive", parentFolderId),
  ])

  return { onboarding, active, deliverables, archive }
}
