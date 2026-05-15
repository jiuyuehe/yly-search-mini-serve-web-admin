# 全文搜索首页模块

## 模块入口

- 页面入口：`src/views/Home/Index.vue`
- 主页面：`src/views/Home/full-search/FullSearchPage.vue`
- 筛选面板：`SearchFilterPanel.vue`
- 结果列表：`SearchResultList.vue`
- 文件查看器：`SearchFileViewer.vue`
- 接口封装：`src/api/rag/search/index.ts`

## 接口清单

- `POST /rag/documents/search`：全文检索，使用 `multipart/form-data`，支持关键词、向量、混合、图片视觉。后端仍兼容旧 `searchMode=text` 的图片 OCR 搜索。
- `POST /rag/documents/aggregations/stats`：同条件聚合，当前首页用于文件类型数量标签。
- `GET /rag/documents/preview/meta`：按 `esId` 获取预览类型、MIME、文件名、路径等元信息。
- `GET /rag/documents/preview/content`：按 `esId` 返回文本、图片、PDF、视频的预览内容。
- `GET /rag/documents/download`：按 `esId` 单文件鉴权下载。
- `POST /rag/documents/download/batch`：按 `esIds` 批量鉴权打包下载 ZIP。

## 参数映射

前端筛选项集中映射到 `SearchParam`，其中 `fileCategory` 固定传 `nas`，暂不展示在 UI 中。已覆盖关键词、搜索类型、`precisionMode`、向量阈值、文件类型、扩展名、文件夹、历史版本、时间、大小、创建人、用户、组、分享、AI 标签、系统标签、标签、富化信息、分页参数。`searchMode`、`precision`、`scope` 属于旧参数，首页不再展示。

## 预览范围

初版在线查看支持文本、图片、PDF、视频。不支持的 Office、音频、压缩包列表等类型会降级展示基础信息和下载按钮，后续可在 `SearchFileViewer.vue` 中按 `previewType` 扩展。

## 权限说明

新下载和预览接口不使用旧的 `@PermitAll` 文件处理入口。后端会先按 `esId` 读取 ES 文档，再复用 NAS 可见路径范围校验，避免用户通过猜测或截获 `esId` 越权读取文件。

## 后续建议

- 接入 Office 文档在线预览或转换预览。
- 增加搜索条件保存、最近搜索、常用筛选模板。
- 搜索结果支持按相关度、更新时间、大小排序。
- 聚合维度扩展到标签、创建人、目录层级。
- 大文件视频预览建议增加 Range 支持，改善拖拽播放体验。
