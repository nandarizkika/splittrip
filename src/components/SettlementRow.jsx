import { formatRupiah } from '../utils/currency'

export default function SettlementRow({ settlement, onMarkPaid }) {
  function copyAmount() {
    navigator.clipboard.writeText(formatRupiah(settlement.amount))
  }

  return (
    <div className={`bg-card rounded-xl px-3 py-3 ${settlement.paid ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-sm font-semibold ${settlement.paid ? 'line-through text-gray-400' : 'text-white'}`}>
            {settlement.from} <span className="text-gray-500 font-normal">→</span> {settlement.to}
          </div>
          <div className={`text-base font-bold mt-0.5 ${settlement.paid ? 'line-through text-gray-500' : 'text-accent'}`}>
            {formatRupiah(settlement.amount)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!settlement.paid && (
            <button
              onClick={copyAmount}
              className="bg-deep text-gray-300 text-xs px-2.5 py-1.5 rounded-lg"
              title="Copy amount to clipboard"
            >
              📋
            </button>
          )}
          {settlement.paid ? (
            <span className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg">✓ Paid</span>
          ) : (
            <button
              onClick={() => onMarkPaid(settlement.id)}
              className="bg-deep border border-gray-600 text-gray-300 text-xs px-3 py-1.5 rounded-lg"
            >
              Mark Paid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
