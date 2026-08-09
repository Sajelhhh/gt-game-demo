import { describe, expect, it, vi } from "vitest";

import { GAME_EVENT } from "../../src/contracts/events";
import { GameEventBus } from "../../src/game/GameEventBus";

const pausePayload = { paused: true, reason: "keyboard" } as const;

describe("GameEventBus", () => {
  it("emits typed payloads synchronously and unsubscribes idempotently", () => {
    const bus = new GameEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.on(GAME_EVENT.PAUSE_CHANGED, listener);

    bus.emit(GAME_EVENT.PAUSE_CHANGED, pausePayload);
    unsubscribe();
    unsubscribe();
    bus.emit(GAME_EVENT.PAUSE_CHANGED, pausePayload);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(pausePayload);
  });

  it("supports once and clear without duplicate listeners after restart", () => {
    const bus = new GameEventBus();
    const once = vi.fn();
    const staleSceneListener = vi.fn();
    const unsubscribeScene = bus.on(
      GAME_EVENT.PAUSE_CHANGED,
      staleSceneListener,
    );
    bus.once(GAME_EVENT.PAUSE_CHANGED, once);

    bus.emit(GAME_EVENT.PAUSE_CHANGED, pausePayload);
    unsubscribeScene();
    const currentSceneListener = vi.fn();
    bus.on(GAME_EVENT.PAUSE_CHANGED, currentSceneListener);
    bus.emit(GAME_EVENT.PAUSE_CHANGED, { ...pausePayload, paused: false });
    bus.clear();
    bus.emit(GAME_EVENT.PAUSE_CHANGED, pausePayload);

    expect(once).toHaveBeenCalledOnce();
    expect(staleSceneListener).toHaveBeenCalledOnce();
    expect(currentSceneListener).toHaveBeenCalledOnce();
  });
});
