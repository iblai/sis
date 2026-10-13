"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { createLoadGate, type LoadGate } from "@/lib/sis/gate";
import { cn } from "@/lib/utils";

const GateContext = createContext<LoadGate | null>(null);

/**
 * The loading screen until the page and every `useGateLoading` beneath it have
 * loaded, then never again (AGENTS.md rule 11). The children render invisibly
 * meanwhile, so every query fires at once; `inline` is the tab-panel variant.
 */
export function PageGate({
  loading = false,
  inline = false,
  children,
}: {
  /** The first-load flags of the queries the gating component issues itself. */
  loading?: boolean;
  /** Sized to a tab panel instead of the page. */
  inline?: boolean;
  children: ReactNode;
}) {
  const [gate] = useState(createLoadGate);
  const ready = useSyncExternalStore(gate.subscribe, gate.isReady, gate.isReady);
  useGateLoading(!ready);
  // After the children's layout effects, which report first.
  useLayoutEffect(() => gate.own(loading), [gate, loading]);
  return (
    <GateContext.Provider value={gate}>
      <div
        className={cn("relative", inline ? !ready && "min-h-48" : "flex min-h-0 flex-1 flex-col")}
      >
        <div className={cn(!inline && "flex min-h-0 flex-1 flex-col", !ready && "invisible")}>
          {children}
        </div>
        {ready ? null : <LoadingScreen className="absolute inset-0 z-10 min-h-0" />}
      </div>
    </GateContext.Provider>
  );
}

/** Reports a query's first-load flag to the nearest `PageGate`. */
export function useGateLoading(loading: boolean) {
  const gate = useContext(GateContext);
  const [id] = useState(() => Symbol("gate"));
  useLayoutEffect(() => {
    if (!gate) return;
    gate.report(id, loading);
    return () => gate.report(id, false);
  }, [gate, id, loading]);
}
