import { useRef, useEffect, useState } from 'react'

/**
 * Wrapper component that triggers a callback (or sets `isVisible` via render prop)
 * when the element scrolls into view. Uses IntersectionObserver.
 */
export default function ScrollAnimatedSection({ children, className = '', threshold = 0.3 }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(el)
          }
        })
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return (
    <div ref={ref} className={className} data-visible={isVisible}>
      {typeof children === 'function' ? children(isVisible) : children}
    </div>
  )
}
