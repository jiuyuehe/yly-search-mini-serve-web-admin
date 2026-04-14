# AGENTS.md

本文件是当前仓库的仓库级开发规范，供 Codex 和其他代码代理直接遵守。

优先级说明：
- 用户当前回合的明确要求高于本文件。
- 若无更高优先级要求，后续分析、实现、重构、联调、补文档都必须遵守本文件。

## 1. 项目概况

- 技术栈：`Vue 3`、`TypeScript`、`Vite`、`Element Plus`、`Pinia`、`UnoCSS`、`Vue Router`、`vue-i18n`
- 包管理器：以 `pnpm` 为准，锁文件以 `pnpm-lock.yaml` 为主
- Node / pnpm 要求：`node >= 16.0.0`、`pnpm >= 8.6.0`
- 默认本地启动命令：`pnpm dev`
- 默认开发环境：`pnpm dev` 使用 `env.local` 模式
- 代码别名：统一使用 `@/` 指向 `src/`

## 2. 开发总原则

- 先看相邻模块，再动手写。优先复用当前仓库已经存在的页面结构、接口命名、弹窗模式和工具函数，不要凭空发明新写法。
- 新功能必须落到现有业务域下，不要随意新增顶级目录。现有主域包括：
  - `system`
  - `infra`
  - `bpm`
  - `pay`
  - `mp`
  - `member`
  - `mall`
  - `crm`
  - `erp`
  - `ai`
  - `iot`
  - `rag`
  - `nas`
  - `extends`
- 如果是当前项目的企业扩展功能，优先放在 `src/api/extends` 和 `src/views/extends`；如果是 NAS、RAG、IoT 相关功能，优先放在对应领域目录，而不是塞进 `system`。
- 不要引入新的请求库、状态库、UI 库、表单库，除非当前技术栈无法满足且用户明确同意。
- 不要把项目改成其他包管理器，也不要新增 `yarn.lock` 一类的混用痕迹。
- 不要手改构建产物、依赖目录、自动生成声明文件，除非该改动本身就是本次任务的一部分。

## 3. 必须遵守的工具与命令

优先使用以下命令：

```bash
pnpm install
pnpm dev
pnpm dev-server
pnpm ts:check
pnpm lint:eslint
pnpm lint:style
pnpm lint:format
pnpm build:local
pnpm build:dev
pnpm build:test
pnpm build:stage
pnpm build:prod
```

约束：
- 日常依赖安装、脚本执行统一使用 `pnpm`
- 修改业务代码后，至少执行与改动匹配的校验；默认优先执行 `pnpm ts:check`
- 改动样式或模板结构时，补充执行 `pnpm lint:style`
- 改动 TS / Vue 逻辑时，补充执行 `pnpm lint:eslint`
- 改动构建、依赖、环境变量或打包逻辑时，视情况补充执行对应 `build:*`

## 4. 代码格式与基础语法

项目当前格式约定来自 `.editorconfig`、`prettier.config.js`、`.eslintrc.js`、`stylelint.config.js`：

- 缩进：`2` 个空格
- 行宽：`100`
- 换行：`LF`
- 引号：单引号
- 分号：不写分号
- 尾逗号：不保留
- Vue SFC 默认使用：`<script setup lang="ts">`
- TypeScript 开启 `strict`

额外要求：
- 新增或修改 Vue 页面时，优先使用 `script setup`
- 页面、弹窗、复杂组件都要写 `defineOptions({ name: 'Xxx' })`，保证 `keep-alive`、调试和路由行为稳定
- 标识符、文件名、目录名使用英文；页面文案、注释允许中文
- 注释只写业务规则、兼容逻辑、隐式约束，不写废话注释
- 尽量保持与所在文件现有风格一致，不要在同一目录引入第二套风格

## 5. 自动导入与生成文件

项目已经配置了 `unplugin-auto-import` 和 `unplugin-vue-components`。

已自动导入的常见能力包括：
- `vue`
- `vue-router`
- `useI18n`
- `useMessage`
- `useTable`
- `useCrudSchemas`
- `DICT_TYPE`
- `required`

注意：
- 新代码中先确认某个符号是否已自动导入，避免重复 import
- 自动生成声明文件位于：
  - `src/types/auto-imports.d.ts`
  - `src/types/auto-components.d.ts`
- 这些文件原则上不手改，除非是在处理自动导入配置本身

## 6. 目录与落位规则

### 6.1 API 层

