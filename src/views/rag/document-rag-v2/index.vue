<template>
  <div class="rag-document-v2">
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="hero-kicker">Document Intelligence Studio</p>
        <h1>文档 RAG V2 控制台</h1>
        <p class="hero-desc">
          一页覆盖会话、索引、状态检查、V2 问答、兼容 RAG 流式入口与工具说明，直接对齐
          `DOCUMENT_RAG_V2_GUIDE.md` 与后端真实控制器。
        </p>
        <div class="hero-chips">
          <span class="hero-chip">会话管理</span>
          <span class="hero-chip">向量化 V1 / V2</span>
          <span class="hero-chip">状态检查</span>
          <span class="hero-chip">3 条 SSE 问答链路</span>
          <span class="hero-chip">Retrieval / Tools 可视化</span>
        </div>
      </div>
      <div class="hero-actions">
        <div class="hero-stat">
          <span class="hero-stat-label">当前用户</span>
          <strong>{{ currentUserId || '--' }}</strong>
        </div>
        <div class="hero-stat">
          <span class="hero-stat-label">活动会话</span>
          <strong>{{ activeSession?.id || '--' }}</strong>
        </div>
        <div class="hero-stat">
          <span class="hero-stat-label">当前文档</span>
          <strong>{{ documentState.esId || '--' }}</strong>
        </div>
        <div class="hero-buttons">
          <el-button type="primary" @click="openDebugDrawer">
            <Icon icon="ep:monitor" class="mr-6px" />
            调试视图
          </el-button>
          <el-button @click="bootstrapPage">
            <Icon icon="ep:refresh" class="mr-6px" />
            刷新工作台
          </el-button>
        </div>
      </div>
    </section>

    <div class="rag-grid">
      <ContentWrap class="panel-card session-panel">
        <template #header>
          <div class="panel-heading">
            <div>
              <h3>会话工作台</h3>
              <p>创建、筛选、刷新和维护当前文档的 RAG 会话</p>
            </div>
            <el-tag type="success" effect="dark">{{ sessionPage.total }} 会话</el-tag>
          </div>
        </template>

        <div class="document-entry">
          <div class="section-title">文档定位</div>
          <el-form label-position="top">
            <el-form-item label="文档 ES ID">
              <el-input
                v-model="documentState.esId"
                placeholder="例如：doc_1001"
                clearable
                @keyup.enter="refreshSessionPage"
              >
                <template #prepend>
                  <Icon icon="ep:document" />
                </template>
              </el-input>
            </el-form-item>
          </el-form>
          <div class="action-row">
            <el-button type="primary" @click="handleCreateSession">
              <Icon icon="ep:plus" class="mr-5px" />
              创建会话
            </el-button>
            <el-button @click="loadLatestSession">
              <Icon icon="ep:clock" class="mr-5px" />
              最近会话
            </el-button>
            <el-button @click="refreshSessionPage">
              <Icon icon="ep:list" class="mr-5px" />
              刷新列表
            </el-button>
          </div>
        </div>

        <el-collapse v-model="leftPanelCollapses">
          <el-collapse-item name="create">
            <template #title>
              <span class="collapse-title">创建参数</span>
            </template>
            <el-form label-position="top" :model="createSessionForm" class="dense-form">
              <el-form-item label="会话标题">
                <el-input v-model="createSessionForm.title" placeholder="不填则后端自动生成标题" />
              </el-form-item>
              <el-form-item label="聊天模型">
                <el-select
                  v-model="createSessionForm.modelId"
                  clearable
                  filterable
                  placeholder="默认使用角色或系统默认模型"
                >
                  <el-option
                    v-for="item in chatModels"
                    :key="item.id"
                    :label="buildModelOptionLabel(item)"
                    :value="item.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="角色 ID">
                <el-input-number v-model="createSessionForm.roleId" :min="1" class="!w-full" />
              </el-form-item>
              <div class="grid-two">
                <el-form-item label="Temperature">
                  <el-input-number
                    v-model="createSessionForm.temperature"
                    :min="0"
                    :max="2"
                    :step="0.1"
                    class="!w-full"
                  />
                </el-form-item>
                <el-form-item label="Max Tokens">
                  <el-input-number
                    v-model="createSessionForm.maxTokens"
                    :min="128"
                    :step="128"
                    class="!w-full"
                  />
                </el-form-item>
              </div>
              <el-form-item label="Max Contexts">
                <el-input-number
                  v-model="createSessionForm.maxContexts"
                  :min="1"
                  :step="1"
                  class="!w-full"
                />
              </el-form-item>
              <el-form-item label="User Prompt">
                <el-input
                  v-model="createSessionForm.userPrompt"
                  type="textarea"
                  :rows="3"
                  placeholder="用于给当前文档问答增加固定回答要求"
                />
              </el-form-item>
              <div class="switch-row">
                <el-switch v-model="createSessionForm.returnHistory" />
                <span>创建后返回历史</span>
                <el-switch v-model="createSessionForm.newSession" />
                <span>强制新会话</span>
              </div>
            </el-form>
          </el-collapse-item>
        </el-collapse>

        <div class="session-toolbar">
          <div class="section-title">会话列表</div>
          <div class="session-toolbar-actions">
            <el-button link type="primary" @click="refreshSimpleSessionList">
              <Icon icon="ep:collection" class="mr-4px" />
              刷新轻量列表
            </el-button>
            <el-button link type="danger" @click="handleClearSessions">
              <Icon icon="ep:delete" class="mr-4px" />
              清空当前文档会话
            </el-button>
          </div>
        </div>

        <div class="session-list">
          <button
            v-for="item in sessionPage.list"
            :key="item.id"
            class="session-item"
            :class="{ 'is-active': item.id === activeSession?.id }"
            @click="selectSession(item.id)"
          >
            <div class="session-item-head">
              <div class="session-item-title">
                <span>{{ item.title || `会话 #${item.id}` }}</span>
                <el-tag v-if="item.pinned" size="small" type="warning" effect="plain">置顶</el-tag>
              </div>
              <span class="session-item-time">
                {{ formatDate(item.lastActivityTime || item.updateTime || item.createTime) }}
              </span>
            </div>
            <div class="session-item-meta">
              <span>Session {{ item.id }}</span>
              <span>{{ item.model || '未指定模型' }}</span>
              <span>{{ item.esId || '--' }}</span>
            </div>
            <div class="session-item-actions" @click.stop>
              <el-button link type="primary" @click="promptRenameSession(item)">重命名</el-button>
              <el-button link type="warning" @click="togglePinSession(item)">
                {{ item.pinned ? '取消置顶' : '置顶' }}
              </el-button>
              <el-button link type="danger" @click="handleDeleteSession(item.id)">删除</el-button>
            </div>
          </button>
          <el-empty v-if="!sessionPage.list.length" description="当前筛选下暂无会话" :image-size="72" />
        </div>

        <div class="session-pager">
          <el-button
            :disabled="sessionQuery.pageNo <= 1"
            @click="changeSessionPage(sessionQuery.pageNo - 1)"
          >
            上一页
          </el-button>
          <span>第 {{ sessionQuery.pageNo }} 页 / 共 {{ sessionTotalPages }} 页</span>
          <el-button
            :disabled="sessionQuery.pageNo >= sessionTotalPages"
            @click="changeSessionPage(sessionQuery.pageNo + 1)"
          >
            下一页
          </el-button>
        </div>

        <div class="simple-session-shell">
          <div class="simple-session-head">
            <div class="section-title !mb-0">轻量会话快照</div>
            <el-tag size="small" effect="plain">{{ simpleSessionList.length }} 条</el-tag>
          </div>
          <div class="simple-session-copy">
            这里直接调用 `session/list`，用于对照分页接口之外的原始会话集合。
          </div>
          <div v-if="simpleSessionList.length" class="simple-session-list">
            <div v-for="item in simpleSessionList.slice(0, 6)" :key="item.id" class="simple-session-item">
              <strong>{{ item.title || `#${item.id}` }}</strong>
              <span>Session {{ item.id }}</span>
              <span>{{ item.esId || '--' }}</span>
            </div>
          </div>
          <el-empty v-else description="暂无轻量列表数据" :image-size="56" />
        </div>
      </ContentWrap>

      <ContentWrap class="panel-card studio-panel">
        <template #header>
          <div class="panel-heading">
            <div>
              <h3>流式问答台</h3>
              <p>支持 `stream-document-rag`、`stream-rag`、`stream-enhanced-rag` 三条流式入口</p>
            </div>
            <div class="endpoint-pill">
              {{ streamEndpointLabel }}
            </div>
          </div>
        </template>

        <div class="active-session-bar">
          <div class="active-session-card">
            <span class="active-label">当前会话</span>
            <strong>{{ activeSession?.title || '未选择会话' }}</strong>
            <span>Session {{ activeSession?.id || '--' }}</span>
          </div>
          <div class="active-session-card">
            <span class="active-label">当前文档</span>
            <strong>{{ documentState.esId || '--' }}</strong>
            <span>ES ID</span>
          </div>
          <div class="active-session-card">
            <span class="active-label">历史消息</span>
            <strong>{{ selectedHistory.length }}</strong>
            <span>已加载</span>
          </div>
        </div>

        <div class="message-stage">
          <el-scrollbar ref="messageScrollRef" class="message-scroll">
            <div class="message-timeline">
              <template v-if="messageTimeline.length">
                <div
                  v-for="item in messageTimeline"
                  :key="item.id"
                  class="message-bubble"
                  :class="[`role-${item.role}`, item.status ? `status-${item.status}` : '']"
                >
                  <div class="bubble-head">
                    <div class="bubble-title">
                      <span>{{ item.title }}</span>
                      <el-tag
                        v-if="item.status && item.status !== 'done'"
                        size="small"
                        :type="statusTagType(item.status)"
                        effect="plain"
                      >
                        {{ item.status }}
                      </el-tag>
                    </div>
                    <span class="bubble-time">{{ formatDate(item.time, 'HH:mm:ss') }}</span>
                  </div>

                  <div v-if="item.role === 'assistant'" class="bubble-body markdown-shell">
                    <MarkdownView :content="item.content || '...'" />
                  </div>
                  <div v-else class="bubble-body plain-shell">{{ item.content || '...' }}</div>

                  <div
                    v-if="item.retrievals?.length || item.references?.length"
                    class="bubble-retrieval-summary"
                  >
                    <el-tag v-if="item.retrievals?.length" size="small" effect="light">
                      retrievals {{ item.retrievals.length }}
                    </el-tag>
                    <el-tag v-if="item.references?.length" size="small" effect="light" type="success">
                      references {{ item.references.length }}
                    </el-tag>
                    <el-button link type="primary" @click="focusRetrievalTab">
                      查看引用面板
                    </el-button>
                  </div>

                  <div v-if="item.segmentRefs?.length" class="history-ref-bar">
                    <el-tag size="small" effect="plain">历史 refs {{ item.segmentRefs.length }}</el-tag>
                  </div>

                  <div
                    v-if="item.messageId && item.role !== 'system'"
                    class="bubble-actions"
                  >
                    <el-button link type="danger" @click="handleDeleteMessage(item.messageId)">
                      删除消息
                    </el-button>
                  </div>
                </div>
              </template>
              <el-empty
                v-else
                description="还没有消息。先创建会话，再通过右下方发送区发起文档问答。"
                :image-size="92"
              />
            </div>
          </el-scrollbar>
        </div>

        <div class="composer-shell">
          <div class="composer-head">
            <div class="section-title">发送区</div>
            <div class="composer-tools">
              <el-radio-group v-model="chatForm.endpoint" size="small">
                <el-radio-button label="stream-document-rag">V2</el-radio-button>
                <el-radio-button label="stream-rag">兼容 RAG</el-radio-button>
                <el-radio-button label="stream-enhanced-rag">增强 RAG</el-radio-button>
              </el-radio-group>
              <el-button link type="primary" @click="showAdvancedComposer = !showAdvancedComposer">
                {{ showAdvancedComposer ? '收起高级参数' : '展开高级参数' }}
              </el-button>
            </div>
          </div>

          <el-form label-position="top" class="composer-form">
            <el-form-item label="问题 / Prompt">
              <el-input
                v-model="chatForm.question"
                type="textarea"
                :rows="5"
                placeholder="例如：请帮我分三段总结这份文档的摘要内容"
                @keydown.enter.exact.prevent="handleSendQuestion"
              />
            </el-form-item>
          </el-form>

          <div v-if="showAdvancedComposer" class="advanced-composer">
            <template v-if="chatForm.endpoint === 'stream-document-rag'">
              <div class="grid-two">
                <el-form-item label="Mode">
                  <el-select v-model="chatForm.mode">
                    <el-option v-for="item in ragModes" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="Tool Mode">
                  <el-select v-model="chatForm.toolMode">
                    <el-option label="AUTO" value="AUTO" />
                    <el-option label="ON" value="ON" />
                    <el-option label="OFF" value="OFF" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="grid-two">
                <el-form-item label="Top K">
                  <el-input-number v-model="chatForm.topK" :min="1" :max="12" class="!w-full" />
                </el-form-item>
                <el-form-item label="Max Citations">
                  <el-input-number
                    v-model="chatForm.maxCitations"
                    :min="1"
                    :max="12"
                    class="!w-full"
                  />
                </el-form-item>
              </div>
              <el-form-item label="Target Lang">
                <el-input
                  v-model="chatForm.targetLang"
                  placeholder="翻译任务下可填：zh-CN / en-US / ja-JP"
                />
              </el-form-item>
            </template>

            <template v-else-if="chatForm.endpoint === 'stream-rag'">
              <div class="grid-two">
                <el-form-item label="Top K">
                  <el-input-number v-model="chatForm.topK" :min="1" :max="20" class="!w-full" />
                </el-form-item>
                <el-form-item label="Max Context Chars">
                  <el-input-number
                    v-model="chatForm.maxContextChars"
                    :min="500"
                    :step="500"
                    class="!w-full"
                  />
                </el-form-item>
              </div>
            </template>

            <template v-else>
              <div class="grid-two">
                <el-form-item label="Top K">
                  <el-input-number v-model="chatForm.topK" :min="1" :max="20" class="!w-full" />
                </el-form-item>
                <el-form-item label="Similarity Threshold">
                  <el-input-number
                    v-model="chatForm.similarityThreshold"
                    :min="0"
                    :max="1"
                    :step="0.05"
                    class="!w-full"
                  />
                </el-form-item>
              </div>
              <div class="grid-two">
                <el-form-item label="Max Context Chars">
                  <el-input-number
                    v-model="chatForm.maxContextChars"
                    :min="500"
                    :step="500"
                    class="!w-full"
                  />
                </el-form-item>
                <el-form-item label="Use Context">
                  <div class="inline-switch">
                    <el-switch v-model="chatForm.useContext" />
                  </div>
                </el-form-item>
              </div>
              <div class="switch-row compact">
                <el-switch v-model="chatForm.enableHybridSearch" />
                <span>Hybrid Search</span>
                <el-switch v-model="chatForm.enableQueryRewriting" />
                <span>Query Rewriting</span>
                <el-switch v-model="chatForm.enableReranking" />
                <span>Reranking</span>
              </div>
            </template>
          </div>

          <div class="composer-footer">
            <div class="switch-row compact">
              <el-switch v-model="chatForm.useContext" />
              <span>使用历史上下文</span>
              <el-tag size="small" effect="plain">Effective Mode {{ effectiveMode }}</el-tag>
            </div>
            <div class="action-row">
              <el-button type="primary" :loading="streaming" @click="handleSendQuestion">
                <Icon icon="ep:promotion" class="mr-5px" />
                发送流式问答
              </el-button>
              <el-button type="danger" plain :disabled="!streaming" @click="stopStreaming">
                <Icon icon="ep:video-pause" class="mr-5px" />
                停止流
              </el-button>
              <el-button @click="reloadActiveSession">
                <Icon icon="ep:refresh-right" class="mr-5px" />
                刷新历史
              </el-button>
            </div>
          </div>
        </div>
      </ContentWrap>

      <ContentWrap class="panel-card ops-panel">
        <template #header>
          <div class="panel-heading">
            <div>
              <h3>索引 / 引用 / 调试</h3>
              <p>右侧集中展示向量化、状态、Tools 说明、Retrieval 和调试数据</p>
            </div>
            <el-tag :type="statusColor(vectorStatus?.status)" effect="plain">
              {{ vectorStatus?.status || 'NO_STATUS' }}
            </el-tag>
          </div>
        </template>

        <el-tabs v-model="rightTab" class="ops-tabs">
          <el-tab-pane label="索引工作台" name="vector">
            <div class="section-title">向量化入口</div>
            <el-form label-position="top" class="dense-form">
              <el-form-item label="调用接口">
                <el-radio-group v-model="vectorForm.endpoint" size="small">
                  <el-radio-button label="vectorize-doc-v2">V2 推荐</el-radio-button>
                  <el-radio-button label="vectorize-doc">兼容 V1</el-radio-button>
                </el-radio-group>
              </el-form-item>

              <template v-if="vectorForm.endpoint === 'vectorize-doc-v2'">
                <el-form-item label="Embedding 模型">
                  <el-select
                    v-model="vectorForm.embeddingModelId"
                    clearable
                    filterable
                    placeholder="为空时使用默认 Embedding 模型"
                  >
                    <el-option
                      v-for="item in embeddingModels"
                      :key="item.id"
                      :label="buildModelOptionLabel(item)"
                      :value="item.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="Rerank 模型">
                  <el-select
                    v-model="vectorForm.rerankModelId"
                    clearable
                    filterable
                    placeholder="为空时使用当前 profile 或默认 Rerank 模型"
                  >
                    <el-option
                      v-for="item in rerankModels"
                      :key="item.id"
                      :label="buildModelOptionLabel(item)"
                      :value="item.id"
                    />
                  </el-select>
                </el-form-item>
                <div class="switch-row compact">
                  <el-switch v-model="vectorForm.forceReindex" />
                  <span>强制重建</span>
                  <el-switch v-model="vectorForm.overrideChunkPolicy" />
                  <span>手动覆盖 chunkPolicy</span>
                </div>
                <div v-if="vectorForm.overrideChunkPolicy" class="grid-two">
                  <el-form-item label="Base Chunk Tokens">
                    <el-input-number
                      v-model="vectorForm.chunkPolicy.baseChunkTokens"
                      :min="400"
                      :max="1200"
                      class="!w-full"
                    />
                  </el-form-item>
                  <el-form-item label="Overlap Tokens">
                    <el-input-number
                      v-model="vectorForm.chunkPolicy.overlapTokens"
                      :min="50"
                      :max="150"
                      class="!w-full"
                    />
                  </el-form-item>
                  <el-form-item label="Section Target Tokens">
                    <el-input-number
                      v-model="vectorForm.chunkPolicy.sectionTargetTokens"
                      :min="2500"
                      :max="4000"
                      class="!w-full"
                    />
                  </el-form-item>
                  <el-form-item label="Section Group Size">
                    <el-input-number
                      v-model="vectorForm.chunkPolicy.sectionGroupSize"
                      :min="3"
                      :max="5"
                      class="!w-full"
                    />
                  </el-form-item>
                </div>
              </template>

              <template v-else>
                <div class="switch-row compact">
                  <el-switch v-model="vectorForm.forceReprocess" />
                  <span>强制重新向量化</span>
                </div>
                <el-form-item label="Chunk Size (tokens)">
                  <el-input-number
                    v-model="vectorForm.chunkSize"
                    :min="200"
                    :step="100"
                    class="!w-full"
                  />
                </el-form-item>
              </template>

              <div class="action-row">
                <el-button type="primary" :loading="vectorLoading" @click="handleVectorize">
                  执行向量化
                </el-button>
                <el-button :loading="statusLoading" @click="handleCheckVectorStatus">
                  检查状态
                </el-button>
              </div>
            </el-form>

            <div class="status-card" v-if="vectorStatus">
              <div class="status-card-head">
                <strong>{{ vectorStatus.status || 'UNKNOWN' }}</strong>
                <span>{{ vectorStatus.statusMessage || '暂无状态说明' }}</span>
              </div>
              <div class="status-kpis">
                <div class="status-kpi">
                  <span>Chunk 总数</span>
                  <strong>{{ vectorStatus.chunkCount || 0 }}</strong>
                </div>
                <div class="status-kpi">
                  <span>Base Chunk</span>
                  <strong>{{ vectorStatus.baseChunkCount || 0 }}</strong>
                </div>
                <div class="status-kpi">
                  <span>Section Chunk</span>
                  <strong>{{ vectorStatus.sectionChunkCount || 0 }}</strong>
                </div>
                <div class="status-kpi">
                  <span>向量维度</span>
                  <strong>{{ vectorStatus.vectorDimension || 0 }}</strong>
                </div>
              </div>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="向量索引">
                  {{ vectorStatus.vectorIndexName || '--' }}
                </el-descriptions-item>
                <el-descriptions-item label="Embedding 模型">
                  {{ vectorStatus.embeddingModelId || '--' }}
                </el-descriptions-item>
                <el-descriptions-item label="Rerank 模型">
                  {{ vectorStatus.rerankModelId || '--' }}
                </el-descriptions-item>
                <el-descriptions-item label="文档字符数">
                  {{ vectorStatus.totalChars || '--' }}
                </el-descriptions-item>
                <el-descriptions-item label="Chunk Policy">
                  <pre class="json-block">{{ formatJson(vectorStatus.chunkPolicy) }}</pre>
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="response-note" v-if="vectorResult">
              <div class="section-title">最近一次向量化响应</div>
              <pre class="json-block">{{ formatJson(vectorResult) }}</pre>
            </div>
          </el-tab-pane>

          <el-tab-pane label="会话参数" name="session">
            <div v-if="activeSession">
              <div class="section-title">当前会话参数</div>
              <el-form label-position="top" class="dense-form" :model="sessionUpdateForm">
                <el-form-item label="聊天模型">
                  <el-select v-model="sessionUpdateForm.modelId" clearable filterable>
                    <el-option
                      v-for="item in chatModels"
                      :key="item.id"
                      :label="buildModelOptionLabel(item)"
                      :value="item.id"
                    />
                  </el-select>
                </el-form-item>
                <div class="grid-two">
                  <el-form-item label="Temperature">
                    <el-input-number
                      v-model="sessionUpdateForm.temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      class="!w-full"
                    />
                  </el-form-item>
                  <el-form-item label="Max Tokens">
                    <el-input-number
                      v-model="sessionUpdateForm.maxTokens"
                      :min="128"
                      :step="128"
                      class="!w-full"
                    />
                  </el-form-item>
                </div>
                <el-form-item label="Max Contexts">
                  <el-input-number
                    v-model="sessionUpdateForm.maxContexts"
                    :min="1"
                    :step="1"
                    class="!w-full"
                  />
                </el-form-item>
                <el-form-item label="User Prompt">
                  <el-input
                    v-model="sessionUpdateForm.userPrompt"
                    type="textarea"
                    :rows="4"
                    placeholder="会同步影响系统提示词 mergedSystem"
                  />
                </el-form-item>
                <div class="action-grid">
                  <el-button type="primary" @click="handleUpdateSessionParams">应用全部参数</el-button>
                  <el-button @click="handleUpdateSessionPrompt">只更新 Prompt</el-button>
                  <el-button @click="reloadActiveSession">刷新详情</el-button>
                  <el-button type="danger" plain @click="handleClearHistory">清空历史</el-button>
                </div>
              </el-form>
            </div>
            <el-empty v-else description="请先选择会话" :image-size="72" />
          </el-tab-pane>

          <el-tab-pane label="Tools / 引用" name="retrievals">
            <div class="section-title">Tools 说明</div>
            <div class="tools-banner">
              <div class="tool-logic">
                <strong>触发逻辑</strong>
                <p>
                  当前页面会根据 `toolMode` 与 `mode` 推断工具可用性。后端默认只在
                  `stream-document-rag` 的 `LOCATE` 模式下自动启用工具。
                </p>
              </div>
              <div class="tool-expected">
                <span class="tool-expected-label">本次请求预计可用工具</span>
                <div class="hero-chips">
                  <span v-for="tool in expectedTools" :key="tool.name" class="hero-chip">
                    {{ tool.name }}
                  </span>
                  <span v-if="!expectedTools.length" class="hero-chip muted">当前无工具调用</span>
                </div>
              </div>
            </div>

            <div class="tool-list">
              <div v-for="tool in toolCatalog" :key="tool.name" class="tool-card">
                <div class="tool-card-head">
                  <strong>{{ tool.name }}</strong>
                  <el-tag size="small" effect="plain">{{ tool.scope }}</el-tag>
                </div>
                <p>{{ tool.desc }}</p>
              </div>
            </div>

            <div class="section-title">最新 Retrievals</div>
            <div v-if="latestRetrievals.length" class="retrieval-list">
              <div v-for="item in latestRetrievals" :key="item.id" class="retrieval-card">
                <div class="retrieval-card-head">
                  <div>
                    <strong>{{ item.id }}</strong>
                    <p>{{ item.chunkLevel || '--' }} · {{ item.startOffset }} - {{ item.endOffset }}</p>
                  </div>
                  <div class="retrieval-signals">
                    <el-tag
                      v-for="signal in item.sourceSignals || []"
                      :key="signal"
                      size="small"
                      effect="plain"
                    >
                      {{ signal }}
                    </el-tag>
                  </div>
                </div>
                <div class="retrieval-preview">{{ item.preview || '暂无预览' }}</div>
                <pre class="json-inline">{{ formatJson(item.scoreDetail || {}) }}</pre>
              </div>
            </div>
            <el-empty v-else description="还没有 retrieval 数据，先发起一次问答" :image-size="72" />

            <div class="section-title">Legacy References</div>
            <div v-if="latestReferences.length" class="retrieval-list">
              <div v-for="item in latestReferences" :key="`${item.id}-${item.startOffset}`" class="retrieval-card">
                <div class="retrieval-card-head">
                  <div>
                    <strong>{{ item.id }}</strong>
                    <p>{{ item.type || '--' }} · {{ item.startOffset }} - {{ item.endOffset }}</p>
                  </div>
                  <el-tag size="small" effect="plain" type="success">
                    {{ item.score ?? '--' }}
                  </el-tag>
                </div>
                <div class="retrieval-preview">{{ item.preview || '暂无预览' }}</div>
              </div>
            </div>
            <el-empty v-else description="当前流式返回还没有 legacy references" :image-size="72" />

            <div class="section-title">Latest User Prompt</div>
            <pre class="json-block">{{ latestUserPrompt || '暂无 userPrompt' }}</pre>

            <div class="section-title">Merged System</div>
            <pre class="json-block">{{ latestMergedSystem || '暂无 mergedSystem' }}</pre>
          </el-tab-pane>

          <el-tab-pane label="调试" name="debug">
            <div class="section-title">最新请求载荷</div>
            <pre class="json-block">{{ formatJson(lastRequestPayload) }}</pre>
            <div class="section-title">事件流日志</div>
            <div class="event-log">
              <div v-for="item in streamLogs" :key="item.id" class="event-log-item">
                <div class="event-log-head">
                  <strong>{{ item.type }}</strong>
                  <span>{{ formatDate(item.time, 'HH:mm:ss') }}</span>
                </div>
                <pre class="json-inline">{{ formatJson(item.payload) }}</pre>
              </div>
              <el-empty v-if="!streamLogs.length" description="尚未产生流式事件" :image-size="72" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </ContentWrap>
    </div>

    <el-drawer v-model="debugDrawerVisible" title="Document RAG V2 调试视图" size="58%">
      <div class="drawer-grid">
        <div>
          <div class="section-title">最近请求</div>
          <pre class="json-block">{{ formatJson(lastRequestPayload) }}</pre>
        </div>
        <div>
          <div class="section-title">最近向量化响应</div>
          <pre class="json-block">{{ formatJson(vectorResult) }}</pre>
        </div>
        <div>
          <div class="section-title">当前状态</div>
          <pre class="json-block">{{ formatJson(vectorStatus) }}</pre>
        </div>
        <div>
          <div class="section-title">最新 Retrievals</div>
          <pre class="json-block">{{ formatJson(latestRetrievals) }}</pre>
        </div>
        <div>
          <div class="section-title">最新 References</div>
          <pre class="json-block">{{ formatJson(latestReferences) }}</pre>
        </div>
        <div>
          <div class="section-title">最新 User Prompt</div>
          <pre class="json-block">{{ formatJson(latestUserPrompt) }}</pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ElMessageBox } from 'element-plus'
