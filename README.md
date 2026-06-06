# Robot Web Prototype

基于桌面文档 `Desktop/robot web/管理端方案设计.docx` 生成的可运行 Web 原型。项目覆盖文档中的管理端 P1 核心模块：

- 多模态知识库
- 患者档案管理
- 康复方案与运动处方
- 评估报告管理
- 机器人管理
- 首页概览

技术栈：

- TanStack Start
- React + TypeScript
- TanStack Router 文件路由
- TanStack Query
- shadcn/ui 风格组件
- Tailwind CSS
- MSW
- LocalStorage 持久化

当前 GitHub / Vercel 发布版本：`0.3.0`

## 项目结构

```text
src/
  routes/
    __root.tsx
    index.tsx
    knowledge.tsx
    patients.tsx
    prescriptions.tsx
    reports.tsx
    robots.tsx
  components/
    ui/
  lib/
  mocks/
    browser.ts
    handlers.ts
    data/
  index.css
public/
```

## 安装与启动

```bash
cd /Users/a1234/robot-web-prototype
npm install
npm run dev
```

默认地址：

```bash
http://localhost:3000
```

生产构建：

```bash
npm run build
npm run preview
```

## shadcn/ui 初始化

这个项目已经按 `components.json`、`tailwind.config.js`、`src/index.css` 的方式预配置好了。

如果你要继续通过 shadcn CLI 增补组件，执行：

```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog input tabs textarea
```

注意：

- `components.json` 已存在
- 组件默认放在 `src/components/ui/`
- 工具函数路径使用 `@/lib/utils`

## MSW 说明

- 仅开发环境启用
- 启动入口在 [src/client.tsx](/Users/a1234/robot-web-prototype/src/client.tsx:1)
- 处理器在 [src/mocks/handlers.ts](/Users/a1234/robot-web-prototype/src/mocks/handlers.ts:1)
- 种子数据在 `src/mocks/data/*.json`
- `public/mockServiceWorker.js` 已提交到仓库，拉取代码后无需再次执行 `msw init`

## 数据与持久化

- 初始数据源使用 5 份 JSON：
  - `knowledge.json`
  - `patients.json`
  - `care-path.json`
  - `robots.json`
  - `dashboard.json`
- 开发环境下通过 MSW 读取这些 JSON
- 首次加载后写入 LocalStorage
- 后续新增、编辑、导出等原型操作均持久化在浏览器本地
- 每个访问者的数据都只保存在自己的浏览器里，不会同步给其他访问者

## 环境变量

参考 [.env.example](/Users/a1234/robot-web-prototype/.env.example:1)

```bash
NODE_ENV=development
VITE_APP_TITLE=Robot Web Prototype
```

项目中通过 `NODE_ENV` 区分开发/生产环境，MSW 在生产环境自动禁用。

推荐 Node 版本：

```bash
>= 22.12.0 且 < 25
```

## 文档映射

本项目已读取并提炼以下需求来源：

- Word 正文模块说明
- 文档中的表格结构
- 原型图对应的页面顺序

当前页面结构已按桌面需求文件重组为 40 页面原型，包含：

- 首页概览
- 多模态知识库
  - 知识库问答
  - 康复知识库
  - 标准动作库
  - 动作序列库
  - 语音交互库
- 患者档案管理
  - 基础档案
  - 康复方案
  - 处方列表
  - 当前处方
  - 评估报告
- 标签管理
  - 康复知识标签库
  - 语音交互标签库
  - 标准动作标签库
  - 动作序列标签库
- 机器人管理
  - 机器人列表
  - 机器人详情

并补充了新增、修改、导出、审核、详情等二级子页面路由，用于完整还原原型页结构。

## 已知说明

- 当前项目为高保真原型，不接真实后端
- 富文本区域以多行文本编辑区代替
- 导出行为当前为原型级反馈，不生成真实文件内容
- 如果你希望继续扩展到医生端/护士端权限页，可以在当前路由结构上继续拆分

## Vercel Hobby 部署

这个仓库已经调整为适合 `Vercel Hobby` 免费版的公开演示部署：

- 构建命令：`npm run build`
- 输出目录：`dist/client`
- 生产环境不启用 MSW
- 固定路由会在构建时静态预渲染，适合直接公开分享链接

通过 GitHub 导入 Vercel 时：

1. 选择仓库 `Pantianci/robot-web`
2. Build Command 填 `npm run build`
3. Output Directory 填 `dist/client`
4. Install Command 填 `npm install`
5. 直接部署

部署完成后，`*.vercel.app` 生产链接默认是公开的。你把链接发给其他人，对方可以直接打开查看。