- 所有接口封装放在 `src/api/<domain>/...`
- 优先沿用现有命名：
  - `index.ts`
  - `types.ts`
  - 或资源名文件，如 `whitelist.ts`
- 接口层统一从 `@/config/axios` 引入 `request`
- 不要在业务页面直接使用原始 `axios`

接口命名优先沿用当前仓库模式：
- `getXxxPage`
- `getXxx`
- `createXxx`
- `updateXxx`
- `deleteXxx`
- `exportXxx`
- `getSimpleXxxList`

类型命名优先沿用当前仓库模式：
- `XxxVO`
- `XxxPageReqVO`
- `XxxSimpleVO`
- `XxxType`

重要：
- 当前 `request` 已经过一层统一封装，业务 API 一般直接返回业务数据本身
- 在页面层通常直接使用 `const data = await Api.getXxx()`，不要再写成 `data.data.data`

### 6.2 页面层

页面目录统一放在 `src/views/<domain>/<feature>/`

优先沿用以下结构：
- 列表页：`index.vue`
- 表单弹窗：`XxxForm.vue`
- 详情页：`XxxDetail.vue`
- 选择器 / 子表单 / 表格片段：`components/`

新增页面时：
- 先参考同域已有页面的目录组织方式
- 列表页和表单页默认放在同一目录下
- 同一页面拆出来的辅助组件，优先放到当前目录的 `components/`

### 6.3 公共能力

通用组件、钩子、工具函数分别放在：
- `src/components`
- `src/hooks/web`
- `src/utils`
- `types`

不要把明显可复用的能力继续堆进单个页面文件。

## 7. 页面写法规范

### 7.1 列表页默认模式

当前项目的大多数后台 CRUD 页都遵循下面的状态与方法命名：

- 列表状态：
  - `loading`
  - `list`
  - `total`
  - `exportLoading`
- 查询参数：
  - `queryParams`
  - 默认含 `pageNo`、`pageSize`
- 查询表单引用：
  - `queryFormRef`
- 常用方法：
  - `getList`
  - `handleQuery`
  - `resetQuery`
  - `handleCreate`
  - `handleDelete`
  - `handleExport`

推荐结构：
- 搜索区使用 `ContentWrap`
- 列表区使用 `ContentWrap`
- 分页统一使用 `Pagination`
- 表格默认使用 `el-table`
- 权限按钮使用 `v-hasPermi`

### 7.2 表单弹窗默认模式

表单弹窗优先复用项目内模式：

- 弹窗可优先使用项目封装的 `Dialog`
- 页面内自建对话框时，写法与同目录现有文件保持一致
- 常见状态命名：
  - `dialogVisible` / `formVisible`
  - `dialogTitle`
  - `formLoading`
  - `formType` / `formMode`
  - `formData` / `formModel`
  - `formRules`
  - `formRef`
- 对外暴露打开方法：
  - `defineExpose({ open })`
- 保存成功后：
  - 使用 `message.success(...)`
  - 通过 `emit('success')` 通知父页面刷新

### 7.3 异步处理

- 列表加载、详情加载、提交保存，优先使用 `try/finally` 管理 loading
- 不要把加载状态遗漏在异常分支
- 失败提示优先通过 `useMessage()`，不要在业务页到处散落原始 `ElMessage`

## 8. 组件复用优先级

新增页面时，优先复用现有公共组件，而不是重复封装：

- `ContentWrap`
- `Dialog`
- `Pagination`
- `DictTag`
- `Icon`
- `UploadFile`
- `Editor`
- `JsonEditor`
- `Search`
- `Table`
- `Form`

说明：
- 本仓库既存在直接写 `el-form + el-table` 的页面，也存在基于 `Form` / `Table` / `useCrudSchemas` 的结构化页面
- 选择哪一种，优先看当前业务域和相邻页面的现有模式
- 如果相邻页面都在直接使用 `el-form` / `el-table`，不要为了“抽象”强行改成 schema 风格
- 如果某一块已经明显依赖 `useCrudSchemas` 或 `Form` / `Table` 封装，则延续该模式

## 9. 权限、路由与菜单规范

### 9.1 权限

- 按钮、操作入口统一使用后端权限标识控制
- 模板内使用：

```vue
v-hasPermi="['module:resource:action']"
```

- JS 中判断权限使用：

```ts
checkPermi(['module:resource:action'])
```

- 权限标识要与后端模块保持一致，不要自行发明命名

### 9.2 路由

