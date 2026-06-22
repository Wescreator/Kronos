export default function Avatar({ src, name = '', size = 'md' }) {
  const sizes = {
    sm: { box: 'h-7 w-7', text: 'text-[10px]' },
    md: { box: 'h-9 w-9', text: 'text-xs' },
    lg: { box: 'h-12 w-12', text: 'text-sm' },
    xl: { box: 'h-16 w-16', text: 'text-base' },
  }
  const s = sizes[size] || sizes.md
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (src) {
    return (
      <img
        src={src} alt={name}
        className={`${s.box} rounded-full object-cover ring-2 ring-white/5`}
      />
    )
  }

  return (
    <div
      className={`${s.box} ${s.text} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{
        background: 'linear-gradient(135deg, rgba(172, 172, 172, 0.3), rgba(87, 87, 87, 0.12))',
        border: '1px solid rgba(68, 68, 68, 0)',
        color: '#c4c4c4'
      }}
    >
      {initials}
    </div>
  )
}