import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useExpenses } from '../hooks/useExpenses'
import { useSettlements } from '../hooks/useSettlements'
import { usePaymentInfo } from '../hooks/usePaymentInfo'
import { formatRupiah } from '../utils/currency'
import SettlementRow from '../components/SettlementRow'

export default function Settlement() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip } = useTrip(tripId)
  const { expenses } = useExpenses(tripId)
  const { settlements, markPaid } = useSettlements(tripId)
  const { paymentInfo } = usePaymentInfo(tripId)

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const unpaid = settlements.filter((s) => !s.paid)
  const paid = settlements.filter((s) => s.paid)

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
        <h1 className="text-white font-bold text-base">Settlement</h1>
        <span className="ml-auto bg-card text-gray-400 text-xs px-3 py-1 rounded-lg">{trip?.name}</span>
      </div>

      <div className="bg-card rounded-xl p-3 mb-5 flex justify-between">
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wide">Total Spent</div>
          <div className="text-white font-extrabold text-base">{formatRupiah(totalSpent)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs uppercase tracking-wide">Transactions needed</div>
          <div className="text-green-400 font-bold text-base">
            {unpaid.length} payment{unpaid.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {unpaid.length > 0 && (
        <div className="mb-5">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Outstanding</div>
          <div className="space-y-2">
            {unpaid.map((s) => (
              <SettlementRow
                key={s.id}
                settlement={s}
                onMarkPaid={markPaid}
                paymentInfo={paymentInfo[s.to]}
                tripName={trip?.name || ''}
              />
            ))}
          </div>
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Settled ✓</div>
          <div className="space-y-2">
            {paid.map((s) => (
              <SettlementRow
                key={s.id}
                settlement={s}
                onMarkPaid={markPaid}
                paymentInfo={paymentInfo[s.to]}
                tripName={trip?.name || ''}
              />
            ))}
          </div>
        </div>
      )}

      {settlements.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-12">No expenses yet — everyone's even!</p>
      )}
    </div>
  )
}
