// Runtime state-machine imports use the component path; the contract module keeps
// backwards-compatible exports for the already-established scene foundation.
export {
  InvalidStateTransitionError,
  StrictStateMachine,
  createEnemyStateMachine,
  createGameFlowStateMachine,
  createPlayerStateMachine,
} from "../contracts/states";
