import { useCallback, useRef, useState, type ReactNode } from 'react'
import {
  CREATOR_NAME,
  CREATOR_URL,
  DISCORD_INVITE_URL,
  GAME_LOGO_SRC,
  GAME_TITLE,
  GAME_VERSION,
  SHARE_TEXT,
} from '../game/releaseMeta'

function BrandLogo() {
  return (
    <img
      className="app__brand-logo-img"
      src={GAME_LOGO_SRC}
      alt=""
      width={200}
      height={80}
      decoding="async"
      fetchPriority="high"
    />
  )
}

function DiscordIcon() {
  return (
    <svg
      className="app__brand-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  )
}

type ReleaseBarProps = {
  onOpenSettings?: () => void
  /** Optional slot for compact widgets (e.g. achievement HUD) in the actions area. */
  inlineHud?: ReactNode
}

export function AppReleaseBar({ onOpenSettings, inlineHud }: ReleaseBarProps) {
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number>(0)

  const onShare = useCallback(async () => {
    const url = window.location.href
    const data = { title: GAME_TITLE, text: SHARE_TEXT, url }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(data)
        return
      } catch {
        /* user cancelled or share failed */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard denied */
    }
  }, [])

  return (
    <div className="app__brand-strip">
      <div className="app__brand">
        <span className="app__brand-logo" aria-hidden>
          <BrandLogo />
        </span>
        <h1 className="app__brand-title">{GAME_TITLE}</h1>
      </div>
      <div className="app__brand-actions">
        {inlineHud ? <div className="app__brand-hud">{inlineHud}</div> : null}
        {copied ? (
          <span className="app__share-feedback" role="status">
            Link copied!
          </span>
        ) : null}
        {onOpenSettings ? (
          <button
            type="button"
            className="app__release-btn app__release-btn--settings"
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            Settings
          </button>
        ) : null}
        <button
          type="button"
          className="app__release-btn app__release-btn--share"
          onClick={onShare}
          aria-label="Share game link"
        >
          Share
        </button>
        <a
          className="app__release-btn app__release-btn--discord"
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join Discord (opens in new tab)"
        >
          <DiscordIcon />
          <span>Join Discord</span>
        </a>
      </div>
    </div>
  )
}

export function AppReleaseFooter() {
  return (
    <footer className="app__footer">
      <p className="app__footer-line">
        {GAME_TITLE} <span className="app__footer-sep">•</span> v{GAME_VERSION}{' '}
        <span className="app__footer-sep">•</span> Created by{' '}
        <a
          className="app__footer-credit"
          href={CREATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${CREATOR_NAME} — opens in new tab`}
        >
          {CREATOR_NAME}
        </a>
      </p>
      <p className="app__footer-save">Progress saves locally in this browser.</p>
      <p className="app__footer-legal">
        <a
          className="app__footer-privacy"
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
      </p>
    </footer>
  )
}
