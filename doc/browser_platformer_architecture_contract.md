# Shadow Sprout 公共架构契约（MVP）

> 状态：**Q0 冻结**
>
> 适用范围：MVP（`level-01`）
>
> 规范性：本文中的名称、字段、默认值、事件顺序和依赖规则均为实施契约。F-02 必须按本文建立严格 TypeScript 类型；后续任务不得另建同义常量或旁路接口。

## 1. 契约边界

Q0 只冻结设计，不在尚未建立的 TypeScript 工程中创建“可编译类型”。F-02 负责把本文逐项实现到下列文件，并为常量、状态转换和事件总线生命周期补充单元测试：

```text
src/
  contracts/
    domain.ts       # EntityId、向量、实体/伤害/攻击等领域类型
    events.ts       # GAME_EVENT、GameEventMap、TypedEventBus
    collision.ts    # COLLISION_LAYER、PHYSICS_GROUP、碰撞矩阵
    states.ts       # 状态常量、联合类型、合法转换
  game/
    config.ts       # GameConfig、DEFAULT_GAME_CONFIG
    GameEventBus.ts # TypedEventBus 的唯一运行时适配器
```

本文与主 SDD 冲突时，在 MVP 公共契约范围内以本文为准，并在同一变更中修正 SDD。玩法或公共契约变更必须先更新本文，再修改 TypeScript 实现和测试。

## 2. 依赖方向与所有权

### 2.1 允许的依赖方向

箭头表示“左侧可以 import 右侧”：

```text
main
  ├─> game/config + game/GameEventBus
  └─> scenes（组合根）
         ├─> entities ─> components + contracts + config + system interfaces
         ├─> systems  ─> components + contracts + config + TypedEventBus interface
         ├─> level    ─> contracts + config
         └─> ui       ─> contracts + config + TypedEventBus interface

components ─> contracts + config
contracts  ─> （无项目内依赖）
config     ─> contracts
```

强制规则：

- `main.ts` 创建配置、事件总线和 Scene，是唯一应用组合根。
- `GameScene` 只创建对象、注入依赖、注册 collider/overlap 和协调游戏流程，不实现移动、AI、扣血或 HUD 细节。
- `entities` 不得互相导入具体类。Player 不导入 Enemy，Enemy 不导入 Player；交互对象以 `EntityId`、领域接口或事件表示。
- `entities` 只能依赖 system 的接口，不能 new 或导入具体 system 实现。
- `systems` 不得导入 `Player`、`PatrolEnemy`、`ChaseEnemy`、Scene、UI 或 level 的具体实现。`DamageSystem` 只面向 `Damageable` 接口。
- `components`、`contracts`、`game/config.ts` 不依赖 Phaser。Phaser 类型只能留在 Scene、实体表现、level loader 或 `GameEventBus` 适配器边界。
- `ui` 通过事件读写游戏状态，不直接修改 Health、实体、Scene 物理状态或音频节点。
- 模块之间禁止循环 import。需要反向通知时使用 `TypedEventBus` 或由 Scene 注入的窄接口。

### 2.2 模块所有权

| 路径 | 唯一职责 | 实施 owner | 禁止承担 |
|---|---|---|---|
| `src/main.ts`、`src/game/` | 启动、依赖装配、集中配置、事件总线适配 | Foundation | 玩法规则、HUD、敌人 AI |
| `src/contracts/` | 公共名词、事件、碰撞语义、状态契约 | Lead 维护；F-02 首次实现 | Phaser 对象、可变运行时状态 |
| `src/scenes/` | 生命周期、对象装配、碰撞注册、流程切换 | Foundation / 集成任务 | 移动、伤害、AI 的具体规则 |
| `src/entities/Player.ts` | 玩家表现与组件组合 | Player | 敌人 AI、直接扣敌人血 |
| `src/entities/enemies/` | 对应敌人的表现与 AI 适配 | Enemy | 玩家输入、直接扣玩家血 |
| `src/systems/` | 按名称对应的单一领域规则 | 对应 feature owner | 具体实体类判断、Scene/UI 操作 |
| `src/components/` | 可复用、尽量纯 TypeScript 的状态容器 | 首个需求 owner，公共评审 | 资源加载、全局事件监听 |
| `src/level/` | Tilemap、出生点、检查点和终点数据 | Level | HUD、输入、生命值写入 |
| `src/ui/`、`UIScene` | HUD、菜单、暂停/失败/通关交互 | UI/Audio | 直接改变物理、AI 或实体组件 |