import MarkdownView from '@/components/MarkdownView/index.vue'
import { ModelApi, ModelVO } from '@/api/ai/model/model'
import { useUserStore } from '@/store/modules/user'
import { AiModelTypeEnum } from '@/views/ai/utils/constants'
import {
  DocumentRagApi,
  DocumentRagAskReqVO,
  DocumentVectorizationReqV2,
  DocumentVectorizationRespVO,
  FileChatReferenceVO,
  RagChatMessageSimpleVO,
  RagChatSessionVO,
  RagEnhancedChatReqVO,
  RagFileChatMessageSendReqVO,
  RagStreamChunkVO,
  RetrievedChunkRespVO,
  VectorStatusRespVO
} from '@/api/rag/documentRag'

defineOptions({ name: 'RagDocumentRagV2' })

type StreamEndpoint = 'stream-document-rag' | 'stream-rag' | 'stream-enhanced-rag'
type VectorEndpoint = 'vectorize-doc-v2' | 'vectorize-doc'
type BubbleRole = 'user' | 'assistant' | 'system'
type BubbleStatus = 'streaming' | 'done' | 'error' | 'indexing'

interface UiBubble {
  id: string
  role: BubbleRole
  title: string
  content: string
  time: string
  status?: BubbleStatus
  messageId?: number
  references?: any[]
  retrievals?: RetrievedChunkRespVO[]
  segmentRefs?: RetrievedChunkRespVO[]
}

