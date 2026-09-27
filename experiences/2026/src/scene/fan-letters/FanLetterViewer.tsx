import { useEffect, useRef, useState } from 'react'
import { resolveUrl } from './loader'
import type { FanLetterRecord } from './types'

interface FanLetterViewerProps {
  record: FanLetterRecord
  onClose: () => void
}

/**
 * Full-resolution reading experience rendered as a DOM layer above the
 * canvas: crisper text, native scrolling, accessibility, and zero GPU
 * memory spent on full-resolution scans while browsing.
 */
export function FanLetterViewer({
  record,
  onClose,
}: FanLetterViewerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="letter-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Fan letter"
    >
      <button
        type="button"
        className="letter-viewer-backdrop"
        aria-label="Close letter"
        onClick={onClose}
      />

      <figure className="letter-viewer-card" style={{ minHeight: '200px' }}>
        {!loaded && <div className="letter-viewer-spinner" aria-label="Loading" />}
        <img
          src={resolveUrl(record.fullUrl)}
          alt={
            record.author
              ? `Fan letter from ${record.author}`
              : 'Fan letter'
          }
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }}
        />

        {record.author && loaded && (
          <figcaption>— {record.author}</figcaption>
        )}

        <button
          ref={closeButtonRef}
          type="button"
          className="letter-viewer-close"
          onClick={onClose}
        >
          Close
        </button>
      </figure>
    </div>
  )
}
