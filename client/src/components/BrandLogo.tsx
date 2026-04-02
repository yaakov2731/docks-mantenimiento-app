interface BrandLogoProps {
  variant?: 'light' | 'dark'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showTagline?: boolean
  align?: 'left' | 'center'
  className?: string
}

// Wider SVG widths so arches are large enough to read clearly
const WIDTHS = { xs: 120, sm: 168, md: 216, lg: 288 }

// Brand colors exactly as in the original logo
const ARCH_COLORS = ['#D94F3B', '#2E8A48', '#E8B830', '#1E72B8']

// ── Coordinate system (viewBox 0 0 288 90) ──────────────────────────
// 4 arches: 52px wide, 54px tall, 7px gaps → total = 4×52+3×7 = 229px
// Centered in 288px → start x = (288-229)/2 = 29.5 → rounded to 30
const AX  = [30, 89, 148, 207]  // left-edge x of each arch
const AW  = 52   // arch width
const AH  = 54   // arch height
const AR  = 6    // top corner radius (slight, like the original)
const DW  = 17   // door cutout width  (centered, ≈ 1/3 of AW)
const DH  = 30   // door cutout height (from bottom of arch)
const TOP = 6    // padding above arches
const VBW = 288  // viewBox width

function archPath(ax: number) {
  const y = TOP
  return (
    `M ${ax + AR},${y} ` +
    `L ${ax + AW - AR},${y} ` +
    `Q ${ax + AW},${y} ${ax + AW},${y + AR} ` +
    `L ${ax + AW},${y + AH} ` +
    `L ${ax},${y + AH} ` +
    `L ${ax},${y + AR} ` +
    `Q ${ax},${y} ${ax + AR},${y} Z`
  )
}

export default function BrandLogo({
  variant = 'light',
  size = 'md',
  showTagline = true,
  align = 'left',
  className = '',
}: BrandLogoProps) {
  const svgW  = WIDTHS[size]
  const lineY = TOP + AH + 2
  const textY = lineY + 22
  const viewH = showTagline ? textY + 6 : lineY + 4
  const svgH  = Math.round(svgW * viewH / VBW)

  const doorFill  = variant === 'dark' ? '#1E2832' : '#ffffff'
  const lineColor = variant === 'dark' ? 'rgba(255,255,255,0.20)' : '#C0C7D0'
  const textColor = variant === 'dark' ? 'rgba(255,255,255,0.65)' : '#787F8A'
  // Text always centered under the arch group
  const archCenter = (AX[0] + AX[3] + AW) / 2
  const tx = archCenter
  const ta = 'middle' as const
  const svgClassName = `block ${align === 'center' ? 'mx-auto' : ''} ${className}`.trim()

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${VBW} ${viewH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Docks del Puerto"
      className={svgClassName}
    >
      {/* Arches */}
      {ARCH_COLORS.map((color, i) => (
        <g key={i}>
          <path d={archPath(AX[i])} fill={color} />
          {/* Door cutout — centered horizontally, flush with bottom */}
          <rect
            x={AX[i] + (AW - DW) / 2}
            y={TOP + AH - DH}
            width={DW}
            height={DH}
            fill={doorFill}
          />
        </g>
      ))}

      {/* Baseline rule */}
      <line
        x1={AX[0]} y1={lineY} x2={AX[3] + AW} y2={lineY}
        stroke={lineColor} strokeWidth="1"
      />

      {/* "Docks del Puerto" wordmark */}
      {showTagline && (
        <text
          x={tx} y={textY}
          fontFamily="Georgia, 'Times New Roman', serif"
          fill={textColor}
          textAnchor={ta}
        >
          <tspan fontSize="18" letterSpacing="2.8" fontWeight="400">DOCKS </tspan>
          <tspan fontSize="13" letterSpacing="1.0" fontWeight="400" dy="1.8">del </tspan>
          <tspan fontSize="18" letterSpacing="2.8" fontWeight="400" dy="-1.8">PUERTO</tspan>
        </text>
      )}
    </svg>
  )
}
