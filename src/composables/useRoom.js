// composables/useRoom.js

export function useRoom(width = 600, height = 400) {
  const room = { width, height }
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max))
  return { room, clamp }
}
