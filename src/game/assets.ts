export const CHARACTER_TEXTURE = {
  PLAYER: "character-shadow-sprout",
  PATROL_ENEMY: "enemy-thorn-beetle",
  CHASE_ENEMY: "enemy-crystal-bat",
} as const;

export const CHARACTER_ASSET = {
  [CHARACTER_TEXTURE.PLAYER]: "/assets/characters/shadow-sprout.png",
  [CHARACTER_TEXTURE.PATROL_ENEMY]: "/assets/characters/thorn-beetle.png",
  [CHARACTER_TEXTURE.CHASE_ENEMY]: "/assets/characters/crystal-bat.png",
} as const;
