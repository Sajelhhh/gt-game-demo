import type { EntityId, Vec2 } from "../contracts/domain";
import { GAME_EVENT, type TypedEventBus } from "../contracts/events";

export type Checkpoint = Readonly<{
  id: string;
  respawnPosition: Vec2;
}>;

/** Owns checkpoint progress without depending on Phaser or a scene lifecycle. */
export class CheckpointSystem {
  private activeCheckpoint: Checkpoint | null = null;

  constructor(
    private readonly eventBus: TypedEventBus,
    private readonly initialSpawn: Vec2,
  ) {
    this.validatePosition(initialSpawn, "initial spawn");
  }

  get checkpointId(): string | null {
    return this.activeCheckpoint?.id ?? null;
  }

  get respawnPosition(): Vec2 {
    const position =
      this.activeCheckpoint?.respawnPosition ?? this.initialSpawn;
    return { ...position };
  }

  reach(
    playerId: EntityId,
    checkpoint: Checkpoint,
    reachedAtMs: number,
  ): boolean {
    if (checkpoint.id.length === 0) {
      throw new TypeError("checkpoint id must not be empty");
    }
    this.validatePosition(checkpoint.respawnPosition, "checkpoint respawn");
    if (!Number.isFinite(reachedAtMs)) {
      throw new RangeError("reachedAtMs must be finite");
    }
    if (this.activeCheckpoint?.id === checkpoint.id) return false;

    const previousCheckpointId = this.activeCheckpoint?.id ?? null;
    this.activeCheckpoint = {
      id: checkpoint.id,
      respawnPosition: { ...checkpoint.respawnPosition },
    };
    this.eventBus.emit(GAME_EVENT.CHECKPOINT_REACHED, {
      playerId,
      checkpointId: checkpoint.id,
      previousCheckpointId,
      respawnPosition: { ...checkpoint.respawnPosition },
      reachedAtMs,
    });
    return true;
  }

  reset(): void {
    this.activeCheckpoint = null;
  }

  private validatePosition(position: Vec2, label: string): void {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new RangeError(`${label} position must be finite`);
    }
  }
}
