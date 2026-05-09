<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / 图谱生成管理 / <span>邮件图谱</span></div>
          <div class="governance-page-title">邮件分析与往来图谱</div>
          <div class="governance-page-subtitle">解析邮件结构、附件与往来关系，支持节点筛选、边邮件追溯和来源详情查看。</div>
        </div>
        <el-button type="primary" :loading="syncLoading" @click="handleSync">
          <Icon icon="ep:refresh" class="mr-5px" />
          同步邮件索引
        </el-button>
      </div>
    </ContentWrap>

    <div class="governance-kpi-grid mail-kpi-grid">
      <div v-for="item in kpiCards" :key="item.label" class="governance-kpi-card">
        <div class="governance-kpi-label">{{ item.label }}</div>
        <div class="governance-kpi-value">{{ item.value }}</div>
        <div class="governance-kpi-delta">当前范围 <span>{{ item.delta }}</span></div>
      </div>
    </div>

    <div class="mail-workbench">
      <ContentWrap class="governance-panel mail-filter-panel">
        <template #header>图谱筛选</template>
        <el-form :model="queryParams" label-position="top">
          <el-form-item label="关键字">
            <el-input
              v-model="queryParams.keyword"
              clearable
              placeholder="主题、正文、文件名称"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="参与人邮箱">
            <el-input
              v-model="queryParams.personEmail"
              clearable
              placeholder="请输入邮箱地址"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <div class="filter-actions">
            <el-button type="primary" @click="handleQuery">
              <Icon icon="ep:search" class="mr-5px" />
              搜索
            </el-button>
            <el-button @click="resetQuery">
              <Icon icon="ep:refresh-left" class="mr-5px" />
              重置
            </el-button>
          </div>
        </el-form>

        <div class="filter-tags">
          <span>快捷视角</span>
          <el-tag v-for="item in quickScopes" :key="item" effect="plain" @click="applyQuickScope(item)">
            {{ item }}
          </el-tag>
        </div>
      </ContentWrap>

      <ContentWrap class="governance-panel mail-graph-panel">
        <template #header>
          <div class="graph-header">
            <span>邮件往来关系图谱</span>
            <el-tag type="success" effect="plain">{{ graphNodeCount }} 个节点 / {{ graphEdgeCount }} 条边</el-tag>
          </div>
        </template>
        <div ref="graphRef" class="graph-box"></div>
      </ContentWrap>

      <ContentWrap class="governance-panel mail-detail-panel">
        <template #header>节点与来源详情</template>
        <template v-if="selectedNode">
          <div class="node-name">{{ selectedNode.displayName || selectedNode.name || selectedNode.email }}</div>
          <div class="node-email">{{ selectedNode.email || '-' }}</div>
          <div class="node-stats">
            <div>
              <span>往来次数</span>
              <b>{{ selectedNode.count || selectedNode.value || 0 }}</b>
            </div>
            <div>
              <span>节点权重</span>
              <b>{{ selectedNode.symbolSize || '-' }}</b>
            </div>
          </div>
          <el-divider />
          <el-button link type="primary" :disabled="!selectedNode.email" @click="filterSelectedNode">
            按该节点筛选邮件
          </el-button>
          <el-button link type="primary" @click="selectedNode = undefined">清空选择</el-button>
        </template>
        <template v-else-if="selectedEdge">
          <div class="node-name">{{ selectedEdge.source }} -> {{ selectedEdge.target }}</div>
          <div class="node-email">点击边可打开往来邮件列表</div>
          <div class="node-stats">
            <div>
              <span>往来邮件</span>
              <b>{{ selectedEdge.value || selectedEdge.count || 0 }}</b>
            </div>
          </div>
        </template>
        <el-empty v-else description="点击图谱节点查看详情" :image-size="110" />
      </ContentWrap>
    </div>

    <ContentWrap class="governance-table-panel">
      <template #header>来源邮件列表</template>
      <el-table v-loading="loading" :data="list" stripe class="governance-dense-table">
        <el-table-column label="文件名称" prop="fileName" min-width="220" show-overflow-tooltip />
        <el-table-column label="主题" prop="subject" min-width="240" show-overflow-tooltip />
        <el-table-column label="发件人" prop="from" min-width="180" show-overflow-tooltip />
        <el-table-column label="收件人" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ (row.to || []).join('；') || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="抄送" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ (row.cc || []).join('；') || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="附件数" prop="attachmentCount" width="100" />
        <el-table-column label="发送时间" prop="sentAt" width="180" />
          <el-table-column label="操作" fixed="right" width="120">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            </template>
          </el-table-column>
      </el-table>

      <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </ContentWrap>

    <el-drawer v-model="detailVisible" title="邮件详情" size="52%">
      <template v-if="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="文件名称">{{ detail.fileName }}</el-descriptions-item>
          <el-descriptions-item label="主题">{{ detail.subject || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发件人">{{ detail.from || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收件人">{{ (detail.to || []).join('；') || '-' }}</el-descriptions-item>
          <el-descriptions-item label="抄送">{{ (detail.cc || []).join('；') || '-' }}</el-descriptions-item>
          <el-descriptions-item label="密送">{{ (detail.bcc || []).join('；') || '-' }}</el-descriptions-item>
          <el-descriptions-item label="回复地址">{{ (detail.replyTo || []).join('；') || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发送时间">{{ detail.sentAt || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="detail-actions">
          <el-button type="primary" plain :disabled="!sourceFileId(detail)" @click="goSourceFile(sourceFileId(detail))">
            <Icon icon="ep:connection" class="mr-5px" />
            跳转来源文件
          </el-button>
        </div>

        <el-card class="!mt-16px" shadow="never">
          <template #header>正文</template>
          <div class="body-text">{{ detail.bodyText || '-' }}</div>
        </el-card>

        <el-card class="!mt-16px" shadow="never">
          <template #header>附件</template>
          <el-table :data="detail.attachments || []" stripe>
            <el-table-column label="附件名称" prop="fileName" min-width="180" show-overflow-tooltip />
            <el-table-column label="类型" prop="mediaType" min-width="140" show-overflow-tooltip />
            <el-table-column label="大小" prop="size" width="100" />
            <el-table-column label="访问地址" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <a :href="row.url" target="_blank">{{ row.url || '-' }}</a>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </el-drawer>

    <el-drawer v-model="edgeVisible" :title="edgeTitle" size="48%">
      <el-alert type="info" :closable="false" show-icon>
        <template #title>
          当前展示 {{ edgeQuery.source || '-' }} -> {{ edgeQuery.target || '-' }} 的往来邮件列表
        </template>
      </el-alert>

      <el-table v-loading="edgeLoading" :data="edgeList" stripe class="!mt-16px governance-dense-table">
        <el-table-column label="文件名称" prop="fileName" min-width="180" show-overflow-tooltip />
        <el-table-column label="主题" prop="subject" min-width="220" show-overflow-tooltip />
        <el-table-column label="发件人" prop="from" min-width="180" show-overflow-tooltip />
        <el-table-column label="收件人" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ (row.to || []).join('；') || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="发送时间" prop="sentAt" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button link type="primary" @click="goSourceFile(row.id)">来源</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination
        :total="edgeTotal"
        v-model:page="edgeQuery.pageNo"
        v-model:limit="edgeQuery.pageSize"
        @pagination="loadEdgeMessages"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { MailAnalysisApi } from '@/api/rag/email-analysis'
import * as echarts from 'echarts'

defineOptions({ name: 'RagEmailAnalysis' })

const message = useMessage()
const router = useRouter()
const loading = ref(false)
const syncLoading = ref(false)
const detailVisible = ref(false)
const edgeVisible = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const detail = ref<any>()
const graphData = ref<any>({ nodes: [], edges: [] })
const selectedNode = ref<any>()
const selectedEdge = ref<any>()
const edgeLoading = ref(false)
const edgeList = ref<any[]>([])
const edgeTotal = ref(0)
const edgeTitle = ref('边往来邮件')
const graphRef = ref<HTMLElement>()
let graphChart: echarts.ECharts | null = null

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: undefined as string | undefined,
  personEmail: undefined as string | undefined
})

const edgeQuery = reactive({
  source: undefined as string | undefined,
  target: undefined as string | undefined,
  pageNo: 1,
  pageSize: 8
})

const quickScopes = ['核心人员', '附件邮件', '近 7 天', '高频往来']

const formatNumber = (value: number | string) => Number(value || 0).toLocaleString()
const graphNodeCount = computed(() => (graphData.value.nodes || []).length)
const graphEdgeCount = computed(() => (graphData.value.edges || []).length)
const attachmentCount = computed(() => list.value.reduce((sum, item) => sum + Number(item.attachmentCount || 0), 0))
const kpiCards = computed(() => [
  { label: '邮件总量', value: formatNumber(total.value), delta: '来源列表' },
  { label: '参与人节点', value: formatNumber(graphNodeCount.value), delta: '关系图谱' },
  { label: '往来关系边', value: formatNumber(graphEdgeCount.value), delta: '有向边' },
  { label: '附件总数', value: formatNumber(attachmentCount.value), delta: '当前页' }
])

const getList = async () => {
  loading.value = true
  try {
    const data = await MailAnalysisApi.getPage(queryParams)
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const getGraph = async () => {
  graphData.value = await MailAnalysisApi.getGraph({
    keyword: queryParams.keyword,
    personEmail: queryParams.personEmail
  })
  await nextTick()
  renderGraph()
}

const handleSync = async () => {
  syncLoading.value = true
  try {
    await MailAnalysisApi.sync(300)
    message.success('邮件索引同步完成')
    await Promise.all([getList(), getGraph()])
  } finally {
    syncLoading.value = false
  }
}

const handleQuery = async () => {
  queryParams.pageNo = 1
  selectedEdge.value = undefined
  await Promise.all([getList(), getGraph()])
}

const resetQuery = async () => {
  queryParams.pageNo = 1
  queryParams.keyword = undefined
  queryParams.personEmail = undefined
  selectedNode.value = undefined
  selectedEdge.value = undefined
  await Promise.all([getList(), getGraph()])
}

const applyQuickScope = async (scope: string) => {
  queryParams.keyword = scope
  await handleQuery()
}

const filterSelectedNode = async () => {
  if (!selectedNode.value?.email) return
  queryParams.personEmail = selectedNode.value.email
  await handleQuery()
}

const openDetail = async (id: string) => {
  detail.value = await MailAnalysisApi.getDetail(id)
  detailVisible.value = true
}

const sourceFileId = (row: any) => row?.esId || row?.id

const goSourceFile = (esId?: string) => {
  if (!esId) return
  router.push({ path: '/rag/ai-result', query: { taskType: 'summary', esId } })
}

const openEdgeDrawer = async (source: string, target: string) => {
  edgeQuery.source = source
  edgeQuery.target = target
  edgeQuery.pageNo = 1
  edgeTitle.value = `边往来邮件：${source} -> ${target}`
  edgeVisible.value = true
  await loadEdgeMessages()
}

const loadEdgeMessages = async () => {
  if (!edgeQuery.source || !edgeQuery.target) return
  edgeLoading.value = true
  try {
    const data = await MailAnalysisApi.getEdgeMessages(edgeQuery)
    edgeList.value = data.list || []
    edgeTotal.value = data.total || 0
  } finally {
    edgeLoading.value = false
  }
}

const renderGraph = () => {
  if (!graphRef.value) return
  if (!graphChart) {
    graphChart = echarts.init(graphRef.value)
    graphChart.on('click', (params: any) => {
      if (params?.dataType === 'node') {
        selectedNode.value = params.data
        selectedEdge.value = undefined
        return
      }
      if (params?.dataType === 'edge' && params?.data?.source && params?.data?.target) {
        selectedEdge.value = params.data
        selectedNode.value = undefined
        void openEdgeDrawer(params.data.source, params.data.target)
      }
    })
  }
  const nodes = (graphData.value.nodes || []).map((item: any) => ({
    ...item,
    name: item.displayName || item.email,
    value: item.count || 1,
    symbolSize: 24 + Math.min((item.count || 1) * 2, 26),
    itemStyle: { color: item.count > 10 ? '#2f7bff' : '#39b76d' }
  }))
  const links = (graphData.value.edges || []).map((item: any) => ({
    ...item,
    source: item.source,
    target: item.target,
    value: item.count || 1,
    lineStyle: {
      width: Math.max(1, Math.min(item.count || 1, 8)),
      color: '#98a2b3',
      curveness: 0.12
    }
  }))
  graphChart.setOption({
    backgroundColor: '#f8fbff',
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        data: nodes,
        links,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
        label: { show: true, formatter: '{b}', color: '#344054', fontSize: 12 },
        force: { repulsion: 260, edgeLength: 138 },
        emphasis: { focus: 'adjacency' }
      }
    ]
  })
  graphChart.resize()
}

onMounted(async () => {
  await Promise.all([getList(), getGraph()])
})

onBeforeUnmount(() => {
  graphChart?.dispose()
  graphChart = null
})
</script>

<style scoped>
.mail-kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.mail-workbench {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 300px;
  gap: 12px;
  margin-bottom: 12px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.filter-tags span {
  flex: 0 0 100%;
  color: #667085;
  font-size: 13px;
}

.filter-tags :deep(.el-tag) {
  cursor: pointer;
}

.graph-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.graph-box {
  width: 100%;
  height: 520px;
  overflow: hidden;
  border: 1px solid #edf1f7;
  border-radius: 6px;
}

.node-name {
  color: #101828;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
}

.node-email {
  margin-top: 6px;
  color: #667085;
  font-size: 13px;
  word-break: break-all;
}

.node-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.node-stats div {
  padding: 12px;
  background: #f8fbff;
  border: 1px solid #e6ebf2;
  border-radius: 6px;
}

.node-stats span {
  color: #667085;
  font-size: 12px;
}

.node-stats b {
  display: block;
  margin-top: 8px;
  color: #101828;
  font-size: 18px;
}

.body-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

@media (max-width: 1400px) {
  .mail-workbench {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .mail-detail-panel {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .mail-kpi-grid,
  .mail-workbench {
    grid-template-columns: 1fr;
  }
}
</style>
