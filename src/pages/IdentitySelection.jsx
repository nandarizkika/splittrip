import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../hooks/useTrip'
import { useIdentity } from '../hooks/useIdentity'

export default function IdentitySelection() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const { trip, loading } = useTrip(tripId)
  const { identity, setIdentity } = useIdentity(tripId)

  useEffect(() => {
    if (identity) navigate(`/trip/${tripId}`, { replace: true })
  }, [identity, tripId, navigate])

  function pick(name) {
    setIdentity(name)
    navigate(`/trip/${tripId}`, { replace: true })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">Trip not found. Check the code and try again.</div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-2">👋</div>
      <h2 className="text-white font-bold text-xl mb-1">Who are you?</h2>
      <p className="text-gray-400 text-sm mb-1">Joining: <span className="text-accent font-semibold">{trip.name}</span></p>
      <p className="text-gray-500 text-xs mb-8">Pick your name — we'll remember it on this device</p>

      <div className="flex flex-wrap gap-3 justify-center max-w-sm">
        {(trip.participants || []).map((name) => (
          <button
            key={name}
            onClick={() => pick(name)}
            className="bg-card border border-deep text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-accent hover:border-accent transition-colors"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}
