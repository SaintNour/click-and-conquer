import { useEffect, useRef } from 'react'

const AD_CLIENT = 'ca-pub-7253968109025678'
const AD_SLOT = '1234567890'

type Props = {
  variant: 'left' | 'right'
}

/**
 * Renders an AdSense unit inside `.ad-left` / `.ad-right`.
 * Calls `(adsbygoogle = window.adsbygoogle || []).push({})` after the `<ins>` is in the DOM
 * (React equivalent of the inline script Google documents).
 */
export function AdSenseSideSlot({ variant }: Props) {
  const insRef = useRef<HTMLModElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const inner = innerRef.current
    const el = insRef.current
    if (!inner || !el) return
    if (inner.dataset.adsenseRequested === 'true') return
    inner.dataset.adsenseRequested = 'true'

    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch {
      /* script blocked or not approved — placeholder remains visible */
    }
  }, [])

  const rootClass = variant === 'left' ? 'ad-left' : 'ad-right'

  return (
    <div className={`${rootClass} ad-sense-side`}>
      <div ref={innerRef} className="ad-sense-side__inner">
        <span className="ad-sense-side__fallback" aria-hidden>
          Ad Space
        </span>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={AD_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  )
}
