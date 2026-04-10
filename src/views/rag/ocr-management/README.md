# OCR 任务管理功能说明

## 📋 功能概述

本次改造为PDF OCR系统添加了完整的任务管理能力，包括：
- ✅ 可中断的OCR任务
- ✅ 持久化的进度缓存（7天）
- ✅ 任务状态管理（processing/completed/failed/cancelled）
- ✅ 实时进度查询
- ✅ 前端可视化管理界面

## 🔧 后端改造

### 1. 核心组件

#### OcrTaskManager（任务管理器）
- 位置：`com.yliyun.ai.rag.service.ai.markdown.OcrTaskManager`
- 功能：
  - 注册正在执行的OCR任务
  - 支持取消任务（设置标志位 + 中断Future）
  - 查询任务状态
  - 线程安全（ConcurrentHashMap）

#### PdfOcrStatusEnum（状态枚举）
- 新增 `CANCELLED` 状态
- 更新 `isTerminal()` 方法，将CANCELLED视为终态

### 2. Service层改进

#### convertPdfToMarkdown（强制模式）
```java
// 关键改动点：
1. 注册任务到OcrTaskManager
2. 在OCR循环中检查取消标志
3. 被取消时更新ES和Redis状态为CANCELLED
4. finally块中清除任务记录
```

#### convertPdfToMarkdownSafe（安全模式）
- 同样的改进逻辑
- 额外保留了分布式锁机制

#### saveProgressToRedis（缓存策略）
```java
// 新策略：
- COMPLETED状态：立即清除Redis缓存
- PROCESSING/FAILED/CANCELLED状态：7天过期时间
```

#### clearOcrProgressCache（新增方法）
- 用于强制重置OCR任务
- 清除Redis缓存后可以重新启动

### 3. Controller层新增API

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 终止任务 | POST | `/rag/ai/pdf-ocr/cancel/{esId}` | 立即终止正在执行的OCR任务 |
| 清除缓存 | DELETE | `/rag/ai/pdf-ocr/progress/{esId}` | 清除Redis进度缓存（强制重置） |
| 统计信息 | GET | `/rag/ai/pdf-ocr/statistics` | 获取正在执行的任务数量 |
| 查询进度 | GET | `/rag/ai/pdf-ocr/progress/{esId}` | 查询OCR任务进度（已有） |

### 4. 使用示例

#### 终止OCR任务
```bash
curl -X POST http://localhost:48080/rag/ai/pdf-ocr/cancel/doc123
```

响应：
```json
{
  "code": 0,
  "data": true,  // true表示成功终止，false表示任务不存在或已完成
  "msg": "操作成功"
}
```

#### 清除缓存（强制重置）
```bash
curl -X DELETE http://localhost:48080/rag/ai/pdf-ocr/progress/doc123
```

#### 查询统计信息
```bash
curl http://localhost:48080/rag/ai/pdf-ocr/statistics
```

响应：
```json
{
  "code": 0,
  "data": {
    "runningTasks": 3,
    "timestamp": 1712736000000
  }
}
```

## 🎨 前端开发

### 1. 目录结构
```
src/views/rag/ocr-management/
├── index.vue                          # 主页面
└── components/
    └── OcrProgressCard.vue            # 进度展示组件
```

### 2. 主要功能

#### 主页面（index.vue）
- **统计卡片**：显示正在执行、今日完成、今日失败/取消的任务数
- **任务列表**：表格展示所有OCR任务
  - 文档ID、用户ID、状态、进度、页数、开始时间
  - 支持按文档ID和状态筛选
- **操作按钮**：
  - 终止：仅对processing状态的任务显示
  - 重置：对completed/failed/cancelled状态显示
  - 详情：查看详细信息
- **自动刷新**：每5秒自动刷新一次统计数据

#### 进度卡片（OcrProgressCard.vue）
- 展示单个任务的详细进度
- 进度条可视化
- 错误信息显示
- 终止/重新开始按钮

### 3. 路由配置

需要在路由文件中添加：
```typescript
{
  path: '/rag/ocr-management',
  name: 'OcrManagement',
  component: () => import('@/views/rag/ocr-management/index.vue'),
  meta: {
    title: 'OCR任务管理',
    icon: 'ep:document'
  }
}
```

## 📊 数据流程

### 正常流程
```
1. 用户启动OCR → Service创建异步任务
2. 注册到OcrTaskManager
3. 每处理一页更新ES和Redis
4. 完成后清除Redis缓存
5. 清除任务管理器记录
```

### 取消流程
```
1. 用户点击"终止" → 调用cancel API
2. OcrTaskManager设置取消标志
3. 下次循环检查发现已取消
4. 更新ES状态为CANCELLED
5. 更新Redis状态为CANCELLED（7天过期）
6. 清除任务管理器记录
7. 返回前端提示成功
```

## ⚠️ 注意事项

### 1. 任务取消的时机
- 取消标志只在每个页面处理完成后检查
- 如果某个页面OCR耗时很长，需要等待该页面完成才能取消
- 这是为了保证数据一致性，避免部分写入

### 2. Redis缓存策略
- **为什么COMPLETED要立即清除？**
  - 已完成的任务不需要再查询进度
  - 节省Redis空间
  - 历史数据可以从ES查询
  
- **为什么其他状态保留7天？**
  - 方便排查问题（失败/取消的原因）
  - 用户可以第二天继续查看进度
  - 7天后自动清理，避免无限增长

### 3. 强制重置的使用场景
- 任务状态异常（如卡在processing但实际已结束）
- 需要重新执行OCR（即使之前已完成）
- 测试环境清理数据

### 4. 日志记录
当前使用slf4j记录日志，关键日志前缀：
- `[PDF-OCR-FORCE]` - 强制模式
- `[PDF-OCR-SAFE]` - 安全模式
- `[OCR-TASK-MANAGER]` - 任务管理器
- `[CONTROLLER]` - 控制器层

**后续优化**：集成@LogRecord注解实现结构化日志，支持按userId+esId查询

## 🚀 后续优化建议

### 1. 结构化日志（高优先级）
- 集成mzt-biz-log框架
- 在关键方法添加@LogRecord注解
- 记录操作人、操作时间、操作结果
- 支持按条件查询历史记录

### 2. OCR历史记录查询（中优先级）
- 在ES中创建`yly-ocr-history`索引
- 记录每次OCR操作的完整信息
- 提供分页查询接口
- 支持按userId、esId、时间范围、状态筛选

### 3. WebSocket实时推送（低优先级）
- 替代轮询机制
- 实时推送进度更新
- 降低服务器压力

### 4. 批量操作（低优先级）
- 批量终止多个任务
- 批量重置任务
- 批量导出历史记录

## 📝 测试建议

### 1. 功能测试
- [ ] 启动OCR任务
- [ ] 查询进度
- [ ] 终止任务
- [ ] 清除缓存
- [ ] 重启任务

### 2. 边界测试
- [ ] 任务已完成时尝试终止
- [ ] 任务不存在时查询进度
- [ ] 并发启动同一文档的OCR
- [ ] Redis不可用时的降级处理

### 3. 性能测试
- [ ] 同时执行10个OCR任务
- [ ] 大文件（100页以上）的OCR
- [ ] 频繁查询进度的影响
- [ ] Redis缓存命中率

## 🎯 总结

本次改造完整实现了用户需求：
1. ✅ **可终止**：通过OcrTaskManager实现任务取消
2. ✅ **持久化**：未完成任务7天不过期
3. ✅ **可观测**：实时进度查询和统计
4. ✅ **前端UI**：完整的管理界面

下一步建议优先实现结构化日志和历史记录查询功能。
