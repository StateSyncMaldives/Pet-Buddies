import { colors } from '../theme'

/** Sliding-pill segmented control (species toggle, inbox toggle, …). */
export function Segmented({
  options,
  activeIndex,
  onSelect,
  fontSize = 14.5,
}: {
  options: string[]
  activeIndex: number
  onSelect: (index: number) => void
  fontSize?: number
}) {
  const pct = 100 / options.length
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        background: '#E4E7ED',
        borderRadius: 13,
        padding: 4,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 4,
          width: `calc(${pct}% - 4px)`,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 2px 6px rgba(0,0,0,.08)',
          transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 8}px))`,
        }}
      />
      {options.map((opt, i) => (
        <button
          key={opt}
          onClick={() => onSelect(i)}
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            border: 'none',
            background: 'none',
            padding: '9px 0',
            fontSize,
            fontWeight: 600,
            color: i === activeIndex ? colors.ink : colors.textSecondaryAlt,
            cursor: 'pointer',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
