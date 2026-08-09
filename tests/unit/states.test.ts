import { describe, expect, it } from "vitest";

import {
  InvalidStateTransitionError,
  createEnemyStateMachine,
  createGameFlowStateMachine,
  createPlayerStateMachine,
} from "../../src/components/StateMachine";
import {
  ENEMY_STATE,
  GAME_FLOW_STATE,
  PLAYER_STATE,
} from "../../src/contracts/states";

describe("strict state machines", () => {
  it("accepts legal player transitions and treats same-state as a no-op", () => {
    const state = createPlayerStateMachine();
    expect(state.transition(PLAYER_STATE.IDLE)).toBe(false);
    expect(state.transition(PLAYER_STATE.JUMP)).toBe(true);
    expect(state.transition(PLAYER_STATE.FALL)).toBe(true);
    expect(state.state).toBe(PLAYER_STATE.FALL);
  });

  it("makes player and enemy dead states terminal", () => {
    const player = createPlayerStateMachine(PLAYER_STATE.DEAD);
    const enemy = createEnemyStateMachine(ENEMY_STATE.DEAD);
    expect(() => player.transition(PLAYER_STATE.IDLE)).toThrow(
      InvalidStateTransitionError,
    );
    expect(() => enemy.transition(ENEMY_STATE.PATROL)).toThrow(
      InvalidStateTransitionError,
    );
  });

  it("enforces the game flow transition table", () => {
    const flow = createGameFlowStateMachine();
    expect(() => flow.transition(GAME_FLOW_STATE.COMPLETED)).toThrow(
      "Invalid state transition: menu -> completed",
    );
    expect(flow.transition(GAME_FLOW_STATE.PLAYING)).toBe(true);
    expect(flow.transition(GAME_FLOW_STATE.PAUSED)).toBe(true);
    expect(flow.transition(GAME_FLOW_STATE.PLAYING)).toBe(true);
  });
});