公共文件的变更由其实施 owner 提交，但必须同步本文；其他 feature owner 不得在自己的模块中复制公共常量。

## 3. `GameConfig` 契约

### 3.1 单位与可变性

- 距离为像素（字段后缀 `Px`），速度为 px/s，加速度为 px/s²，时间为毫秒（后缀 `Ms`），音量范围为 0～1。
- `DEFAULT_GAME_CONFIG` 在开发环境递归冻结，所有消费者只读访问。运行时不得修改配置。
- 调手感只改默认配置值；不得改用散落在 Scene、实体、system 或测试中的魔法数字。
- 测试覆盖值时创建深拷贝/fixture，不修改默认对象。

### 3.2 严格字段

F-02 实现的 `GameConfig` 必须与下列结构等价，不增加索引签名或 `any`：

```ts
interface GameConfig {
  readonly render: {
    readonly widthPx: 1280;
    readonly heightPx: 720;
    readonly backgroundColor: '#10131f';
    readonly pixelArt: true;
  };
  readonly physics: {
    readonly gravityY: 1200;
  };
  readonly input: {
    readonly left: readonly ['A', 'LEFT'];
    readonly right: readonly ['D', 'RIGHT'];
    readonly jump: readonly ['SPACE', 'W', 'UP'];
    readonly attack: readonly ['J', 'X'];
    readonly pause: readonly ['ESC'];
  };
  readonly player: {
    readonly maxHealth: 5;
    readonly moveSpeedPxPerSecond: 220;
    readonly accelerationPxPerSecondSquared: 1600;
    readonly groundDragPxPerSecondSquared: 1800;
    readonly jumpSpeedPxPerSecond: 430;
    readonly coyoteTimeMs: 100;
    readonly jumpBufferTimeMs: 100;
    readonly releasedJumpVelocityFactor: 0.5;
    readonly invulnerabilityMs: 800;
    readonly hurtControlLockMs: 180;
  };
  readonly combat: {
    readonly playerMelee: {
      readonly damage: 1;
      readonly cooldownMs: 350;
      readonly activeFrameStart: 2;
      readonly activeFrameEnd: 4;
      readonly hitboxOffsetXPx: 28;
      readonly hitboxWidthPx: 36;
      readonly hitboxHeightPx: 24;
      readonly knockbackXPxPerSecond: 180;
      readonly knockbackYPxPerSecond: 140;
    };
    readonly contactKnockbackXPxPerSecond: 160;
    readonly contactKnockbackYPxPerSecond: 120;
  };
  readonly enemies: {
    readonly patrol: {
      readonly maxHealth: 2;
      readonly moveSpeedPxPerSecond: 80;
      readonly contactDamage: 1;
    };
    readonly chase: {
      readonly maxHealth: 3;
      readonly moveSpeedPxPerSecond: 110;
      readonly detectionRangePx: 240;
      readonly disengageRangePx: 320;
      readonly contactDamage: 1;
      readonly attackRangePx: 48;
      readonly attackDamage: 1;
      readonly attackCooldownMs: 900;
      readonly activeFrameStart: 2;
      readonly activeFrameEnd: 3;
      readonly hitboxOffsetXPx: 24;
      readonly hitboxWidthPx: 32;
      readonly hitboxHeightPx: 24;
      readonly knockbackXPxPerSecond: 160;
      readonly knockbackYPxPerSecond: 100;
    };
  };
  readonly hazards: {
    readonly spikeDamage: 1;
    readonly pitDamage: 1;
    readonly pitResetMarginPx: 96;
  };
  readonly respawn: {
    readonly delayMs: 600;
  };
  readonly level: {
    readonly id: 'level-01';
    readonly targetDurationMinMs: 180000;
    readonly targetDurationMaxMs: 300000;
    readonly offscreenSleepMarginPx: 128;
  };
  readonly audio: {
    readonly musicEnabled: true;
    readonly soundEffectsEnabled: true;
    readonly musicVolume: 0.6;
    readonly soundEffectsVolume: 0.8;
  };
}
```

