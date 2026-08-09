# Shadow Sprout

一个使用 Phaser、TypeScript 和 Vite 构建的轻量浏览器横版动作游戏 Demo。

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

当前工程包含集中配置、类型化事件、状态机和 `Boot → Menu → Game + UI` 的最小场景流程。关卡暂时使用代码绘制的几何占位，方便后续直接接入玩家、敌人和障碍玩法。
