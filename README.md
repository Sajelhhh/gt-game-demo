# Shadow Sprout

一个使用 Phaser、TypeScript 和 Vite 构建的轻量浏览器横版动作游戏 Demo。

已包含：

- 玩家移动、跳跃、土狼时间、输入缓冲和可变跳高
- J/X 近战攻击、生命值、受伤无敌和死亡
- 巡逻型与追击型敌人
- 平台、地刺、深坑、检查点和终点
- 开始、HUD、暂停、失败、通关和重新开始流程

操作：`A/D` 或方向键移动，`Space/W/↑` 跳跃，`J/X` 攻击，`Esc` 暂停，失败或通关后按 `R/Enter` 重新开始。

```bash
npm install
npm run dev
```

质量检查：

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

当前关卡使用代码绘制的几何占位素材，目标是保持 Demo 轻量、可直接运行和便于调整。