字面量值表示冻结的 MVP 默认值，不要求接口把字段限制成该字面量类型；实现可以使用 `number`、`string`、`boolean` 加 `satisfies GameConfig`，但字段名、层级和默认值必须一致。所有区间约束在配置构造测试中验证：音量与 `releasedJumpVelocityFactor` 为 0～1，时间/尺寸/伤害非负，`activeFrameStart <= activeFrameEnd`，追击脱离范围不小于感知范围。

## 4. 领域与状态契约

### 4.1 公共领域类型

```ts
type EntityId = string;
type EntityKind = 'player' | 'patrol-enemy' | 'chase-enemy';
type AttackKind = 'player-melee' | 'enemy-melee';
type DamageCause =
  | 'player-attack'
  | 'enemy-attack'
  | 'enemy-contact'
  | 'spike'
  | 'pit';
type HealthChangeCause = DamageCause | 'spawn' | 'respawn';
type Facing = 'left' | 'right';
type Vec2 = Readonly<{ x: number; y: number }>;
type HealthSnapshot = Readonly<{
  currentHealth: number;
  maxHealth: number;
}>;
type HealthChange = Readonly<{
  previousHealth: number;
  currentHealth: number;
  maxHealth: number;
  appliedDamage: number;
}>;

interface Damageable {
  readonly id: EntityId;
  readonly kind: EntityKind;
  readonly position: Vec2;
  getHealth(): HealthSnapshot;
  isAlive(): boolean;
  isInvulnerable(atMs: number): boolean;
  commitDamage(amount: number): HealthChange;
  grantInvulnerability(untilMs: number): void;
  applyKnockback(velocity: Vec2): void;
  enterDeadState(): void;
}
```

`Damageable` 是纯 TypeScript 领域 port，不 import `components/Health`；实体适配器把以上方法委托给自己的 Health、StateMachine 和 body。`Health` 只维护 `current`、`max` 和边界不变量，不识别 Phaser body，也不自行查找攻击者。业务调用只能通过 `DamageSystem.applyDamage()` 进入生命扣减；出生/重生的满血初始化由 DamageSystem 发 `health-changed`，但不发 `damage-applied`。治疗若在未来加入，使用独立方法和 cause，不把负伤害当治疗。

### 4.2 状态常量

F-02 使用 `as const` 对象派生联合类型，禁止 TypeScript numeric enum：

```ts
const PLAYER_STATE = {
  IDLE: 'idle', RUN: 'run', JUMP: 'jump', FALL: 'fall',
  ATTACK: 'attack', HURT: 'hurt', DEAD: 'dead',
} as const;

const ENEMY_STATE = {
  IDLE: 'idle', PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack',
  HURT: 'hurt', DEAD: 'dead',
} as const;

const GAME_FLOW_STATE = {
  MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused',
  FAILED: 'failed', COMPLETED: 'completed',
} as const;
```

状态机的 `transition(next)` 返回 `boolean`：合法转换提交并返回 `true`；同状态 no-op 并返回 `false`；表外转换抛出 `InvalidStateTransitionError`。不得借动画名推断规则状态。

### 4.3 合法状态转换

