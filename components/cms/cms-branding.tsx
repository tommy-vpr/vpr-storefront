import Image from 'next/image'

/* Payload admin branding: wordmark on the login page, square mark in the nav / breadcrumb home, favicon via admin.meta. */
export function CmsLogo() {
  return <Image src="/images/logo-main.png" alt="VPR Collection" width={204} height={33} priority style={{ maxWidth: '100%', height: 'auto' }} />
}

/** Step-nav / collapsed-nav slot is square and stretches to its width → use the square "VPR" badge. */
export function CmsIcon() {
  return <Image src="/images/vpr-mark.png" alt="VPR" width={96} height={96} priority style={{ display: 'block', width: 25, height: 25, objectFit: 'contain' }} />
}
