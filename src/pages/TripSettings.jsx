import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'

export default function TripSettings() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, addMember } = useTrip(tripId)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

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

      <div className="bg-card rounded-xl p-4">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Trip Code</div>
        <div className="text-accent font-mono font-bold text-2xl tracking-widest">{tripId}</div>
        <div className="text-gray-500 text-xs mt-1">Share this code so friends can join</div>
      </div>
    </div>
  )
}
