import type { HealthChange, HealthSnapshot } from "../contracts/domain";

const requireFinite = (name: string, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
};

/** A Phaser-independent health value object. Damage orchestration belongs to DamageSystem. */
export class Health {
  private currentHealth: number;

  constructor(
    readonly maxHealth: number,
    initialHealth: number = maxHealth,
  ) {
    requireFinite("maxHealth", maxHealth);
    requireFinite("initialHealth", initialHealth);
    if (maxHealth <= 0) {
      throw new RangeError("maxHealth must be greater than zero");
    }
    this.currentHealth = this.clamp(initialHealth);
  }

  get current(): number {
    return this.currentHealth;
  }

  get snapshot(): HealthSnapshot {
    return {
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
    };
  }

  get isAlive(): boolean {
    return this.currentHealth > 0;
  }

  commitDamage(amount: number): HealthChange {
    requireFinite("damage", amount);
    if (amount < 0) {
      throw new RangeError("damage must not be negative");
    }

    const previousHealth = this.currentHealth;
    this.currentHealth = this.clamp(previousHealth - amount);

    return {
      previousHealth,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      appliedDamage: previousHealth - this.currentHealth,
    };
  }

  reset(health: number = this.maxHealth): HealthSnapshot {
    requireFinite("health", health);
    this.currentHealth = this.clamp(health);
    return this.snapshot;
  }

  private clamp(value: number): number {
    return Math.min(this.maxHealth, Math.max(0, value));
  }
}
