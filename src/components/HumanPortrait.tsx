import type { ReactNode } from 'react'
import type { CharacterLook } from '../data/types'

const SKIN: Record<CharacterLook['skinTone'], string> = {
  porcelain: '#f0d4c4',
  fair: '#e0b896',
  tan: '#c9915e',
  brown: '#8b5a3c',
  deep: '#4a2c22',
}

const SHADOW = 'rgba(0,0,0,0.22)'

const SHIRT: Record<CharacterLook['shirt'], string> = {
  tee: '#2d3a4d',
  tank: '#3d2f3a',
  henley: '#3a3530',
  button: '#2a2e38',
  turtleneck: '#1e2430',
}

const JACKET_FILL: Record<Exclude<CharacterLook['jacket'], 'none'>, string> = {
  leather: '#1a1410',
  bomber: '#2a2520',
  suit: '#222830',
  hoodie: '#2c3240',
  trench: '#3a3530',
}

/** Matches head ellipse: cx=50 cy=30 rx=21 ry=25 — crown sits above ~y=22 hairline */
const HEAD_CX = 50
const HEAD_CY = 30
const HEAD_RX = 21
const HEAD_RY = 25

type Props = {
  look: CharacterLook
  className?: string
  title?: string
}

const hairStroke = { stroke: '#0d0a0c', strokeWidth: 0.45, strokeLinejoin: 'round' as const }

/**
 * Crown-only mass (clipped) — never covers eyes/mouth.
 * Long styles add side panels outside the clip.
 */
function Hair({ hair }: { hair: CharacterLook['hair'] }) {
  const fill = '#0f0c0e'
  const hi = '#252028'

  let crown: ReactNode
  let sides: ReactNode = null

  switch (hair) {
    case 'buzz':
      crown = (
        <ellipse
          cx={HEAD_CX}
          cy={11}
          rx={16.5}
          ry={6.5}
          fill={fill}
          opacity={0.94}
          {...hairStroke}
        />
      )
      break
    case 'short':
      crown = (
        <path
          d="M 31 22 Q 31 9 50 6 Q 69 9 69 22 Q 69 24 50 22.5 Q 31 24 31 22 Z"
          fill={fill}
          {...hairStroke}
        />
      )
      break
    case 'fade':
      crown = (
        <g>
          <path
            d="M 31 23 Q 31 10 50 7 Q 69 10 69 23 Q 68 25 50 23.5 Q 32 25 31 23 Z"
            fill={fill}
            {...hairStroke}
          />
          <path d="M 34 21 Q 50 15 66 21 L 64 24 Q 50 19 36 24 Z" fill={hi} opacity={0.45} />
        </g>
      )
      break
    case 'slick':
      crown = <path d="M 32 10 L 68 10 L 67 17 Q 50 12 33 17 Z" fill={fill} {...hairStroke} />
      break
    case 'medium':
      crown = (
        <path
          d="M 30 23 Q 29 8 50 5 Q 71 8 70 23 Q 69 26 50 24 Q 31 26 30 23 Z"
          fill={fill}
          {...hairStroke}
        />
      )
      sides = (
        <g opacity={0.96} {...hairStroke}>
          <path d="M 31 21 L 28 21 Q 26 38 29 52 Q 31 54 34 52 Q 33 36 33 23 Z" fill={fill} />
          <path d="M 69 21 L 72 21 Q 74 38 71 52 Q 69 54 66 52 Q 67 36 67 23 Z" fill={fill} />
        </g>
      )
      break
    case 'long':
      crown = (
        <path
          d="M 29 24 Q 28 7 50 4 Q 72 7 71 24 Q 70 27 50 25 Q 30 27 29 24 Z"
          fill={fill}
          {...hairStroke}
        />
      )
      sides = (
        <g opacity={0.95} {...hairStroke}>
          <path d="M 30 22 L 26 23 Q 22 55 28 88 Q 31 92 36 88 Q 32 58 33 24 Z" fill={fill} />
          <path d="M 70 22 L 74 23 Q 78 55 72 88 Q 69 92 64 88 Q 68 58 67 24 Z" fill={fill} />
        </g>
      )
      break
    default:
      crown = null
  }

  if (!crown && !sides) return null

  return (
    <g className="human-portrait__hair">
      <g clipPath="url(#hp-hair-crown-clip)">{crown}</g>
      {sides}
    </g>
  )
}

function FacialHair({ kind }: { kind: CharacterLook['facialHair'] }) {
  const f = '#141018'
  if (kind === 'none') return null
  if (kind === 'stubble') {
    return (
      <ellipse
        cx={50}
        cy={38}
        rx={16}
        ry={11}
        fill={f}
        opacity={0.16}
        style={{ mixBlendMode: 'multiply' }}
      />
    )
  }
  if (kind === 'mustache') {
    return <path d="M 38 36 Q 50 40 62 36 Q 58 33 50 34 Q 42 33 38 36 Z" fill={f} opacity={0.88} />
  }
  if (kind === 'goatee') {
    return <path d="M 38 36 Q 50 40 62 36 Q 60 48 50 52 Q 40 48 38 36 Z" fill={f} opacity={0.9} />
  }
  return <path d="M 32 34 Q 50 30 68 34 Q 72 52 50 58 Q 28 52 32 34 Z" fill={f} opacity={0.88} />
}