interface StreamLogItem {
  id: string
  type: string
  payload: any
  time: string
}

interface UiModelVO extends ModelVO {
  contextWindowTokens?: number
}

const message = useMessage()
const userStore = useUserStore()

const currentUserId = computed(() => userStore.getUser.id || 0)

const ragModes = [
  'AUTO',
  'LOCATE',
  'FACT_QA',
  'SUMMARY',
  'TRANSLATE',
  'THEME_COMPARE'
] as const

const toolCatalog = [
  {
    name: 'countExactMatches',
    scope: 'LOCATE',
    desc: '在全文里按精确短语统计出现次数，用于回答“出现几次”。'
  },
  {
    name: 'searchExactPhrase',
    scope: 'LOCATE',
    desc: '在索引中按 exact phrase 搜索命中的 chunk，用于原文定位兜底。'
  },
  {
    name: 'getChunkByIds',
    scope: 'LOCATE / FACT_QA',
    desc: '按 chunkId 回捞具体片段，方便二次补充上下文。'
  },
  {
    name: 'getNeighborChunks',
    scope: 'LOCATE / FACT_QA',
    desc: '围绕命中的 anchor chunk 拉取前后邻接片段，提升回答完整度。'
  },
  {
    name: 'loadOrderedSectionRange',
    scope: 'SUMMARY / THEME_COMPARE',
    desc: '按 section 顺序加载文档范围，适合摘要、主题归纳和章节比较。'
  }
]

