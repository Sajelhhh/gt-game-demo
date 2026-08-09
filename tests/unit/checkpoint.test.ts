import { describe, expect, it, vi } from "vitest";

import { GameEventBus } from "../../src/game/GameEventBus";
import { CheckpointSystem } from "../../src/systems/CheckpointSystem";

describe("CheckpointSystem", () => {
  it("uses spawn as fallback and emits only when checkpoint progress changes", () => {
    const bus = new GameEventBus();
    const reached = vi.fn();
    bus.on("checkpoint-reached", reached);
    const system = new CheckpointSystem(bus, { x: 40, y: 80 });
    const checkpoint = {
      id: "checkpoint-1",
      respawnPosition: { x: 500, y: 300 },
    } as const;

    expect(system.respawnPosition).toEqual({ x: 40, y: 80 });
    expect(system.reach("player", checkpoint, 120)).toBe(true);
    expect(system.reach("player", checkpoint, 140)).toBe(false);
    expect(system.checkpointId).toBe("checkpoint-1");
    expect(system.respawnPosition).toEqual({ x: 500, y: 300 });
    expect(reached).toHaveBeenCalledTimes(1);
    expect(reached).toHaveBeenCalledWith({
      playerId: "player",
      checkpointId: "checkpoint-1",
      previousCheckpointId: null,
      respawnPosition: { x: 500, y: 300 },
      reachedAtMs: 120,
    });

    system.reset();
    expect(system.checkpointId).toBeNull();
    expect(system.respawnPosition).toEqual({ x: 40, y: 80 });
  });
});
