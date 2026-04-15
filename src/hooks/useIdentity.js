import { useState } from 'react'

export function useIdentity(tripId) {
  const key = `tripsplit_identity_${tripId}`

  const [identity, setIdentityState] = useState(() => localStorage.getItem(key) || null)

  function setIdentity(name) {
    localStorage.setItem(key, name)
    setIdentityState(name)
  }

  return { identity, setIdentity }
}
