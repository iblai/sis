import { describe, expect, it, vi } from "vitest";
import { createLoadGate } from "@/lib/sis/gate";

describe("createLoadGate", () => {
  it("waits for the owner and for every reporter", () => {
    const gate = createLoadGate();
    const a = Symbol("a");
    const b = Symbol("b");
    gate.report(a, true);
    gate.report(b, true);
    gate.own(false);
    expect(gate.isReady()).toBe(false);
    gate.report(a, false);
    expect(gate.pending).toBe(1);
    expect(gate.isReady()).toBe(false);
    gate.report(b, false);
    expect(gate.isReady()).toBe(true);
  });

  it("waits for the owner even with nothing reported", () => {
    const gate = createLoadGate();
    expect(gate.isReady()).toBe(false);
    gate.own(false);
    expect(gate.isReady()).toBe(true);
  });

  it("latches: a reporter that mounts later does not reopen it", () => {
    const gate = createLoadGate();
    gate.own(false);
    gate.report(Symbol("late"), true);
    gate.own(true);
    expect(gate.pending).toBe(1);
    expect(gate.isReady()).toBe(true);
  });

  it("notifies subscribers once, on the flip, and lets them leave", () => {
    const gate = createLoadGate();
    const listener = vi.fn<() => void>();
    const unsubscribe = gate.subscribe(listener);
    const a = Symbol("a");
    gate.report(a, true);
    gate.own(false);
    expect(listener).not.toHaveBeenCalled();
    gate.report(a, false);
    gate.report(a, false);
    gate.own(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(gate.pending).toBe(0);
  });
});