const documentState = reactive({
  esId: ''
})

const createSessionForm = reactive({
  title: '',
  modelId: undefined as number | undefined,
  roleId: undefined as number | undefined,
  temperature: undefined as number | undefined,
  maxTokens: undefined as number | undefined,
  maxContexts: 6,
  userPrompt: '',
  returnHistory: true,
  newSession: true
})

const sessionUpdateForm = reactive({
  modelId: undefined as number | undefined,
  temperature: undefined as number | undefined,
  maxTokens: undefined as number | undefined,
  maxContexts: undefined as number | undefined,
  userPrompt: ''
})

const vectorForm = reactive({
  endpoint: 'vectorize-doc-v2' as VectorEndpoint,
  embeddingModelId: undefined as number | undefined,
  rerankModelId: undefined as number | undefined,
  forceReindex: false,
  overrideChunkPolicy: false,
  chunkPolicy: {
    baseChunkTokens: 800,
    overlapTokens: 96,
    sectionTargetTokens: 3200,
    sectionGroupSize: 4
  },
  forceReprocess: false,
  chunkSize: 2000
})

const chatForm = reactive({
  endpoint: 'stream-document-rag' as StreamEndpoint,
  question: '',
  useContext: true,
  mode: 'AUTO' as DocumentRagAskReqVO['mode'],
  targetLang: '',
  toolMode: 'AUTO' as DocumentRagAskReqVO['toolMode'],
  maxCitations: 8,
  topK: 8,
  maxContextChars: 8000,
  similarityThreshold: 0.7,
  enableHybridSearch: true,
  enableQueryRewriting: true,
  enableReranking: true
})

