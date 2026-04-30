import { createServerFn } from "@tanstack/react-start"
import { google } from "googleapis"

export const shareWithServiceAccount = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { folder_id: string; access_token: string } }) => {
    // biome-ignore lint/style/noNonNullAssertion: must be set at startup
    const serviceAccountEmail = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!).client_email

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: data.access_token })
    const userDrive = google.drive({ version: "v3", auth })

    await userDrive.permissions.create({
      fileId: data.folder_id,
      requestBody: { type: "user", role: "writer", emailAddress: serviceAccountEmail },
      sendNotificationEmail: false,
    })

    const file = await userDrive.files.get({ fileId: data.folder_id, fields: "id,name" })
    return { name: file.data.name ?? data.folder_id }
  },
)
