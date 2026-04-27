type Listener = () => void

const registry = new Map<string, Set<Listener>>()

export const emitter = {
  emit: (event: string) => {
    registry.get(event)?.forEach(fn => fn())
  },
  on: (event: string, fn: Listener): (() => void) => {
    if (!registry.has(event)) registry.set(event, new Set())
    registry.get(event)!.add(fn)
    return () => registry.get(event)?.delete(fn)
  },
}