const sessionQuery = reactive({
  pageNo: 1,
  pageSize: 8
})

const sessionPage = reactive<PageResult<RagChatSessionVO[]>>({
  list: [],
  total: 0
})

const activeSession = ref<RagChatSessionVO>()
const selectedHistory = ref<RagChatMessageSimpleVO[]>([])
const messageTimeline = ref<UiBubble[]>([])
const streamLogs = ref<StreamLogItem[]>([])
const simpleSessionList = ref<RagChatSessionVO[]>([])

const chatModels = ref<UiModelVO[]>([])
const embeddingModels = ref<UiModelVO[]>([])
const rerankModels = ref<UiModelVO[]>([])

const vectorResult = ref<DocumentVectorizationRespVO>()
const vectorStatus = ref<VectorStatusRespVO>()
const latestMergedSystem = ref('')
const latestUserPrompt = ref('')
const latestReferences = ref<FileChatReferenceVO[]>([])
const latestRetrievals = ref<RetrievedChunkRespVO[]>([])
const lastRequestPayload = ref<any>(null)

const vectorLoading = ref(false)
const statusLoading = ref(false)
const streaming = ref(false)
const debugDrawerVisible = ref(false)
const leftPanelCollapses = ref(['create'])
const rightTab = ref('vector')
const showAdvancedComposer = ref(true)
const messageScrollRef = ref()
const activeAssistantBubbleId = ref<string>()
const streamController = ref<AbortController>()

const sessionTotalPages = computed(() => {
  const total = sessionPage.total || 0
  return Math.max(1, Math.ceil(total / sessionQuery.pageSize))
})

const streamEndpointLabel = computed(() => {
  if (chatForm.endpoint === 'stream-document-rag') {
    return 'V2 主入口'
  }
  if (chatForm.endpoint === 'stream-enhanced-rag') {
    return '增强兼容入口'
  }
  return '兼容 RAG 入口'
})

const effectiveMode = computed(() => {
  if (chatForm.endpoint !== 'stream-document-rag') {
    return 'COMPAT'
  }
  if (chatForm.mode !== 'AUTO') {
    return chatForm.mode
  }
  const q = chatForm.question.toLowerCase()
  if (q.includes('翻译') || q.includes('translate')) return 'TRANSLATE'
  if (
    q.includes('总结') ||
    q.includes('摘要') ||
    q.includes('概括') ||
    q.includes('summarize') ||
    q.includes('summary')
  ) {
    return 'SUMMARY'
  }
  if (
    q.includes('出现') ||
    q.includes('多少次') ||
    q.includes('哪些地方') ||
    q.includes('在哪') ||
    q.includes('where') ||
    q.includes('how many times')
  ) {
    return 'LOCATE'
  }
  if (
    q.includes('主题') &&
    (q.includes('类似') || q.includes('相似') || q.includes('compare') || q.includes('similar'))
  ) {
    return 'THEME_COMPARE'
  }
  return 'FACT_QA'
})

const expectedTools = computed(() => {
  if (chatForm.endpoint !== 'stream-document-rag') {
    return []
  }
  if (chatForm.toolMode === 'OFF') {
    return []
  }
  if (chatForm.toolMode === 'ON') {
    return toolCatalog
  }
  return effectiveMode.value === 'LOCATE' ? toolCatalog : []
})

const openDebugDrawer = () => {
  debugDrawerVisible.value = true
}

const statusTagType = (status?: BubbleStatus) => {
  if (status === 'streaming') return 'primary'
  if (status === 'error') return 'danger'
  if (status === 'indexing') return 'warning'
  return 'success'
}

const statusColor = (status?: string) => {
  if (!status) return 'info'
  if (['READY', 'COMPLETED', 'SUCCESS', 'ALREADY_PROCESSED'].includes(status)) return 'success'
  if (['PROCESSING', 'PENDING'].includes(status)) return 'warning'
  if (['FAILED'].includes(status)) return 'danger'
  return 'info'
}

const formatDate = (value?: string, pattern = 'YYYY-MM-DD HH:mm:ss') => {
  if (!value) return '--'
  return dayjs(value).format(pattern)
}

const buildModelOptionLabel = (item: UiModelVO) => {
  const parts = [item.name || item.model, item.platform]
  if (item.contextWindowTokens) {
    parts.push(`${item.contextWindowTokens} ctx`)
  }
  return parts.filter(Boolean).join(' · ')
}

const formatJson = (value: any) => {
  if (value === null || value === undefined || value === '') return '--'
  try {
    return typeof value === 'string' ? JSON.stringify(JSON.parse(value), null, 2) : JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const pushStreamLog = (type: string, payload: any) => {
  streamLogs.value.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    payload,
    time: new Date().toISOString()
  })
  if (streamLogs.value.length > 40) {
    streamLogs.value = streamLogs.value.slice(0, 40)
  }
}

const scrollMessagesToBottom = async () => {
  await nextTick()
  const wrap = messageScrollRef.value?.wrapRef
  if (wrap) {
    wrap.scrollTop = wrap.scrollHeight
  }
}

const parseSegmentRefs = (segmentRefs?: string): RetrievedChunkRespVO[] => {
  if (!segmentRefs) return []
  try {
    const raw = JSON.parse(segmentRefs)
    if (!Array.isArray(raw)) return []
    return raw.map((item: any) => ({
      id: item.id || item.chunkId || '',
      chunkLevel: item.chunkLevel || item.type,
      startOffset: item.startOffset,
      endOffset: item.endOffset,
      preview: item.preview || item.content || '',
      sourceSignals: item.sourceSignals || [],
      scoreDetail: item.scoreDetail || item.scores || {}
    }))
  } catch {
    return []
  }
}

const rebuildTimelineFromHistory = (history: RagChatMessageSimpleVO[]) => {
  selectedHistory.value = history || []
  messageTimeline.value = (history || []).map((item) => ({
    id: `history-${item.id}`,
    role: item.type === 'assistant' ? 'assistant' : 'user',
    title: item.type === 'assistant' ? 'Assistant' : 'User',
    content: item.content || '',
    time: item.createTime || new Date().toISOString(),
    status: 'done',
    messageId: item.id,
    segmentRefs: parseSegmentRefs(item.segmentRefs)
  }))
}

const syncSessionUpdateForm = (session?: RagChatSessionVO) => {
  sessionUpdateForm.modelId = session?.modelId
  sessionUpdateForm.temperature = session?.temperature
  sessionUpdateForm.maxTokens = session?.maxTokens
  sessionUpdateForm.maxContexts = session?.maxContexts
  sessionUpdateForm.userPrompt = session?.userPrompt || ''
}

const loadModelOptions = async () => {
  const [chat, embedding, rerank] = await Promise.all([
    ModelApi.getModelSimpleList(AiModelTypeEnum.CHAT),
    ModelApi.getModelSimpleList(AiModelTypeEnum.EMBEDDING),
    ModelApi.getModelSimpleList(AiModelTypeEnum.RERANK)
  ])
  chatModels.value = chat || []
  embeddingModels.value = embedding || []
  rerankModels.value = rerank || []
}

