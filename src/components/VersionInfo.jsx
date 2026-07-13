import { useState, useRef, useEffect } from 'react'
import './VersionInfo.css'

const RELEASE_URL = 'https://github.com/LeiLiLab/susvibes/releases/tag/v1.0'

// ⓘ control sitting beside the dataset-version PillSelect: explains how the
// versions differ and links to the full release notes. Same open/close idiom
// as PillSelect (outside-click + Escape).
export default function VersionInfo() {
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
    <div className={`version-info ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="version-info-button"
        aria-label="How do the dataset versions differ?"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="version-info-icon" aria-hidden="true">ⓘ</span>
      </button>
      {open && (
        <div className="version-info-popup">
          <div className="version-info-content">
            <button className="version-info-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            <h4>Dataset Versions</h4>
            <div className="version-info-item">
              <strong>v0.0</strong>
              <p>Initial 200-task security benchmark.</p>
            </div>
            <div className="version-info-item">
              <strong>v1.0</strong>
              <p>186 tasks. Human-verified security tests and reward-hack-resistant
                environments (git history removed). Scores are not directly comparable
                to v0.0.</p>
            </div>
            <a className="version-info-link" href={RELEASE_URL} target="_blank" rel="noopener noreferrer">
              Release notes ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
