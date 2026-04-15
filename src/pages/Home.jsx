import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, set } from 'firebase/database'
import { db } from '../firebase'
import { generateTripId } from '../utils/tripId'

export default function Home() {
  const [tab, setTab] = useState('create')
  const [tripName, setTripName] = useState('')
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function addParticipant() {
    const name = participantInput.trim()
    if (!name || participants.includes(name)) return
    setParticipants([...participants, name])
    setParticipantInput('')
  }

  function removeParticipant(name) {
    setParticipants(participants.filter((p) => p !== name))
  }

  async function handleCreate() {
    if (!tripName.trim() || participants.length < 2) return
    setLoading(true)
    const tripId = generateTripId()
    await set(ref(db, `trips/${tripId}`), {
      name: tripName.trim(),
      participants,
      createdAt: Date.now(),
    })
    navigate(`/trip/${tripId}/identity`)
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    navigate(`/trip/${code}/identity`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-2">✈️</div>
      <h1 className="text-accent font-extrabold text-2xl mb-1">TripSplit</h1>
      <p className="text-gray-400 text-sm mb-8">Split trip expenses easily</p>

      <div className="w-full max-w-sm">
        <div className="flex bg-card rounded-xl p-1 mb-5">
          {['create', 'join'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t ? 'bg-accent text-white' : 'text-gray-400'
              }`}
            >
              {t === 'create' ? 'Create Trip' : 'Join Trip'}
            </button>
          ))}
        </div>

        {tab === 'create' && (
          <div className="bg-card rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Trip Name</label>
              <input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g. Bali Trip 2026"
                className="w-full bg-deep text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Add Participants</label>
              <div className="flex gap-2">
                <input
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                  placeholder="Type a name, press Enter..."
                  className="flex-1 bg-deep text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
                />
                <button
                  onClick={addParticipant}
                  className="bg-accent text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
                >
                  Add
                </button>
              </div>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {participants.map((p) => (
                    <span key={p} className="bg-deep text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                      {p}
                      <button onClick={() => removeParticipant(p)} className="text-gray-400 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={!tripName.trim() || participants.length < 2 || loading}
              className="w-full bg-accent text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
            >
              {loading ? 'Creating...' : 'Create Trip →'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="bg-card rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Trip Code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                className="w-full bg-deep text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent tracking-widest"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="w-full bg-accent text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
            >
              Join Trip →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
