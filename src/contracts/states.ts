export const PLAYER_STATE = {
  IDLE: "idle",
  RUN: "run",
  JUMP: "jump",
  FALL: "fall",
  ATTACK: "attack",
  HURT: "hurt",
  DEAD: "dead",
} as const;

export const ENEMY_STATE = {
  IDLE: "idle",
  PATROL: "patrol",
  CHASE: "chase",
  ATTACK: "attack",
  HURT: "hurt",
  DEAD: "dead",
} as const;

export const GAME_FLOW_STATE = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  FAILED: "failed",
  COMPLETED: "completed",
} as const;

export type PlayerState = (typeof PLAYER_STATE)[keyof typeof PLAYER_STATE];
export type EnemyState = (typeof ENEMY_STATE)[keyof typeof ENEMY_STATE];
export type GameFlowState =
  (typeof GAME_FLOW_STATE)[keyof typeof GAME_FLOW_STATE];

export type StateTransitionTable<State extends string> = Readonly<
  Record<State, readonly State[]>
>;

export const PLAYER_STATE_TRANSITIONS = {
  idle: ["run", "jump", "fall", "attack", "hurt", "dead"],
  run: ["idle", "jump", "fall", "attack", "hurt", "dead"],
  jump: ["fall", "attack", "hurt", "dead"],
  fall: ["idle", "run", "attack", "hurt", "dead"],
  attack: ["idle", "run", "jump", "fall", "hurt", "dead"],
  hurt: ["idle", "run", "jump", "fall", "dead"],
  dead: [],
} as const satisfies StateTransitionTable<PlayerState>;

export const ENEMY_STATE_TRANSITIONS = {
  idle: ["patrol", "chase", "hurt", "dead"],
  patrol: ["idle", "chase", "attack", "hurt", "dead"],
  chase: ["idle", "patrol", "attack", "hurt", "dead"],
  attack: ["idle", "patrol", "chase", "hurt", "dead"],
  hurt: ["idle", "patrol", "chase", "dead"],
  dead: [],
} as const satisfies StateTransitionTable<EnemyState>;

export const GAME_FLOW_STATE_TRANSITIONS = {
  menu: ["playing"],
  playing: ["paused", "failed", "completed"],
  paused: ["playing"],
  failed: ["playing"],
  completed: ["playing"],
} as const satisfies StateTransitionTable<GameFlowState>;

export class InvalidStateTransitionError<State extends string> extends Error {
  constructor(
    readonly current: State,
    readonly next: State,
  ) {
    super(`Invalid state transition: ${current} -> ${next}`);
    this.name = "InvalidStateTransitionError";
  }
}

export class StrictStateMachine<State extends string> {
  constructor(
    private currentState: State,
    private readonly transitions: StateTransitionTable<State>,
  ) {}

  get state(): State {
    return this.currentState;
  }

  transition(next: State): boolean {
    if (next === this.currentState) {
      return false;
    }

    if (!this.transitions[this.currentState].includes(next)) {
      throw new InvalidStateTransitionError(this.currentState, next);
    }

    this.currentState = next;
    return true;
  }
}

export const createPlayerStateMachine = (
  initial: PlayerState = PLAYER_STATE.IDLE,
) => new StrictStateMachine(initial, PLAYER_STATE_TRANSITIONS);

export const createEnemyStateMachine = (
  initial: EnemyState = ENEMY_STATE.IDLE,
) => new StrictStateMachine(initial, ENEMY_STATE_TRANSITIONS);

export const createGameFlowStateMachine = (
  initial: GameFlowState = GAME_FLOW_STATE.MENU,
) => new StrictStateMachine(initial, GAME_FLOW_STATE_TRANSITIONS);
