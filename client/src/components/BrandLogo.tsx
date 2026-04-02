interface BrandLogoProps {
  variant?: 'light' | 'dark'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showTagline?: boolean
  align?: 'left' | 'center'
  className?: string
}

// Pixel widths — height scales automatically via viewBox aspect ratio
const WIDTHS = { xs: 90, sm: 130, md: 170, lg: 230 }

// Original logo arch colors
const ARCHES = [
  { color: '#D94F3B' }, // terracotta / orange-red
  { color: '#2E8A48' }, // forest green
  { color: '#E8B830' }, // amber / golden
  { color: '#1E72B8' }, // cobalt blue
]

// SVG coordinate system:
//   viewBox = "0 0 270 78"   (with tagline "Docks del Puerto")
//   viewBox = "0 0 270 52"   (arches only)
//
// 4 arches: 46px wide, 46px tall, 6px gap → total 202px
// Centered in 270px → start x = 34

const AX = [34, 86, 138, 190] // left edge x of each arch
const AW = 46  // arch width
const AH = 46  // arch height
const AR = 5   // top corner radius — rectangular arch, not semicircle
const DW = 15  // door cutout width
const DH = 26  // door cutout height (from bottom of arch)

function archPath(x: number) {
  // Rectangle with rounded top-left and top-right corners only
  return (
    `M ${x + AR},0 ` +
    `L ${x + AW - AR},0 ` +
    `Q ${x + AW},0 ${x + AW},${AR} ` +
    `L ${x + AW},${AH} ` +
    `L ${x},${AH} ` +
    `L ${x},${AR} ` +
    `Q ${x},0 ${x + AR},0 Z`
  )
}

export default function BrandLogo({
  variant = 'light',
  size = 'md',
  showTagline = true,
  align = 'left',
  className = '',
}: BrandLogoProps) {
  const svgW = WIDTHS[size]
  const viewH = showTagline ? 78 : 52
  const svgH = Math.round(svgW * viewH / 270)

  const doorFill  = variant === 'dark' ? '#1E2832' : '#ffffff'
  const lineColor = variant === 'dark' ? 'rgba(255,255,255,0.22)' : '#B0B7C0'
  const textColor = variant === 'dark' ? 'rgba(255,255,255,0.70)' : '#757E8A'

  const cx = 135 // horizontal center of viewBox

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 270 ${viewH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', ...(align === 'center' ? { margin: '0 auto' } : {}) }}
      aria-label="Docks del Puerto"
    >
      {/* ── Arches ── */}
      {ARCHES.map(({ color }, i) => {
        const x = AX[i]
        return (
          <g key={i}>
            <path d={archPath(x)} fill={color} />
            {/* Door cutout — centered, from bottom of arch upward */}
            <rect
              x={x + (AW - DW) / 2}
              y={AH - DH}
              width={DW}
              height={DH}
              fill={doorFill}
            />
          </g>
        )
      })}

      {/* ── Baseline rule ── */}
      <line x1="14" y1="47.5" x2="256" y2="47.5" stroke={lineColor} strokeWidth="0.9" />

      {/* ── "Docks del Puerto" wordmark ── */}
      {showTagline && (
        <text
          y="68"
          fontFamily="Georgia, 'Times New Roman', 'Palatino Linotype', serif"
          fill={textColor}
          textAnchor={align === 'center' ? 'middle' : 'start'}
          x={align === 'center' ? cx : 14}
        >
          <tspan fontSize="17.5" letterSpacing="2.4" fontWeight="400">DOCKS </tspan>
          <tspan fontSize="12.5" letterSpacing="1.2" fontWeight="400" dy="1.5">del </tspan>
          <tspan fontSize="17.5" letterSpacing="2.4" fontWeight="400" dy="-1.5">PUERTO</tspan>
        </text>
      )}
    </svg>
  )
}
