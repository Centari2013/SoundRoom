export function useCanvasRenderer({ soundSources, ctxRef, selectedIndex, listener, room, clamp }) {
  const draw = () => {
    const ctx = ctxRef.value
    ctx.clearRect(0, 0, room.width, room.height)

    soundSources.value.forEach((src, i) => {
      if (src.instance) {
        const state = src.instance.state
        state.x = clamp(state.x, 0, room.width)
        state.y = clamp(state.y, 0, room.height)
        Object.assign(src, { x: state.x, y: state.y, angle: state.angle })
        src.instance.updateAudio()
        src.instance.draw()

        if (selectedIndex.value === i) {
          ctx.beginPath()
          ctx.arc(state.x, state.y, 14, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
    })

    listener.x = clamp(listener.x, 0, room.width)
    listener.y = clamp(listener.y, 0, room.height)
    listener.draw(ctx)
  }

  return { draw }
}
