import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { usePaymentInfo } from '../hooks/usePaymentInfo'

const EWALLETS = [
  { key: 'gopay', label: 'GoPay' },
  { key: 'ovo', label: 'OVO' },
  { key: 'dana', label: 'Dana' },
  { key: 'shopeepay', label: 'ShopeePay' },
]

const EMPTY_FORM = { phone: '', ewallets: [], bankName: '', bankAccount: '' }

export default function TripSettings() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, addMember } = useTrip(tripId)
  const { paymentInfo, updatePaymentInfo } = usePaymentInfo(tripId)

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [expandedName, setExpandedName] = useState(null)
  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    const name = newName.trim()
    if (!name || (trip?.participants || []).includes(name)) return
    setAdding(true)
    try {
      await addMember(name)
      setNewName('')
    } finally {
      setAdding(false)
    }
  }

  function handleExpand(name) {
    if (expandedName === name) {
      setExpandedName(null)
      return
    }
    setExpandedName(name)
    const info = paymentInfo[name] || {}
    setFormValues({
      phone: info.phone || '',
      ewallets: info.ewallets || [],
      bankName: info.bankName || '',
      bankAccount: info.bankAccount || '',
    })
  }

  function toggleEwallet(key) {
    setFormValues((prev) => ({
      ...prev,
      ewallets: prev.ewallets.includes(key)
        ? prev.ewallets.filter((e) => e !== key)
        : [...prev.ewallets, key],
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updatePaymentInfo(expandedName, formValues)
      setExpandedName(null)
    } finally {
      setSaving(false)
    }
  }

  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
        <h1 className="text-white font-bold text-base">Trip Settings</h1>
      </div>

      <div className="bg-card rounded-xl p-4 mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">
          Members ({(trip.participants || []).length})
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {(trip.participants || []).map((name) => (
            <span key={name} className="bg-deep text-white text-xs px-3 py-1.5 rounded-full">{name}</span>
          ))}
        </div>
        <div className="border-t border-deep pt-4">
          <div className="text-xs text-gray-400 mb-2">Add new member</div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Type name..."
              className="flex-1 bg-deep text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 mb-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Payment Info</div>
        <div className="space-y-2">
          {(trip.participants || []).map((name) => (
            <div key={name}>
              <button
                onClick={() => handleExpand(name)}
                className="w-full flex items-center justify-between bg-deep rounded-xl px-3 py-2.5"
              >
                <span className="text-white text-sm">{name}</span>
                <span className="text-gray-400 text-xs">
                  {expandedName === name ? '▲ collapse' : paymentInfo[name] ? '▼ edit' : '▼ set info'}
                </span>
              </button>

              {expandedName === name && (
                <div className="bg-deep rounded-xl px-3 pt-0 pb-3 mt-0.5 space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Phone (for transfers)</label>
                    <input
                      value={formValues.phone}
                      onChange={(e) => setFormValues((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="08xxxxxxxxxx"
                      className="w-full bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block mb-2">E-wallets on this number</label>
                    <div className="flex flex-wrap gap-2">
                      {EWALLETS.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => toggleEwallet(key)}
                          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                            formValues.ewallets.includes(key)
                              ? 'bg-accent text-white'
                              : 'bg-card border border-deep text-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Bank</label>
                      <input
                        value={formValues.bankName}
                        onChange={(e) => setFormValues((p) => ({ ...p, bankName: e.target.value }))}
                        placeholder="BCA"
                        className="w-full bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
                      />
                    </div>
                    <div className="flex-2">
                      <label className="text-xs text-gray-400 block mb-1">Account number</label>
                      <input
                        value={formValues.bankAccount}
                        onChange={(e) => setFormValues((p) => ({ ...p, bankAccount: e.target.value }))}
                        placeholder="1234567890"
                        className="w-full bg-card text-white text-sm px-3 py-2 rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-accent text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Trip Code</div>
        <div className="text-accent font-mono font-bold text-2xl tracking-widest">{tripId}</div>
        <div className="text-gray-500 text-xs mt-1">Share this code so friends can join</div>
      </div>
    </div>
  )
}