| 当前玩家状态 | 可进入 |
|---|---|
| `idle` | `run`、`jump`、`fall`、`attack`、`hurt`、`dead` |
| `run` | `idle`、`jump`、`fall`、`attack`、`hurt`、`dead` |
| `jump` | `fall`、`attack`、`hurt`、`dead` |
| `fall` | `idle`、`run`、`attack`、`hurt`、`dead` |
| `attack` | `idle`、`run`、`jump`、`fall`、`hurt`、`dead` |
| `hurt` | `idle`、`run`、`jump`、`fall`、`dead` |
| `dead` | 无；重生创建/重置为新的 `idle` 生命周期 |

`attack` 或 `hurt` 结束后由落地、水平输入和纵向速度组成的 locomotion resolver 选择 `idle/run/jump/fall`，不记录隐式“返回动画”。

| 当前敌人状态 | 可进入 |
|---|---|
| `idle` | `patrol`、`chase`、`hurt`、`dead` |
| `patrol` | `idle`、`chase`、`attack`、`hurt`、`dead` |
| `chase` | `idle`、`patrol`、`attack`、`hurt`、`dead` |
| `attack` | `idle`、`patrol`、`chase`、`hurt`、`dead` |
| `hurt` | `idle`、`patrol`、`chase`、`dead` |
| `dead` | 无；关卡重置时重建实体 |

| 当前流程状态 | 可进入 |
|---|---|
| `menu` | `playing` |
| `playing` | `paused`、`failed`、`completed` |
| `paused` | `playing` |
| `failed` | `playing`（处理 restart 后的新关卡生命周期） |
| `completed` | `playing`（处理 restart 后的新关卡生命周期） |

`GameScene` 独占流程状态。进入 `paused` 必须暂停物理、AI、动画驱动计时器和关卡计时；关卡 elapsed time 使用 Scene clock，因此不含暂停时长。进入 `completed` 后禁用移动和战斗输入。

## 5. 类型化事件契约

### 5.1 事件名与 payload

`GAME_EVENT` 是事件名唯一来源。payload 只含数据快照，不含 Phaser GameObject、Scene、component 或可变引用。

```ts
const GAME_EVENT = {
  HEALTH_CHANGED: 'health-changed',
  ATTACK_STARTED: 'attack-started',
  DAMAGE_APPLIED: 'damage-applied',
  ENTITY_DIED: 'entity-died',
  CHECKPOINT_REACHED: 'checkpoint-reached',
  LEVEL_COMPLETED: 'level-completed',
  PAUSE_CHANGED: 'pause-changed',
  RESTART_REQUESTED: 'restart-requested',
  AUDIO_SETTINGS_CHANGED: 'audio-settings-changed',
} as const;

interface GameEventMap {
  'health-changed': Readonly<{
    entityId: EntityId;
    entityKind: EntityKind;
    previousHealth: number;
    currentHealth: number;
    maxHealth: number;
    delta: number;
    cause: HealthChangeCause;
  }>;
  'attack-started': Readonly<{
    attackId: string;
    attackKind: AttackKind;
    attackerId: EntityId;
    attackerKind: EntityKind;
    facing: Facing;
    origin: Vec2;
    damage: number;
    startedAtMs: number;
  }>;
  'damage-applied': Readonly<{
    targetId: EntityId;
    targetKind: EntityKind;
    sourceId: EntityId | null;
    cause: DamageCause;
    attackId: string | null;
    amount: number;
    remainingHealth: number;
    knockbackVelocity: Vec2;
    appliedAtMs: number;
  }>;
  'entity-died': Readonly<{
    entityId: EntityId;
    entityKind: EntityKind;
    sourceId: EntityId | null;
    cause: DamageCause;
    position: Vec2;
    diedAtMs: number;
  }>;
  'checkpoint-reached': Readonly<{
    playerId: EntityId;
    checkpointId: string;
    previousCheckpointId: string | null;
    respawnPosition: Vec2;
    reachedAtMs: number;
  }>;
  'level-completed': Readonly<{
    levelId: string;
    playerId: EntityId;
    elapsedMs: number;
    defeatedEnemyCount: number;
    completedAtMs: number;
  }>;
  'pause-changed': Readonly<{
    paused: boolean;
    reason: 'keyboard' | 'ui' | 'system';
  }>;
  'restart-requested': Readonly<{
    mode: 'checkpoint' | 'level';
    reason: 'death' | 'user' | 'completion';
  }>;
  'audio-settings-changed': Readonly<{
    musicEnabled: boolean;
    soundEffectsEnabled: boolean;
    musicVolume: number;
    soundEffectsVolume: number;
  }>;
}
```

