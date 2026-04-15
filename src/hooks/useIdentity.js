import { useState, useEffect } from 'react'

export function useIdentity(tripId) {
  const key = `tripsplit_identity_${tripId}`
  const [identity, setIdentityState] = useState(() => localStorage.getItem(key) || null)

  useEffect(() => {
    setIdentityState(localStorage.getItem(key) || null)
  }, [key])

  function setIdentity(name) {
    localStorage.setItem(key, name)
    setIdentityState(name)
  }

  return { identity, setIdentity }
}
