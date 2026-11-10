import Image from 'next/image'
import { UserRound } from 'lucide-react'
import type { PayloadRequest } from 'payload'

async function photoURL(req: PayloadRequest): Promise<string | null> {
  if (!req.user) return null
  try {
    const user = await req.payload.findByID({ collection: 'users', id: req.user.id, depth: 1, req })
    const photo = user.profilePhoto && typeof user.profilePhoto === 'object' ? user.profilePhoto : null
    return photo?.url && photo.mimeType?.startsWith('image/') ? photo.url : null
  } catch {
    return null
  }
}

/** Admin header avatar (admin.avatar): the signed-in user's Profile photo, else the default icon. */
export async function CmsProfileAvatar({ req }: { req: PayloadRequest }) {
  const src = await photoURL(req)
  if (!src) return <UserRound size={28} aria-hidden="true" />
  return <Image src={src} alt="Your profile" width={32} height={32} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
}
