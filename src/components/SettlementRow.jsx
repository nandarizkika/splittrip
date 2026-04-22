import { useState } from 'react'
import { formatRupiah } from '../utils/currency'
import { EWALLET_LABELS, buildReminderMessage, buildWhatsAppUrl } from '../utils/whatsapp'

export default function SettlementRow({ settlement, onMarkPaid, paymentInfo, debtorPhone, tripName }) {
  const [expanded, setExpanded] = useState(false)
  const [copiedMsg, setCopiedMsg] = useState('')

  const hasPhone = !!paymentInfo?.phone
  const hasBank = !!(paymentInfo?.bankName && paymentInfo?.bankAccount)
  const hasEwallets = !!(paymentInfo?.ewallets && paymentInfo.ewallets.length > 0)
  const hasAnyInfo = (hasPhone && hasEwallets) || hasBank

  function copyText(text, label) {
    navigator.clipboard.writeText(text)
    setCopiedMsg(label)
    setTimeout(() => setCopiedMsg(''), 2000)
  }

  function handleRemind() {
    const message = buildReminderMessage({
      debtor: settlement.from,
      tripName: tripName || '',
      amountFormatted: formatRupiah(settlement.amount),
      creditor: settlement.to,
      phone: paymentInfo?.phone || '',
      ewallets: paymentInfo?.ewallets || [],
      bankName: paymentInfo?.bankName || '',
      bankAccount: paymentInfo?.bankAccount || '',
    })
    const url = buildWhatsAppUrl({ phone: debtorPhone, message })
    window.open(url, '_blank')
  }

  const ewalletLabel = hasEwallets
    ? paymentInfo.ewallets.map((e) => EWALLET_LABELS[e] || e).join(' / ')
    : null

  return (
    <div className={`bg-card rounded-xl px-3 py-3 ${settlement.paid ? 'opacity-50' : ''}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-semibold ${settlement.paid ? 'line-through text-gray-400' : 'text-white'}`}>
              {settlement.from} <span className="text-gray-500 font-normal">→</span> {settlement.to}
            </div>
            <div className={`text-base font-bold mt-0.5 ${settlement.paid ? 'line-through text-gray-500' : 'text-accent'}`}>
              {formatRupiah(settlement.amount)}
            </div>
          </div>
          <span className="text-gray-500 text-xs ml-3">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && !settlement.paid && (
        <div className="mt-3">
          {hasAnyInfo ? (
            <div className="bg-deep rounded-lg p-3 mb-3 space-y-2">
              {hasPhone && hasEwallets && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{ewalletLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium">{paymentInfo.phone}</span>
                    <button
                      onClick={() => copyText(paymentInfo.phone, 'Copied phone number!')}
                      className="bg-card text-accent text-xs px-2 py-1 rounded"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}
              {hasBank && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{paymentInfo.bankName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium">
                      {paymentInfo.bankAccount} a/n {settlement.to}
                    </span>
                    <button
                      onClick={() => copyText(paymentInfo.bankAccount, 'Copied account number!')}
                      className="bg-card text-accent text-xs px-2 py-1 rounded"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}
              {copiedMsg && (
                <div className="text-center text-xs text-green-400 py-1">{copiedMsg}</div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-xs mb-3">
              No payment info set for {settlement.to} — add it in Trip Settings
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => onMarkPaid(settlement.id)}
              className="bg-deep border border-gray-600 text-gray-300 text-xs px-3 py-2 rounded-lg"
            >
              Mark Paid
            </button>
            {debtorPhone && (
              <button
                onClick={handleRemind}
                className="flex-1 bg-green-600 text-white text-xs py-2 rounded-lg font-semibold"
              >
                📲 Remind via WA
              </button>
            )}
          </div>
        </div>
      )}

      {expanded && settlement.paid && (
        <div className="mt-2">
          <span className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg">✓ Paid</span>
        </div>
      )}
    </div>
  )
}

