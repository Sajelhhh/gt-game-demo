export const COLLISION_LAYER = {
  WORLD: "World",
  HAZARD: "Hazard",
} as const;

export const PHYSICS_GROUP = {
  PLAYER: "Player",
  ENEMY: "Enemy",
  PLAYER_ATTACK: "PlayerAttack",
  ENEMY_ATTACK: "EnemyAttack",
} as const;

export type CollisionLayer =
  (typeof COLLISION_LAYER)[keyof typeof COLLISION_LAYER];
export type PhysicsGroup = (typeof PHYSICS_GROUP)[keyof typeof PHYSICS_GROUP];
export type CollisionTarget = CollisionLayer | PhysicsGroup;

export type CollisionRule = Readonly<{
  a: CollisionTarget;
  b: CollisionTarget;
  interaction: "collider" | "overlap";
}>;

export const COLLISION_MATRIX = [
  {
    a: COLLISION_LAYER.WORLD,
    b: PHYSICS_GROUP.PLAYER,
    interaction: "collider",
  },
  { a: COLLISION_LAYER.WORLD, b: PHYSICS_GROUP.ENEMY, interaction: "collider" },
  {
    a: COLLISION_LAYER.HAZARD,
    b: PHYSICS_GROUP.PLAYER,
    interaction: "overlap",
  },
  { a: PHYSICS_GROUP.PLAYER, b: PHYSICS_GROUP.ENEMY, interaction: "overlap" },
  {
    a: PHYSICS_GROUP.PLAYER_ATTACK,
    b: PHYSICS_GROUP.ENEMY,
    interaction: "overlap",
  },
  {
    a: PHYSICS_GROUP.ENEMY_ATTACK,
    b: PHYSICS_GROUP.PLAYER,
    interaction: "overlap",
  },
] as const satisfies readonly CollisionRule[];