时间戳来自可暂停的 Scene clock，单位为 ms。`attackId` 在单次攻击生命周期内唯一；同一 `attackId + targetId` 最多成功伤害一次。

### 5.2 事件 owner 和顺序

| 事件 | 唯一 emitter | 主要 listener |
|---|---|---|
| `attack-started` | `CombatSystem`（冷却检查通过且状态进入 attack 后） | 实体表现、AudioSystem、统计 |
| `damage-applied` | `DamageSystem` | 表现、AudioSystem、统计 |
| `health-changed` | `DamageSystem`（包括出生/重生初始化） | HUD、实体表现 |
| `entity-died` | `DamageSystem` | GameScene、Checkpoint/统计、AudioSystem |
| `checkpoint-reached` | `CheckpointSystem` | GameScene、UI |
| `level-completed` | `GameScene`（终点 overlap 委托的流程转换成功后） | UIScene、AudioSystem |
| `pause-changed` | `GameScene`（流程转换成功后） | UIScene、AudioSystem |
| `restart-requested` | UIScene / 菜单交互层 | GameScene |
| `audio-settings-changed` | UIScene / 设置交互层 | AudioSystem、设置 UI |

成功伤害的固定原子顺序：校验 target 存活与无敌窗 → `Health` 提交新值 → 施加击退/无敌窗 → emit `damage-applied` → emit `health-changed` → 若为 0，状态转 `dead` 并 emit `entity-died`。被无敌窗、死亡状态或重复 attack-target 拒绝的伤害不发以上事件。出生/重生初始化发一次 `health-changed`，其 `previousHealth` 与 `currentHealth` 均为满血、`delta=0`、cause 分别为 `spawn`/`respawn`。

攻击只有在冷却通过时发一次 `attack-started`。攻击 hitbox 只在配置的闭区间 `[activeFrameStart, activeFrameEnd]` 启用，并在 attack 状态退出、Scene shutdown 或实体销毁时强制关闭。

重复触碰当前检查点不发 `checkpoint-reached`。终点只能把 `playing` 转为 `completed` 一次，因此每次关卡生命周期最多发一次 `level-completed`。

### 5.3 Event bus 生命周期

F-02 提供以下等价的严格接口；回调参数不能退化为 `unknown` 或 `any`：

```ts
type Unsubscribe = () => void;

interface TypedEventBus {
  emit<K extends keyof GameEventMap>(name: K, payload: GameEventMap[K]): void;
  on<K extends keyof GameEventMap>(
    name: K,
    listener: (payload: GameEventMap[K]) => void,
  ): Unsubscribe;
  once<K extends keyof GameEventMap>(
    name: K,
    listener: (payload: GameEventMap[K]) => void,
  ): Unsubscribe;
  clear(): void;
}
```

- 每个 Phaser Game 实例由 `main.ts` 创建一个 bus，不使用模块级全局 singleton。
- Scene 在 `create()` 注册监听，并把所有 unsubscribe 绑定到该 Scene 的 `SHUTDOWN`；实体/system 的监听绑定到其 `destroy/dispose`。
- 重启关卡先 shutdown 旧 GameScene 并完成退订，再创建新生命周期。Audio/UIScene 等长生命周期监听不得因关卡重启重复注册。
- 只有整个 Phaser Game 销毁时调用 `clear()`。普通关卡重启不得清掉其他活跃 Scene 的监听。
- emit 同步执行。listener 不得修改 payload；需要触发后续行为时发新事件或调用注入接口。

## 6. Arcade Physics 碰撞契约

### 6.1 名称常量

名称区分大小写，且分成两种语义：

