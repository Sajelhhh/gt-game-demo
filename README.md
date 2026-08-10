# Shadow Sprout

一个使用 Phaser、TypeScript 和 Vite 构建的轻量浏览器横版动作游戏 Demo。

已包含：

- 玩家移动、二段跳、土狼时间、输入缓冲和可变跳高
- J/X 近战攻击、双层冲击波、命中火花、敌人受击硬直、生命值和死亡
- 巡逻型与追击型敌人
- 平台、地刺、深坑、检查点和终点
- 开始、HUD、暂停、失败、通关和重新开始流程

操作：`A/D` 或方向键移动，`Space/W/↑` 二段跳，`J/X` 攻击，`Esc` 暂停，失败或通关后按 `R/Enter` 重新开始。

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

主角与两类小怪使用项目原创透明 PNG；关卡环境仍使用代码绘制的轻量几何素材，便于直接运行和调整。
