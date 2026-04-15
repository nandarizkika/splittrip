import { useNavigate, useParams } from 'react-router-dom'
import { formatRupiah } from '../utils/currency'
import { CATEGORIES } from './CategoryPicker'

export default function ExpenseRow({ expense }) {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const cat = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[4]
  const date = new Date(expense.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
  const peopleCount = expense.splitAmong.length + (expense.payerIncluded ? 1 : 0)

  return (
    <div className="bg-card rounded-xl px-3 py-2.5 flex items-center gap-3">
      <span className="text-xl">{cat.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-semibold">{cat.label}</div>
        <div className="text-gray-400 text-xs truncate">
          {expense.paidBy} · {peopleCount} people · {date}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-accent font-bold text-xs">{formatRupiah(expense.amount)}</span>
        <button
          onClick={() => navigate(`/trip/${tripId}/edit/${expense.id}`)}
          className="bg-deep text-gray-400 text-xs px-2 py-1 rounded"
        >
          ✏️
        </button>
      </div>
    </div>
  )
}
