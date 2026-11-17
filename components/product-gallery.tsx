'use client'
import { useState } from 'react'

/** Main image + thumbnail strip. First image is the WMS/CMS primary. */
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={title} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No image</div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${title} image ${i + 1}`}
              aria-current={i === active}
              className={`aspect-square overflow-hidden rounded-md border bg-muted ${i === active ? 'ring-2 ring-foreground' : 'opacity-80 hover:opacity-100'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
