import { HelpCircle } from 'lucide-react'

interface Props {
  onClick: () => void
  label?: string
}

export default function HelpButton({ onClick, label = '¿Cómo funciona?' }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
      title={label}
    >
      <HelpCircle className="w-4 h-4" />
      {label}
    </button>
  )
}
