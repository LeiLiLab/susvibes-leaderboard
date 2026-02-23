import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Generic carousel component. Each slide is rendered from the `slides` array.
 * Supports prev/next buttons, dot indicators, keyboard arrows, and touch swipe.
 */
export default function Carousel({ slides, id = 'carousel' }) {
  const [current, setCurrent] = useState(0)
  const trackRef = useRef(null)
  const startXRef = useRef(null)

  const goTo = useCallback(
    (idx) => {
      if (idx < 0 || idx >= slides.length) return
      setCurrent(idx)
    },
    [slides.length]
  )

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') goTo(current - 1)
      if (e.key === 'ArrowRight') goTo(current + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, goTo])

  // Touch/swipe support
  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (startXRef.current === null) return
    const diff = startXRef.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo(current + 1)
      else goTo(current - 1)
    }
    startXRef.current = null
  }

  return (
    <div className="carousel-panel" id={`${id}-carousel`}>
      <div
        className="carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="carousel-track"
          ref={trackRef}
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div className="carousel-slide" key={i}>
              <div className="carousel-slide-inner">
                <figure className="carousel-figure">
                  <img src={slide.image} alt={slide.alt || ''} />
                  {slide.caption && <figcaption>{slide.caption}</figcaption>}
                </figure>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        className="carousel-btn carousel-btn-prev"
        onClick={() => goTo(current - 1)}
        aria-label="Previous slide"
      >
        <i className="fas fa-chevron-left" />
      </button>
      <button
        className="carousel-btn carousel-btn-next"
        onClick={() => goTo(current + 1)}
        aria-label="Next slide"
      >
        <i className="fas fa-chevron-right" />
      </button>

      <div className="carousel-dots">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`carousel-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  )
}
