import type {
  GameEventMap,
  TypedEventBus,
  Unsubscribe,
} from "../contracts/events";

type Listener<Key extends keyof GameEventMap> = (
  payload: GameEventMap[Key],
) => void;
type StoredListener = (payload: never) => void;

export class GameEventBus implements TypedEventBus {
  private readonly listeners = new Map<
    keyof GameEventMap,
    Set<StoredListener>
  >();

  emit<Key extends keyof GameEventMap>(
    name: Key,
    payload: GameEventMap[Key],
  ): void {
    const listeners = this.listeners.get(name);
    if (!listeners) return;

    for (const listener of [...listeners]) {
      (listener as Listener<Key>)(payload);
    }
  }

  on<Key extends keyof GameEventMap>(
    name: Key,
    listener: Listener<Key>,
  ): Unsubscribe {
    const listeners = this.listeners.get(name) ?? new Set<StoredListener>();
    listeners.add(listener as StoredListener);
    this.listeners.set(name, listeners);

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      listeners.delete(listener as StoredListener);
      if (listeners.size === 0) this.listeners.delete(name);
    };
  }

  once<Key extends keyof GameEventMap>(
    name: Key,
    listener: Listener<Key>,
  ): Unsubscribe {
    let unsubscribe: Unsubscribe = () => undefined;
    unsubscribe = this.on(name, (payload) => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  clear(): void {
    this.listeners.clear();
  }
}