function JacketLayer({ jacket }: { jacket: CharacterLook['jacket'] }) {
  if (jacket === 'none') return null
  const fill = JACKET_FILL[jacket]
  if (jacket === 'hoodie') {
    return (
      <path
        d="M 22 78 L 24 58 Q 24 52 30 50 L 32 54 Q 38 50 50 48 Q 62 50 68 54 L 70 50 Q 76 52 76 58 L 78 78 L 74 115 L 26 115 Z"
        fill={fill}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={0.5}
      />
    )
  }
  if (jacket === 'suit') {
    return (
      <g>
        <path
          d="M 20 76 L 26 54 L 38 50 L 50 52 L 62 50 L 74 54 L 80 76 L 78 115 L 22 115 Z"
          fill={fill}
          stroke="rgba(212,160,23,0.25)"
          strokeWidth={0.4}
        />
        <path d="M 50 52 L 50 78 L 46 115 L 54 115 L 50 78 Z" fill="#1a1e26" opacity={0.9} />
      </g>
    )
  }
  return (
    <path
      d="M 22 80 L 26 56 Q 30 50 50 49 Q 70 50 74 56 L 78 80 L 76 115 L 24 115 Z"
      fill={fill}
      stroke="rgba(0,0,0,0.4)"
      strokeWidth={0.5}
    />
  )
}

export function HumanPortrait({ look, className = '', title }: Props) {
  const skin = SKIN[look.skinTone]
  const shirtColor = SHIRT[look.shirt]

  return (
    <svg
      className={`human-portrait ${className}`.trim()}
      viewBox="0 0 100 120"
      width="100%"
      height="100%"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      <defs>
        <linearGradient id="hp-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.15} />
        </linearGradient>
        {/* Clip: crown only — below ~y=24.5 so hair mass cannot paint over eyes (y~28) */}
        <clipPath id="hp-hair-crown-clip" clipPathUnits="userSpaceOnUse">
          <path d="M 22 0 L 78 0 L 78 25 Q 50 21 22 25 Z" />
        </clipPath>
      </defs>

      <g className="human-portrait__body">
        <path
          d="M 28 115 L 30 72 Q 32 58 42 54 L 42 50 L 58 50 L 58 54 Q 68 58 70 72 L 72 115 Z"
          fill={shirtColor}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={0.5}
        />
        <path
          d="M 42 54 L 50 70 L 58 54"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
        />
        <JacketLayer jacket={look.jacket} />
      </g>

      <g className="human-portrait__head">
        <path
          d="M 40 52 L 40 44 Q 50 46 60 44 L 60 52 Q 50 54 40 52 Z"
          fill={skin}
          stroke={SHADOW}
          strokeWidth={0.35}
        />

        <ellipse
          cx={HEAD_CX}
          cy={HEAD_CY}
          rx={HEAD_RX}
          ry={HEAD_RY}
          fill={skin}
          stroke={SHADOW}
          strokeWidth={0.5}
        />
        <ellipse
          cx={HEAD_CX}
          cy={HEAD_CY + 2}
          rx={18}
          ry={22}
          fill="url(#hp-shade)"
          opacity={0.35}
        />

        <ellipse cx={29} cy={30} rx={4} ry={6} fill={skin} opacity={0.95} />
        <ellipse cx={71} cy={30} rx={4} ry={6} fill={skin} opacity={0.95} />

        <g className="human-portrait__face">
          <ellipse cx={42} cy={28} rx={4.5} ry={3} fill="#f8f6f2" />
          <ellipse cx={58} cy={28} rx={4.5} ry={3} fill="#f8f6f2" />
          <ellipse cx={42.5} cy={28.5} rx={2} ry={2.2} fill="#1a1420" />
          <ellipse cx={58.5} cy={28.5} rx={2} ry={2.2} fill="#1a1420" />
          <path
            d="M 36 24 Q 42 22 46 24"
            fill="none"
            stroke="#2a2024"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
          <path
            d="M 54 24 Q 58 22 64 24"
            fill="none"
            stroke="#2a2024"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
          <path d="M 50 30 L 48 38 L 52 38 Z" fill="rgba(0,0,0,0.12)" />
          <path
            d="M 44 40 Q 50 43 56 40"
            fill="none"
            stroke="rgba(40,20,24,0.45)"
            strokeWidth={0.9}
            strokeLinecap="round"
          />
        </g>

        <FacialHair kind={look.facialHair} />

        <g transform={`translate(0, ${look.hairYOffset ?? -2.5})`}>
          <Hair hair={look.hair} />
        </g>

        {look.glasses ? (
          <g
            className="human-portrait__accessory-glasses"
            stroke="#c4c2bc"
            strokeWidth={1}
            fill="none"
            opacity={0.92}
          >
            <rect x={33} y={25} width={14} height={8} rx={2} />
            <rect x={53} y={25} width={14} height={8} rx={2} />
            <path d="M 47 29 H 53" />
            <path d="M 33 29 H 28" strokeLinecap="round" />
            <path d="M 67 29 H 72" strokeLinecap="round" />
          </g>
        ) : null}
      </g>

      {look.chain ? (
        <g className="human-portrait__accessory-chain">
          <path
            d="M 38 56 Q 50 68 62 56"
            fill="none"
            stroke="#d4a017"
            strokeWidth={1.8}
            opacity={0.85}
          />
          <circle cx={50} cy={62} r={3.2} fill="#2a2420" stroke="#d4a017" strokeWidth={0.6} />
        </g>
      ) : null}

      {look.hat ? (
        <g
          className="human-portrait__accessory-hat"
          transform={`translate(0, ${look.hatYOffset ?? -1.5})`}
        >
          <ellipse
            cx={50}
            cy={18}
            rx={26}
            ry={7}
            fill="#1a1618"
            stroke="#0a0808"
            strokeWidth={0.5}
          />
          <path
            d="M 28 18 Q 50 2 72 18 L 70 22 Q 50 10 30 22 Z"
            fill="#222026"
            stroke="#0a0808"
            strokeWidth={0.4}
          />
        </g>
      ) : null}
    </svg>
  )
}
