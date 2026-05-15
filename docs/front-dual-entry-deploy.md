# 前端双入口部署说明

## 改造目标

- 同一套前端打包产物同时支持：
  - `http://192.168.250.103:8088`
  - `http://nas.ylicloud.com:8080`
- 前端接口统一使用相对路径
- 由 Nginx 按当前访问入口转发 `/admin-api`、`/app-api`
- 页面刷新时由 `try_files` 兜底，避免 history 路由 404

## 本次实现

1. `axios` 基础地址改为相对路径 `/admin-api`
2. 上传、WebSocket、Swagger、Druid、JmReport、Spring Boot Admin 等入口统一改为同源相对地址
3. `vite` 本地开发补充代理，保证 `pnpm dev` 与生产方案一致
4. 新增 `docs/nginx-dual-entry.conf` 作为部署参考
5. Nginx 额外透传 `X-Access-Entry`、`X-Forwarded-*`，后端如需识别内外网入口可直接读取，无需改前端业务代码

## 默认后端目标

当前配置按仓库现有 `.env.local` 推断后端地址为：

- `192.168.250.105:48080`

如果实际后端地址不同，只需要修改 `docs/nginx-dual-entry.conf` 里的 `upstream yly_search_admin_backend`。

## 部署步骤

1. 执行 `pnpm build:prod`
2. 将 `dist-prod/` 上传到 Nginx `root` 指向的目录
3. 将 `docs/nginx-dual-entry.conf` 合并到目标 Nginx 配置
4. 按实际环境修正：
   - `root`
   - `upstream yly_search_admin_backend`
5. 执行 `nginx -t`
6. 执行 `nginx -s reload`

## 验证步骤

1. 分别访问 `http://192.168.250.103:8088` 和 `http://nas.ylicloud.com:8080`
2. 打开浏览器 Network，确认接口请求前缀为 `/admin-api/...` 或 `/app-api/...`
3. 确认请求实际命中当前入口域名，而不是写死跳到另一个域名
4. 直接刷新任意业务路由，确认不会返回 404
5. 抽查上传、WebSocket、Swagger、报表页面是否仍可正常打开

## 注意事项

- `VITE_PROXY_TARGET` 仅用于本地 `vite` 开发代理，不参与生产打包
- `VITE_GOVIEW_URL`、`VITE_MALL_H5_DOMAIN` 仍保留为独立业务域名配置，本次未做拓扑调整
- 如果后端已有基于 `X-Forwarded-Host`、`X-Forwarded-Proto` 的识别逻辑，可直接复用；如需精确区分入口，可读取 `X-Access-Entry`
