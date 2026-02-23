import { useState, useEffect, useCallback } from 'react'

/**
 * ImageLightbox – click-to-expand overlay for blog images.
 *
 * Usage: wrap any <img> you want expandable:
 *   <ImageLightbox src={url} alt="..." className="..." />
 *
 * Or use the standalone <Lightbox> overlay + the useLightbox() hook
 * to make *all* images inside a container expandable via event delegation.
 */

/* ── Standalone controlled overlay ───────────────────────────────── */
export function Lightbox({ src, alt, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!src) return null

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <i className="fas fa-times" />
      </button>
      <img
        src={src}
        alt={alt || ''}
        className="lightbox-image"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

/* ── Hook: event-delegation lightbox for a container ref ─────────── */
export function useLightbox() {
  const [lightbox, setLightbox] = useState({ src: null, alt: null })

  const openFromEvent = useCallback((e) => {
    const img = e.target.closest('img')
    if (!img) return
    // Skip tiny icons / decorative images
    if (img.naturalWidth < 80 || img.closest('.lightbox-overlay')) return
    setLightbox({ src: img.src, alt: img.alt })
  }, [])

  const close = useCallback(() => setLightbox({ src: null, alt: null }), [])

  const overlay = lightbox.src ? (
    <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={close} />
  ) : null

  return { onClick: openFromEvent, overlay }
}

export default function ImageLightbox({ src, alt, className, style, ...rest }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <img
        src={src}
        alt={alt || ''}
        className={className}
        style={{ ...style, cursor: 'zoom-in' }}
        onClick={() => setOpen(true)}
        {...rest}
      />
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  )
}
