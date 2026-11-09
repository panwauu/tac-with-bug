import { reactive } from 'vue'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { user } from './useUser'

// Pictures of group chats, cached per chat and version (groupPicture of the chat overview is the time of the last change)
const groupPictures = reactive<Record<string, string | null>>({})

function key(chatid: number, version: number) {
  return `${chatid}-${version}`
}

/** The picture as data URL, undefined while loading or without picture. Loads it on first use. */
export function getGroupPictureSrc(chatid: number, version: number | null | undefined): string | undefined {
  if (version == null) return undefined
  const k = key(chatid, version)
  if (!(k in groupPictures)) {
    groupPictures[k] = null
    Service.getGroupPicture(chatid)
      .then((picture) => {
        if (picture !== '') groupPictures[k] = picture.startsWith('"') ? picture.substring(1, picture.length - 1) : picture
      })
      .catch(() => {})
  }
  return groupPictures[k] ?? undefined
}

/** Uploads a new picture for a group chat; the server resizes it. True if it worked. */
export async function uploadGroupPicture(chatid: number, file: Blob): Promise<boolean> {
  const formData = new FormData()
  formData.append('groupPic', file)
  const res = await fetch(`/gameApi/uploadGroupPicture?chatid=${chatid}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user.token}` },
    body: formData,
  })
  return res.status === 204
}

export async function deleteGroupPicture(chatid: number): Promise<boolean> {
  try {
    await Service.deleteGroupPicture(chatid)
    return true
  } catch {
    return false
  }
}