- 普通业务菜单路由由后端菜单动态生成
- 前端静态路由主要在 `src/router/modules/remaining.ts`
- 不要把普通业务页随意写死到 `remaining.ts`
- 只有以下场景才考虑加到静态路由：
  - 登录页
  - 错误页
  - 隐藏跳转页
  - 明确属于全局静态页的页面

### 9.3 组件路径与 keep-alive

- 后端菜单的 `component` 最终需要映射到 `src/views/**`
- 新页面路径要与后端菜单配置保持可解析关系
- 页面组件名、路由名必须稳定且唯一，否则会影响缓存和标签页行为

## 10. 字典、常量、国际化

- 有数据字典的场景优先使用：
  - `DICT_TYPE`
  - `getIntDictOptions`
  - `getStrDictOptions`
  - `dict-tag`
- 不要在模板里到处写魔法值和硬编码映射
- 通用成功/失败/确认文案优先复用国际化或现有公共文案
- 对于当前已大量使用中文文案的后台页面，优先保持同页风格一致，不强行半中半英
- 跨页面复用的业务枚举优先放到 `utils`、`types` 或所属 `api` 文件中

## 11. 样式规范

- 优先沿用现有的 `UnoCSS` 工具类写法处理间距、布局、字号
- 复杂样式再补 `scss`
- 遵守现有 `stylelint` 属性顺序
- 少写内联样式；确实是动态样式绑定时再用
- 样式要与当前后台风格一致，不要引入新的视觉体系

## 12. 请求、导出、上传约定

- 普通接口统一使用 `request.get/post/put/delete`
- 导出统一优先使用 `request.download` + `@/utils/download`
- 上传统一优先使用 `request.upload`
- 表单提交参数命名遵循：
  - 查询参数走 `params`
  - 新增/修改数据走 `data`
- 如果接口是分页列表，前端默认按照 `{ list, total }` 结构消费

## 13. 环境变量与配置

- 不要把地址、密钥、环境差异写死到代码里
- 环境差异走 `.env*` 和 `import.meta.env`
- 本地开发默认参考：
  - `.env.local`
  - `pnpm dev`
- 修改环境变量时，同时检查是否会影响：
  - `vite.config.ts`
  - `src/config/axios/config.ts`
  - 登录、租户、代理、构建路径等行为

## 14. 文档与联调检查

- 如果改动影响到跨模块流程、联调动作或验收步骤，需要同步补充 `docs/` 下的检查清单
- 当前仓库已有示例：
  - `docs/nas-page-checklist.md`
- 如果修改 NAS、RAG、扩展中心等跨模块流程，优先更新对应文档，而不是只改代码不留校验说明

## 15. 提交前最低自检要求

除非用户明确说不用验证，否则完成开发后至少要做这些事中的合适组合：

- 检查是否放对目录、命名是否符合当前域约定
- 检查权限标识是否与页面按钮、接口动作一致
- 检查列表页的搜索、重置、分页、刷新是否完整
- 检查表单的新增、编辑、回显、重置是否完整
- 检查 loading、禁用态、成功提示、失败提示是否完整
- 检查是否错误修改了静态路由、自动生成文件、构建产物
- 执行至少一个匹配改动的命令，默认优先：

```bash
pnpm ts:check
```

按改动补充：

```bash
pnpm lint:eslint
pnpm lint:style
pnpm build:local
```

## 16. 明确禁止的行为

- 禁止跳过相邻模块对照，直接写一套与仓库风格无关的新结构
- 禁止在业务页面直接裸用 `axios`
- 禁止普通业务页直接塞进 `src/router/modules/remaining.ts`
- 禁止无理由新增第三方依赖
- 禁止把权限文案、按钮显隐和后端权限字符串写乱
- 禁止把分页接口、导出接口、上传接口写成与当前封装不一致的调用方式
- 禁止手改 `dist/`、`node_modules/`、自动生成 d.ts 文件
- 禁止在没有必要的情况下同时引入多套表格/表单写法

## 17. Codex 执行建议

当 Codex 在本仓库内开发时，默认执行顺序应为：

1. 先定位所属业务域和相邻实现
2. 再决定文件落位与命名
3. 优先复用现有组件、hooks、utils、API 封装
4. 保持权限、路由、字典、导出方式与现有模式一致
5. 完成后执行最小必要校验，并在结果中说明是否已验证

如果本文件与当前目录下更细粒度的专项文档冲突，优先遵守用户要求，其次遵守更贴近该功能的专项文档，再遵守本文件。
