import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, set } from 'firebase/database'
import { db } from '../firebase'
import { generateTripId } from '../utils/tripId'
import { useLocalTrips } from '../hooks/useLocalTrips'
import TripCard from '../components/TripCard'

export default function Home() {
  const navigate = useNavigate()
  const { trips, removeTrip } = useLocalTrips()
  const [tab, setTab] = useState('active')
  const [sheet, setSheet] = useState(null) // null | 'create' | 'join'

  const [tripName, setTripName] = useState('')
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

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
    try {
      const tripId = generateTripId()
      await set(ref(db, `trips/${tripId}`), {
        name: tripName.trim(),
        participants,
        createdAt: Date.now(),
      })
      navigate(`/trip/${tripId}/identity`)
    } finally {
      setLoading(false)
    }
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    navigate(`/trip/${code}/identity`)
  }

  function closeSheet() {
    setSheet(null)
    setTripName('')
    setParticipants([])
    setParticipantInput('')
    setJoinCode('')
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-accent font-extrabold text-xl">SplitTrip</h1>
          <p className="text-gray-500 text-xs">Split trip expenses easily</p>
        </div>
        <button
          onClick={() => setSheet('create')}
          className="bg-accent text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          + New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <div className="text-4xl">✈️</div>
          <p className="text-gray-400 text-sm">No trips yet.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setSheet('create')}
              className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Create Trip
            </button>
            <button
              onClick={() => setSheet('join')}
              className="bg-card text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Join Trip
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex bg-card rounded-xl p-1 mb-4">
            {['active', 'archived'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                  tab === t ? 'bg-accent text-white' : 'text-gray-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {trips.map((t) => (
              <TripCard
                key={t.tripId}
                tripId={t.tripId}
                name={t.name}
                lastVisited={t.lastVisited}
                onRemove={removeTrip}
                activeTab={tab}
              />
            ))}
          </div>
        </>
      )}

      {sheet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={closeSheet}>
          <div
            className="w-full bg-deep rounded-t-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex bg-card rounded-xl p-1 flex-1 mr-3">
                {['create', 'join'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSheet(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      sheet === t ? 'bg-accent text-white' : 'text-gray-400'
                    }`}
                  >
                    {t === 'create' ? 'Create' : 'Join'}
                  </button>
                ))}
              </div>
              <button onClick={closeSheet} className="text-gray-400 text-xl px-1">✕</button>
            </div>

            {sheet === 'create' && (
              <>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Trip Name</label>
                  <input
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="e.g. Bali Trip 2026"
                    className="w-full bg-card text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
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
                      className="flex-1 bg-card text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent"
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
                        <span key={p} className="bg-card text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
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
              </>
            )}

            {sheet === 'join' && (
              <>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Trip Code</label>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    className="w-full bg-card text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-1 ring-accent tracking-widest"
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
