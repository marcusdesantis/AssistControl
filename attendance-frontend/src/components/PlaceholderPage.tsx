import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-primary-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <p className="text-gray-500 text-sm mt-2 max-w-xs">
        Este módulo está en desarrollo. Estará disponible en la próxima entrega.
      </p>
    </div>
  )
}
