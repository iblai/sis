/**
 * The latch behind `PageGate`: the owner's own first-load flag, a set of
 * pending reporters (the queries beneath the gate) and a ready state that,
 * once reached, never goes back — a row or a tab that mounts later must not
 * bring the loading screen back. Subscribers hear the one flip to ready.
 */
export function createLoadGate() {
  const pending = new Set<symbol>();
  const listeners = new Set<() => void>();
  let ownLoading = true;
  let ready = false;
  const settle = () => {
    if (ready || ownLoading || pending.size) return ready;
    ready = true;
    listeners.forEach((l) => l());
    return ready;
  };
  return {
    /** A reporter's first-load flag; a cleared or unmounted reporter leaves the set. */
    report(id: symbol, loading: boolean) {
      if (loading) pending.add(id);
      else pending.delete(id);
      settle();
    },
    /** The owner's own first-load flag, then a settle. */
    own(loading: boolean) {
      ownLoading = loading;
      settle();
    },
    isReady: () => ready,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get pending() {
      return pending.size;
    },
  };
}

export type LoadGate = ReturnType<typeof createLoadGate>;