```ts
const COLLISION_LAYER = {
  WORLD: 'World',
  HAZARD: 'Hazard',
} as const;

const PHYSICS_GROUP = {
  PLAYER: 'Player',
  ENEMY: 'Enemy',
  PLAYER_ATTACK: 'PlayerAttack',
  ENEMY_ATTACK: 'EnemyAttack',
} as const;
```

- `World`、`Hazard` 是大小写精确匹配的 Tilemap tile layers；检查点、终点等对象层使用各自 level 数据名，不复用这两个碰撞层常量。
- `Player`、`Enemy`、`PlayerAttack`、`EnemyAttack` 是 Scene 持有的 Arcade group/category 业务名称，用于集中注册 collider/overlap；它们不是引擎 bitmask。
- MVP 使用 Arcade Physics，禁止引入 Matter collision category、位掩码数字、`setCollisionCategory` 或 `setCollidesWith`。不得给以上字符串再定义数值别名。

### 6.2 集中碰撞矩阵

Scene 只能按下表注册交互；具体回调委托给 system。未列出的组合不注册：

| A | B | Arcade API | 结果 owner |
|---|---|---|---|
| `World` | `Player` | collider | Arcade 分离；Player 读取 grounded/body 结果 |
| `World` | `Enemy` | collider | Arcade 分离；Enemy AI 读取墙/地面结果 |
| `Hazard` | `Player` | overlap | DamageSystem（spike）或 CheckpointSystem（pit reset） |
| `Player` | `Enemy` | overlap | DamageSystem，cause=`enemy-contact` |
| `PlayerAttack` | `Enemy` | overlap | CombatSystem 去重后调用 DamageSystem |
| `EnemyAttack` | `Player` | overlap | CombatSystem 去重后调用 DamageSystem |

攻击 group 不与 `World` 碰撞，敌人默认不受 `Hazard` 伤害，Player/Enemy 之间不做实体分离。深坑触发 cause=`pit`：扣 1 点生命并把玩家移到当前检查点；若该次伤害使生命为 0，则进入失败流程而不执行存活重定位。地刺 cause=`spike`，使用玩家无敌窗避免连续扣血。

## 7. 已冻结的 MVP 行为决策

- 只支持桌面键盘；本阶段没有移动端、手柄、二段跳或冲刺。
- 玩家接触敌人造成 1 点伤害，来源与击退均进入 DamageSystem。
- 坠坑扣 1 点生命并回到最近检查点；无检查点时使用关卡出生点；致死时进入失败流程。
- 死亡界面的 restart 使用 `mode='checkpoint'`，重建运行时敌人/机关并从当前检查点开始；通关界面 restart 使用 `mode='level'`，清空进度并回初始出生点。
- 主角设定与最终美术不阻塞工程；MVP 只使用原创占位资产或已记录授权来源的素材。
- `World`/`Hazard` Tilemap 命名、事件名、状态值和配置字段均为序列化/协作边界，大小写或拼写变更属于破坏性契约变更。

## 8. F-02 实施验收清单

F-02 完成公共契约实现时必须验证：

1. `GameConfig` 严格类型、默认值和范围校验与第 3 节一致，代码库中没有对应魔法数字副本。
2. 每个事件名能推导出唯一 payload；错误 payload、未知事件名在 typecheck 中失败。
3. Event bus 的 `on/once/unsubscribe/clear` 和 Scene restart 无重复 listener 行为有单测。
4. 三个状态机只接受第 4 节转换，`dead` 终止和同状态 no-op 有单测。
5. 碰撞常量保持字符串语义，GameScene 注册与矩阵一致，无 Matter bitmask API。
6. `DamageSystem` 通过 `Damageable` 工作，systems 中没有具体 Player/Enemy import。
7. F-01/F-02 建立的 typecheck、lint、unit 和当时可运行的 E2E smoke 全部通过。

Q0 自身位于工程地基之前，因此本次门禁是 Markdown 一致性、无开放阻塞决策和 `git diff --check`；它不伪造尚不存在的编译、lint 或测试结果。
