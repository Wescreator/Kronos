export default function Spinner({ size = 'md' }) {
  const s = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]
  return (
    <div
      className={`${s} animate-spin rounded-full`}
      style={{ border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#7C5CFC' }}
    />
  )
}