const refreshSessionPage = async () => {
  if (!currentUserId.value) return
  const data = await DocumentRagApi.getSessionPage(
    {
      userId: currentUserId.value,
      esId: documentState.esId || undefined,
      pageNo: sessionQuery.pageNo,
      pageSize: sessionQuery.pageSize
    },
    currentUserId.value
  )
  sessionPage.list = data.list || []
  sessionPage.total = data.total || 0
}

const changeSessionPage = async (pageNo: number) => {
  sessionQuery.pageNo = pageNo
  await refreshSessionPage()
}

const selectSession = async (sessionId: number) => {
  const detail = await DocumentRagApi.getSessionDetail(sessionId, true, currentUserId.value)
  activeSession.value = detail
  if (detail.esId) {
    documentState.esId = detail.esId
  }
  syncSessionUpdateForm(detail)
  rebuildTimelineFromHistory(detail.history || [])
  latestMergedSystem.value = detail.systemMessage || ''
  latestUserPrompt.value = detail.userPrompt || ''
  latestReferences.value = []
  latestRetrievals.value = []
  await scrollMessagesToBottom()
}

const reloadActiveSession = async () => {
  if (!activeSession.value?.id) {
    message.warning('请先选择会话')
    return
  }
  await selectSession(activeSession.value.id)
}

const refreshSimpleSessionList = async () => {
  if (!currentUserId.value) return
  simpleSessionList.value = await DocumentRagApi.getSessionList(
    {
      userId: currentUserId.value,
      esId: documentState.esId || undefined
    },
    currentUserId.value
  )
}

const handleCreateSession = async () => {
  if (!currentUserId.value) {
    message.error('无法获取当前用户 ID')
    return
  }
  if (!documentState.esId) {
    message.warning('请先填写文档 ES ID')
    return
  }
  const data = await DocumentRagApi.createSession(
    {
      userId: currentUserId.value,
      title: createSessionForm.title || undefined,
      esId: documentState.esId,
      roleId: createSessionForm.roleId,
      modelId: createSessionForm.modelId,
      temperature: createSessionForm.temperature,
      maxTokens: createSessionForm.maxTokens,
      maxContexts: createSessionForm.maxContexts,
      userPrompt: createSessionForm.userPrompt || undefined,
      returnHistory: createSessionForm.returnHistory,
      newSession: createSessionForm.newSession
    },
    currentUserId.value
  )
  message.success(`会话已创建：${data.id}`)
  await refreshSessionPage()
  await selectSession(data.id)
}

const loadLatestSession = async () => {
  if (!currentUserId.value || !documentState.esId) {
    message.warning('请先填写文档 ES ID')
    return
  }
  const data = await DocumentRagApi.getSessionLatest(
    {
      userId: currentUserId.value,
      esId: documentState.esId,
      returnHistory: true
    },
    currentUserId.value
  )
  activeSession.value = data
  syncSessionUpdateForm(data)
  rebuildTimelineFromHistory(data.history || [])
  latestMergedSystem.value = data.systemMessage || ''
  latestUserPrompt.value = data.userPrompt || ''
  latestReferences.value = []
  latestRetrievals.value = []
  message.success(`已定位到最近会话 #${data.id}`)
}

const promptRenameSession = async (session: RagChatSessionVO) => {
  const { value } = await ElMessageBox.prompt('请输入新的会话标题', '重命名会话', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    inputValue: session.title || ''
  })
  if (!value) return
  await DocumentRagApi.renameSession(session.id, value, currentUserId.value)
  message.success('会话标题已更新')
  await refreshSessionPage()
  if (activeSession.value?.id === session.id) {
    await selectSession(session.id)
  }
}

const togglePinSession = async (session: RagChatSessionVO) => {
  await DocumentRagApi.pinSession(session.id, !session.pinned, currentUserId.value)
  message.success(session.pinned ? '已取消置顶' : '已置顶')
  await refreshSessionPage()
  if (activeSession.value?.id === session.id) {
    await selectSession(session.id)
  }
}

const handleDeleteSession = async (sessionId: number) => {
  await message.delConfirm('确认删除该会话？')
  await DocumentRagApi.deleteSession(sessionId, currentUserId.value)
  message.success('会话已删除')
  if (activeSession.value?.id === sessionId) {
    activeSession.value = undefined
    selectedHistory.value = []
    messageTimeline.value = []
  }
  await refreshSessionPage()
}

const handleClearSessions = async () => {
  if (!documentState.esId) {
    message.warning('请先填写文档 ES ID')
    return
  }
  await message.delConfirm('确认清空当前文档的所有会话？')
  await DocumentRagApi.clearSessions(documentState.esId, currentUserId.value)
  message.success('当前文档会话已清空')
  activeSession.value = undefined
  selectedHistory.value = []
  messageTimeline.value = []
  await refreshSessionPage()
}

const handleClearHistory = async () => {
  if (!activeSession.value?.id) {
    message.warning('请先选择会话')
    return
  }
  await message.delConfirm('确认清空该会话全部历史消息？')
  await DocumentRagApi.clearSessionHistory(activeSession.value.id, currentUserId.value)
  message.success('历史已清空')
  await selectSession(activeSession.value.id)
}

const handleDeleteMessage = async (messageId?: number) => {
  if (!messageId) return
  await message.delConfirm('确认删除该条消息？')
  await DocumentRagApi.deleteMessage(messageId, currentUserId.value)
  message.success('消息已删除')
  if (activeSession.value?.id) {
    await selectSession(activeSession.value.id)
  }
}

const handleUpdateSessionPrompt = async () => {
  if (!activeSession.value?.id) {
    message.warning('请先选择会话')
    return
  }
  await DocumentRagApi.updateSessionUserPrompt(
    activeSession.value.id,
    sessionUpdateForm.userPrompt || '',
    currentUserId.value
  )
  message.success('用户 Prompt 已更新')
  await selectSession(activeSession.value.id)
}

const handleUpdateSessionParams = async () => {
  if (!activeSession.value?.id) {
    message.warning('请先选择会话')
    return
  }
  await DocumentRagApi.updateSessionModelParams(
    {
      userId: currentUserId.value,
      sessionId: activeSession.value.id,
      modelId: sessionUpdateForm.modelId,
      temperature: sessionUpdateForm.temperature,
      maxTokens: sessionUpdateForm.maxTokens,
      maxContexts: sessionUpdateForm.maxContexts,
      userPrompt: sessionUpdateForm.userPrompt || undefined
    },
    currentUserId.value
  )
  message.success('会话参数已更新')
  await selectSession(activeSession.value.id)
}

const handleCheckVectorStatus = async () => {
  if (!documentState.esId) {
    message.warning('请先填写文档 ES ID')
    return
  }
  statusLoading.value = true
  try {
    vectorStatus.value = await DocumentRagApi.checkVectorStatus(
      documentState.esId,
      vectorForm.endpoint === 'vectorize-doc-v2' ? vectorForm.embeddingModelId : undefined,
      currentUserId.value
    )
  } finally {
    statusLoading.value = false
  }
}

const handleVectorize = async () => {
  if (!currentUserId.value) {
    message.error('无法获取当前用户 ID')
    return
  }
  if (!documentState.esId) {
    message.warning('请先填写文档 ES ID')
    return
  }
  vectorLoading.value = true
  try {
    if (vectorForm.endpoint === 'vectorize-doc-v2') {
      const payload: DocumentVectorizationReqV2 = {
        userId: currentUserId.value,
        esId: documentState.esId,
        embeddingModelId: vectorForm.embeddingModelId,
        rerankModelId: vectorForm.rerankModelId,
        forceReindex: vectorForm.forceReindex,
        chunkPolicy: vectorForm.overrideChunkPolicy ? { ...vectorForm.chunkPolicy } : undefined
      }
      vectorResult.value = await DocumentRagApi.vectorizeDocumentV2(payload, currentUserId.value)
    } else {
      vectorResult.value = await DocumentRagApi.vectorizeDocument(
        {
          userId: currentUserId.value,
          esId: documentState.esId,
          forceReprocess: vectorForm.forceReprocess,
          chunkSize: vectorForm.chunkSize
        },
        currentUserId.value
      )
    }
    message.success(vectorResult.value?.message || '向量化请求已提交')
    await handleCheckVectorStatus()
  } finally {
    vectorLoading.value = false
  }
}

