# Gift Link Demo v3

一个交互式教育游戏，帮助儿童学习网络安全选择。

## 功能特性

- **视频背景系统**：根据孩子的情感状态动态切换16:9视频
- **聊天界面**：实时对话系统，支持自由输入和建议回复
- **游戏机制**：星星/X追踪系统，最多5轮
- **思考气泡**：显示孩子的内心想法
- **游戏结束逻辑**：成功或失败的结局动画

## 技术栈

- React 18
- TypeScript
- Vite
- CSS3 (动画和过渡效果)

## 安装

```bash
npm install
```

## 开发

```bash
npm run dev
```

应用将在 `http://localhost:5173` 运行。

## 构建

```bash
npm run build
```

## 项目结构

```
src/
  ├── components/          # React组件
  │   ├── VideoBackground.tsx    # 视频背景组件
  │   ├── ChatPanel.tsx          # 聊天面板组件
  │   ├── GoalBar.tsx            # 目标栏组件
  │   └── ThoughtBubble.tsx      # 思考气泡组件
  ├── types.ts            # TypeScript类型定义
  ├── App.tsx             # 主应用组件
  ├── main.tsx            # 入口文件
  └── index.css           # 全局样式
```

## 游戏规则

- **积极干预**（如劝阻点击危险链接）→ +1 ⭐
- **消极干预**（如鼓励点击）→ +1 ❌
- **3个星星** → 播放成功动画（kid_close.mp4）
- **3个X** → 播放失败动画（kid_open.mp4）
- **最多5轮**

## LLM集成

目前使用模拟的LLM响应。要集成真实的LLM API，请修改 `src/App.tsx` 中的 `callLLM` 函数。

LLM必须返回以下JSON格式：

```json
{
  "kid_reply": "孩子的回复文本",
  "emotion": "good" | "confused" | "sad" | "neutral",
  "thought": "思考气泡中的文本",
  "is_positive": true | false
}
```

## 视频资源

视频文件位于 `assets/animate/` 目录：

- `kid_base.mp4` - 默认/idle状态
- `kid_good.mp4` - 积极反应
- `kid_confused.mp4` - 困惑状态
- `kid_sad.mp4` - 悲伤状态
- `kid_open.mp4` - 失败结局
- `kid_close.mp4` - 成功结局

## 许可证

MIT
