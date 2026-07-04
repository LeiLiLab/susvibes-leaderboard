import { useState, useRef, useEffect } from 'react'
import './PillSelect.css'

// Compact labeled dropdown styled to match the control pills (gray surface, 12px
// radius, soft shadow). Generic: used for the dataset version and the per-page size.
export default function PillSelect({ options, value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`pill-select ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="pill-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {label && <span className="pill-select-caption">{label}</span>}
        <span className="pill-select-value">{value}</span>
        <span className="pill-select-chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="pill-select-menu" role="listbox">
          {options.map(opt => (
            <li key={opt} role="option" aria-selected={opt === value}>
              <button
                type="button"
                className={`pill-select-option ${opt === value ? 'is-selected' : ''}`}
                onClick={() => { onChange(opt); setOpen(false) }}
              >
                <span className="pill-select-check" aria-hidden="true">{opt === value ? '✓' : ''}</span>
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