const upsertAssistantBubble = (patch: Partial<UiBubble>) => {
  const assistantId = activeAssistantBubbleId.value
  if (!assistantId) return
  const target = messageTimeline.value.find((item) => item.id === assistantId)
  if (!target) return
  Object.assign(target, patch)
}

const appendSystemBubble = (title: string, content: string, status: BubbleStatus = 'done') => {
  messageTimeline.value.push({
    id: `system-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: 'system',
    title,
    content,
    time: new Date().toISOString(),
    status
  })
}

const buildStreamPayload = () => {
  if (!activeSession.value?.id) {
    throw new Error('请先创建或选择会话')
  }
  if (!documentState.esId) {
    throw new Error('请先填写文档 ES ID')
  }
  if (!chatForm.question.trim()) {
    throw new Error('请输入问题内容')
  }

  if (chatForm.endpoint === 'stream-document-rag') {
    const payload: DocumentRagAskReqVO = {
      sessionId: activeSession.value.id,
      esId: documentState.esId,
      question: chatForm.question.trim(),
      mode: chatForm.mode,
      useContext: chatForm.useContext,
      targetLang: chatForm.targetLang || undefined,
      toolMode: chatForm.toolMode,
      maxCitations: chatForm.maxCitations,
      topK: chatForm.topK
    }
    return payload
  }

  if (chatForm.endpoint === 'stream-enhanced-rag') {
    const payload: RagEnhancedChatReqVO = {
      sessionId: activeSession.value.id,
      esId: documentState.esId,
      content: chatForm.question.trim(),
      useContext: chatForm.useContext,
      topK: chatForm.topK,
      similarityThreshold: chatForm.similarityThreshold,
      enableHybridSearch: chatForm.enableHybridSearch,
      maxContextChars: chatForm.maxContextChars,
      enableQueryRewriting: chatForm.enableQueryRewriting,
      enableReranking: chatForm.enableReranking
    }
    return payload
  }

  const payload: RagFileChatMessageSendReqVO = {
    sessionId: activeSession.value.id,
    esId: documentState.esId,
    content: chatForm.question.trim(),
    useContext: chatForm.useContext,
    topK: chatForm.topK,
    maxContextChars: chatForm.maxContextChars
  }
  return payload
}

const handleChunk = async (chunk: RagStreamChunkVO) => {
  pushStreamLog(chunk.partType, chunk)

  if (chunk.partType === 'meta') {
    latestMergedSystem.value = chunk.mergedSystem || ''
    latestUserPrompt.value = chunk.userPrompt || ''
    latestReferences.value = chunk.references || []
    latestRetrievals.value = chunk.retrievals || []
    upsertAssistantBubble({
      retrievals: chunk.retrievals || [],
      references: chunk.references || [],
      content: ''
    })
    rightTab.value = 'retrievals'
  } else if (chunk.partType === 'delta') {
    upsertAssistantBubble({
      status: 'streaming',
      content: `${messageTimeline.value.find((item) => item.id === activeAssistantBubbleId.value)?.content || ''}${chunk.content || ''}`
    })
  } else if (chunk.partType === 'final') {
    upsertAssistantBubble({
      status: 'done',
      content: chunk.content || messageTimeline.value.find((item) => item.id === activeAssistantBubbleId.value)?.content || ''
    })
  } else if (chunk.partType === 'indexing') {
    upsertAssistantBubble({
      role: 'system',
      title: 'Indexing',
      status: 'indexing',
      content: chunk.content || '文档正在建索引，请稍后重试'
    })
  } else if (chunk.partType === 'error') {
    upsertAssistantBubble({
      role: 'system',
      title: 'Error',
      status: 'error',
      content: chunk.content || '问答失败'
    })
  }
  await scrollMessagesToBottom()
}

const runStream = async (payload: any) => {
  streamController.value = new AbortController()
  streaming.value = true
  streamLogs.value = []
  lastRequestPayload.value = payload
  latestUserPrompt.value = ''
  latestReferences.value = []
  latestRetrievals.value = []
  latestMergedSystem.value = ''

  const userBubble: UiBubble = {
    id: `user-${Date.now()}`,
    role: 'user',
    title: 'User',
    content: chatForm.question.trim(),
    time: new Date().toISOString(),
    status: 'done'
  }
  const assistantBubble: UiBubble = {
    id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: 'assistant',
    title: streamEndpointLabel.value,
    content: '',
    time: new Date().toISOString(),
    status: 'streaming'
  }
  activeAssistantBubbleId.value = assistantBubble.id
  messageTimeline.value.push(userBubble, assistantBubble)
  await scrollMessagesToBottom()

  const onMessage = async (res: any) => {
    if (!res?.data || res.data === '[DONE]') {
      return
    }
    const chunk = JSON.parse(res.data) as RagStreamChunkVO
    await handleChunk(chunk)
  }
  const onError = (error: any) => {
    pushStreamLog('stream-error', String(error))
    upsertAssistantBubble({
      role: 'system',
      title: 'Error',
      status: 'error',
      content: '流式连接异常，请检查后端日志或当前参数。'
    })
    streaming.value = false
    throw error
  }
  const onClose = async () => {
    streaming.value = false
    if (activeSession.value?.id) {
      await selectSession(activeSession.value.id)
    }
  }

  if (chatForm.endpoint === 'stream-document-rag') {
    await DocumentRagApi.streamDocumentRag({
      data: payload as DocumentRagAskReqVO,
      userId: currentUserId.value,
      ctrl: streamController.value,
      onMessage,
      onError,
      onClose
    })
  } else if (chatForm.endpoint === 'stream-enhanced-rag') {
    await DocumentRagApi.streamEnhancedRag({
      data: payload as RagEnhancedChatReqVO,
      userId: currentUserId.value,
      ctrl: streamController.value,
      onMessage,
      onError,
      onClose
    })
  } else {
    await DocumentRagApi.streamRag({
      data: payload as RagFileChatMessageSendReqVO,
      userId: currentUserId.value,
      ctrl: streamController.value,
      onMessage,
      onError,
      onClose
    })
  }
}

const handleSendQuestion = async () => {
  try {
    const payload = buildStreamPayload()
    await runStream(payload)
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      message.error(error?.message || '发送失败')
    }
  }
}

const stopStreaming = () => {
  if (streamController.value) {
    streamController.value.abort()
  }
  streaming.value = false
  appendSystemBubble('Stopped', '已手动停止当前流式请求', 'done')
}

const focusRetrievalTab = () => {
  rightTab.value = 'retrievals'
}

const bootstrapPage = async () => {
  await loadModelOptions()
  await Promise.all([refreshSessionPage(), refreshSimpleSessionList()])
  if (documentState.esId) {
    try {
      await handleCheckVectorStatus()
    } catch {}
  }
}

watch(
  () => activeSession.value?.userPrompt,
  () => {
    syncSessionUpdateForm(activeSession.value)
  }
)

watch(
  () => documentState.esId,
  async () => {
    sessionQuery.pageNo = 1
    await Promise.all([refreshSessionPage(), refreshSimpleSessionList()])
  }
)

onMounted(async () => {
  if (!userStore.getIsSetUser) {
    await userStore.setUserInfoAction()
  }
  await bootstrapPage()
})
</script>

<style scoped lang="scss">
.rag-document-v2 {
  --rag-ink: #102a43;
  --rag-soft-ink: #52667a;
  --rag-border: rgba(15, 23, 42, 0.08);
  --rag-surface: linear-gradient(180deg, #fffdf8 0%, #fff 100%);
  --rag-surface-strong: linear-gradient(145deg, #fff 0%, #f4fbf8 100%);
  --rag-accent: #0f766e;
  --rag-accent-soft: #d1fae5;
  --rag-warm: #fb923c;
  --rag-sky: #0ea5e9;
  --rag-rose: #ef4444;
  --rag-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);
  min-height: calc(100vh - 120px);
  color: var(--rag-ink);
}

.hero-panel {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 20px;
  padding: 26px;
  margin-bottom: 18px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.15), transparent 36%),
    radial-gradient(circle at 85% 20%, rgba(251, 146, 60, 0.18), transparent 30%),
    linear-gradient(135deg, #fcfffd 0%, #f8fafc 48%, #fff7ed 100%);
  box-shadow: var(--rag-shadow);
}

.hero-kicker {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rag-accent);
}

.hero-copy h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.hero-desc {
  max-width: 760px;
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--rag-soft-ink);
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.hero-chip {
  padding: 7px 12px;
  font-size: 12px;
  color: #0f5132;
  border: 1px solid rgba(15, 118, 110, 0.15);
  border-radius: 999px;
  background: rgba(240, 253, 250, 0.95);
}

.hero-chip.muted {
  color: #8a5b14;
  background: rgba(255, 247, 237, 0.95);
  border-color: rgba(251, 146, 60, 0.15);
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-self: stretch;
}

.hero-stat {
  padding: 14px 16px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
}

.hero-stat-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--rag-soft-ink);
}

.hero-stat strong {
  display: block;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.hero-buttons {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

.rag-grid {
  display: grid;
  grid-template-columns: minmax(300px, 350px) minmax(0, 1.25fr) minmax(340px, 420px);
  gap: 18px;
  align-items: start;
}

.panel-card {
  border-radius: 24px;
  background: var(--rag-surface);
  box-shadow: var(--rag-shadow);
}

:deep(.panel-card .el-card__body),
:deep(.panel-card .content-wrap) {
  background: transparent;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.panel-heading h3 {
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.panel-heading p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--rag-soft-ink);
}

.document-entry,
.composer-shell,
.status-card,
.tools-banner {
  padding: 16px;
  border: 1px solid var(--rag-border);
  border-radius: 20px;
  background: var(--rag-surface-strong);
}

.section-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--rag-soft-ink);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.action-row,
.action-grid,
.switch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.switch-row {
  margin-top: 4px;
  font-size: 13px;
  color: var(--rag-soft-ink);
}

.switch-row.compact {
  margin-top: 0;
}

.grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.session-toolbar,
.composer-head,
.status-card-head,
.tool-card-head,
.retrieval-card-head,
.event-log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.session-toolbar-actions,
.simple-session-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.collapse-title {
  font-weight: 700;
  color: var(--rag-ink);
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.session-item {
  width: 100%;
  padding: 14px;
  text-align: left;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: #fff;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.session-item:hover,
.session-item.is-active {
  transform: translateY(-1px);
  border-color: rgba(15, 118, 110, 0.28);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.session-item-head,
.session-item-title,
.session-item-meta,
.session-item-actions,
.active-session-bar,
.status-kpis,
.retrieval-signals,
.drawer-grid {
  display: flex;
}

.session-item-head,
.session-item-actions {
  justify-content: space-between;
}

.session-item-title,
.retrieval-signals {
  align-items: center;
  gap: 8px;
}

.session-item-meta {
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--rag-soft-ink);
}

.session-item-time {
  font-size: 12px;
  color: var(--rag-soft-ink);
}

.session-item-actions {
  margin-top: 8px;
}

.session-pager {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  font-size: 12px;
  color: var(--rag-soft-ink);
}

.simple-session-shell {
  padding: 16px;
  margin-top: 16px;
  border: 1px solid var(--rag-border);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
}

.simple-session-head {
  justify-content: space-between;
}

.simple-session-copy {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--rag-soft-ink);
}

.simple-session-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.simple-session-item {
  display: grid;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, #fff, #f8fafc);
  font-size: 12px;
  color: var(--rag-soft-ink);
}

.simple-session-item strong {
  font-size: 13px;
  color: var(--rag-ink);
}

.endpoint-pill {
  align-self: center;
  padding: 8px 12px;
  font-size: 12px;
  color: #075985;
  border-radius: 999px;
  background: rgba(224, 242, 254, 0.92);
}

.active-session-bar {
  gap: 12px;
  margin-bottom: 16px;
}

.active-session-card {
  flex: 1;
  padding: 14px 16px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 18px;
  background: linear-gradient(180deg, #fff, #f8fafc);
}

.active-session-card strong {
  display: block;
  margin-top: 2px;
  font-size: 18px;
}

.active-label {
  display: block;
  margin-bottom: 2px;
  font-size: 12px;
  color: var(--rag-soft-ink);
}

.message-stage {
  height: 620px;
  padding: 10px;
  border: 1px solid var(--rag-border);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.96)),
    radial-gradient(circle at top right, rgba(20, 184, 166, 0.08), transparent 34%);
}

.message-scroll {
  height: 100%;
}

.message-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px;
}

.message-bubble {
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
}

.message-bubble.role-user {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #fff;
}

.message-bubble.role-user :deep(.markdown-view),
.message-bubble.role-user .plain-shell {
  color: #fff;
}

.message-bubble.role-assistant {
  border-color: rgba(14, 165, 233, 0.12);
}

.message-bubble.role-system {
  border-style: dashed;
  background: linear-gradient(135deg, #fff7ed 0%, #fff 100%);
}

.message-bubble.status-error {
  border-color: rgba(239, 68, 68, 0.25);
}

.message-bubble.status-indexing {
  border-color: rgba(245, 158, 11, 0.25);
}

.bubble-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
}

.bubble-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.bubble-time {
  font-size: 12px;
  opacity: 0.82;
}

.bubble-body {
  font-size: 14px;
  line-height: 1.9;
}

.plain-shell {
  white-space: pre-wrap;
  word-break: break-word;
}

.markdown-shell :deep(.markdown-view) {
  color: var(--rag-ink);
  background: transparent;
}

.bubble-retrieval-summary,
.history-ref-bar,
.bubble-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.composer-shell {
  margin-top: 16px;
}

.composer-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.composer-form {
  margin-top: 14px;
}

.advanced-composer {
  padding: 14px;
  margin-top: 6px;
  border: 1px dashed rgba(15, 23, 42, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
}

.composer-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-top: 16px;
}

.inline-switch {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.status-card {
  margin-top: 16px;
}

.status-card-head {
  align-items: flex-start;
  margin-bottom: 14px;
}

.status-card-head span {
  color: var(--rag-soft-ink);
  line-height: 1.6;
}

.status-kpis {
  gap: 12px;
  margin-bottom: 14px;
}

.status-kpi {
  flex: 1;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
}

.status-kpi span {
  display: block;
  font-size: 12px;
  color: var(--rag-soft-ink);
}

.status-kpi strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
}

.response-note {
  margin-top: 16px;
}

.tools-banner {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.tool-logic p,
.tool-card p {
  margin: 6px 0 0;
  line-height: 1.8;
  font-size: 13px;
  color: var(--rag-soft-ink);
}

.tool-expected-label {
  display: block;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--rag-soft-ink);
}

.tool-list,
.retrieval-list,
.event-log {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.tool-card,
.retrieval-card,
.event-log-item {
  padding: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: #fff;
}

.retrieval-card-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--rag-soft-ink);
}

.retrieval-preview {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--rag-ink);
  white-space: pre-wrap;
}

.json-block,
.json-inline {
  margin: 0;
  font-size: 12px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2937;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 14px;
  padding: 12px;
}

.json-inline {
  margin-top: 12px;
}

.ops-tabs {
  margin-top: 4px;
}

.drawer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dense-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

@media (max-width: 1480px) {
  .rag-grid {
    grid-template-columns: 320px minmax(0, 1fr);
  }

  .ops-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1080px) {
  .hero-panel,
  .rag-grid,
  .active-session-bar,
  .status-kpis,
  .drawer-grid,
  .grid-two,
  .composer-footer {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .hero-buttons,
  .action-grid,
  .action-row,
  .switch-row,
  .composer-tools {
    width: 100%;
  }

  .message-stage {
    height: 480px;
  }
}
</style>
