export function useIdentity(tripId) {
  const key = `tripsplit_identity_${tripId}`

  function getIdentity() {
    return localStorage.getItem(key) || null
  }

  function setIdentity(name) {
    localStorage.setItem(key, name)
  }

  return { identity: getIdentity(), setIdentity }
}
