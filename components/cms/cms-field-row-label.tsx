'use client'
import { useRowLabel } from '@payloadcms/ui'

/** Collapsed array rows show their label/title instead of "Row 01". */
export function CmsLinkRowLabel() {
  const { data, rowNumber } = useRowLabel<{ label?: string; href?: string }>()
  const n = (rowNumber ?? 0) + 1
  return <span>{data?.label ? `${n}. ${data.label}${data.href ? ` → ${data.href}` : ''}` : `Link ${n}`}</span>
}

export function CmsTitleRowLabel() {
  const { data, rowNumber } = useRowLabel<{ title?: string; heading?: string; name?: string; label?: string }>()
  const t = data?.title || data?.heading || data?.name || data?.label
  return <span>{t ? `${(rowNumber ?? 0) + 1}. ${t}` : `Item ${(rowNumber ?? 0) + 1}`}</span>
}

/** Navigation rows: "1. Label (collection)". */
export function CmsNavRowLabel() {
  const { data, rowNumber } = useRowLabel<{ label?: string; linkType?: string }>()
  const n = (rowNumber ?? 0) + 1
  return <span>{data?.label ? `${n}. ${data.label}${data.linkType && data.linkType !== 'path' ? ` (${data.linkType})` : ''}` : data?.linkType === 'brands' ? `${n}. Automatic brand menus` : `Item ${n}`}</span>
}
