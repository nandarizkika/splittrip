import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTripArchive } from '../hooks/useTripArchive'

const ACTION_WIDTH = 160

export default function TripCard({ tripId, name, lastVisited, onRemove, activeTab }) {
  const navigate = useNavigate()
  const { archived, setArchived } = useTripArchive(tripId)
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(null)
  const startOffsetRef = useRef(0)

  if (activeTab === 'active' && archived) return null
  if (activeTab === 'archived' && !archived) return null

  const formattedDate = new Date(lastVisited).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  function onTouchStart(e) {
    startXRef.current = e.touches[0].clientX
    startOffsetRef.current = offsetX
    setDragging(true)
  }

  function onTouchMove(e) {
    if (startXRef.current === null) return
    const dx = e.touches[0].clientX - startXRef.current
    setOffsetX(Math.min(0, Math.max(-ACTION_WIDTH, startOffsetRef.current + dx)))
  }

  function onTouchEnd() {
    setDragging(false)
    startXRef.current = null
    setOffsetX(Math.abs(offsetX) >= ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0)
  }

  function close() {
    setOffsetX(0)
  }

  function handleCardClick() {
    if (offsetX !== 0) { close(); return }
    navigate(`/trip/${tripId}`)
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute right-0 top-0 h-full flex">
        {archived ? (
          <button
            onClick={() => { setArchived(false); close() }}
            className="bg-green-600 text-white text-xs font-semibold px-5 h-full"
          >
            Restore
          </button>
        ) : (
          <button
            onClick={() => { setArchived(true); close() }}
            className="bg-amber-500 text-white text-xs font-semibold px-5 h-full"
          >
            Archive
          </button>
        )}
        <button
          onClick={() => { onRemove(tripId); close() }}
          className="bg-red-600 text-white text-xs font-semibold px-5 h-full"
        >
          Remove
        </button>
      </div>

      <div
        className={`relative bg-card rounded-xl px-4 py-3 ${dragging ? '' : 'transition-transform duration-200'}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-semibold text-sm ${archived ? 'text-gray-500' : 'text-white'}`}>
              {name}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">{formattedDate}</div>
          </div>
          <span className="text-gray-500 text-sm">›</span>
        </div>
      </div>
    </div>
  )
}
