type BrandLogoProps = {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  align?: 'left' | 'center'
  showTagline?: boolean
}

const toneMap = {
  light: {
    text: '#6b7280',
    line: 'rgba(107, 114, 128, 0.72)',
    sub: 'rgba(107, 114, 128, 0.85)',
  },
  dark: {
    text: 'rgba(255,255,255,0.96)',
    line: 'rgba(255,255,255,0.50)',
    sub: 'rgba(255,255,255,0.78)',
  },
} as const

const sizeMap = {
  sm: {
    wrap: 'max-w-[220px]',
    blocks: 'h-7 gap-3',
    block: 'w-8 rounded-t-sm',
    void: 'w-2.5 h-4',
    line: 'mt-1',
    wordmark: 'mt-2 text-[0.95rem]',
    docks: 'text-[2rem]',
    del: 'text-[0.85rem]',
    puerto: 'text-[2rem]',
    tagline: 'text-[0.6rem]',
  },
  md: {
    wrap: 'max-w-[320px]',
    blocks: 'h-9 gap-4',
    block: 'w-11 rounded-t-sm',
    void: 'w-3 h-5',
    line: 'mt-1.5',
    wordmark: 'mt-2.5 text-[1.15rem]',
    docks: 'text-[2.7rem]',
    del: 'text-[1.05rem]',
    puerto: 'text-[2.7rem]',
    tagline: 'text-[0.68rem]',
  },
  lg: {
    wrap: 'max-w-[450px]',
    blocks: 'h-12 gap-5',
    block: 'w-14 rounded-t-sm',
    void: 'w-4 h-7',
    line: 'mt-2',
    wordmark: 'mt-3 text-[1.4rem]',
    docks: 'text-[3.55rem]',
    del: 'text-[1.3rem]',
    puerto: 'text-[3.55rem]',
    tagline: 'text-[0.78rem]',
  },
} as const

const blockColors = ['#f05a28', '#16967e', '#f0b63d', '#1579bf']

function DockMark({ color, blockClass, voidClass }: { color: string; blockClass: string; voidClass: string }) {
  return (
    <div className={`${blockClass} relative`} style={{ backgroundColor: color }}>
      <div className={`${voidClass} absolute left-1/2 bottom-0 -translate-x-1/2 rounded-t-[2px] bg-white/92`} />
    </div>
  )
}

export default function BrandLogo({
  variant = 'light',
  size = 'md',
  align = 'left',
  showTagline = false,
}: BrandLogoProps) {
  const tone = toneMap[variant]
  const sizes = sizeMap[size]
  const centered = align === 'center'

  return (
    <div className={`${sizes.wrap} ${centered ? 'mx-auto text-center' : ''}`}>
      <div className={`flex ${centered ? 'justify-center' : 'justify-start'} items-end ${sizes.blocks}`}>
        {blockColors.map((color) => (
          <DockMark key={color} color={color} blockClass={sizes.block} voidClass={sizes.void} />
        ))}
      </div>

      <div className={`h-px w-full ${sizes.line}`} style={{ backgroundColor: tone.line }} />

      <div
        className={`${sizes.wordmark} font-heading leading-none whitespace-nowrap ${centered ? 'justify-center' : ''}`}
        style={{ color: tone.text }}
      >
        <span className={`${sizes.docks} font-medium tracking-[0.06em]`}>Docks</span>
        <span className={`${sizes.del} mx-[0.24em] align-middle font-semibold tracking-[0.28em]`}>DEL</span>
        <span className={`${sizes.puerto} font-medium tracking-[0.05em]`}>Puerto</span>
      </div>

      {showTagline && (
        <div className={`${sizes.tagline} mt-2 uppercase tracking-[0.35em]`} style={{ color: tone.sub }}>
          Gestion de mantenimiento
        </div>
      )}
    </div>
  )
}
