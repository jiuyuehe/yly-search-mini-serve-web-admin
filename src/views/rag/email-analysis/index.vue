<template>
  <ContentWrap>
    <div class="header-row">
      <div>
        <div class="title">邮件分析与往来图谱</div>
        <div class="subtitle">解析邮件结构、附件与往来关系，支持按人员快速跳转检索</div>
      </div>
      <el-button type="primary" :loading="syncLoading" @click="handleSync">
        <Icon icon="ep:refresh" class="mr-5px" />
        同步邮件索引
      </el-button>
    </div>
  </ContentWrap>

  <ContentWrap>
    <el-form :inline="true" :model="queryParams" class="-mb-15px" label-width="82px">
      <el-form-item label="关键字">
        <el-input v-model="queryParams.keyword" class="!w-240px" clearable placeholder="主题、正文、文件名称" />
      </el-form-item>
      <el-form-item label="参与人邮箱">
        <el-input v-model="queryParams.personEmail" class="!w-240px" clearable placeholder="请输入邮箱地址" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px" />
          搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-5px" />
          重置
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <div ref="graphRef" class="graph-box"></div>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" stripe>
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

    <el-table v-loading="edgeLoading" :data="edgeList" stripe class="!mt-16px">
      <el-table-column label="文件名称" prop="fileName" min-width="180" show-overflow-tooltip />
      <el-table-column label="主题" prop="subject" min-width="220" show-overflow-tooltip />
      <el-table-column label="发件人" prop="from" min-width="180" show-overflow-tooltip />
      <el-table-column label="收件人" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ (row.to || []).join('；') || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="发送时间" prop="sentAt" width="180" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
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
</template>

<script setup lang="ts">
import { MailAnalysisApi } from '@/api/rag/email-analysis'
import * as echarts from 'echarts'

defineOptions({ name: 'RagEmailAnalysis' })

const message = useMessage()
const loading = ref(false)
const syncLoading = ref(false)
const detailVisible = ref(false)
const edgeVisible = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const detail = ref<any>()
const graphData = ref<any>({ nodes: [], edges: [] })
const edgeLoading = ref(false)
const edgeList = ref<any[]>([])
const edgeTotal = ref(0)
const edgeTitle = ref('边往来邮件')
const graphRef = ref<HTMLElement>()
let graphChart: echarts.ECharts | null = null

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: undefined,
  personEmail: undefined
})

const edgeQuery = reactive({
  source: undefined as string | undefined,
  target: undefined as string | undefined,
  pageNo: 1,
  pageSize: 8
})

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
  nextTick(() => renderGraph())
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
  await Promise.all([getList(), getGraph()])
}

const resetQuery = async () => {
  queryParams.pageNo = 1
  queryParams.keyword = undefined
  queryParams.personEmail = undefined
  await Promise.all([getList(), getGraph()])
}

const openDetail = async (id: string) => {
  detail.value = await MailAnalysisApi.getDetail(id)
  detailVisible.value = true
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
      if (params?.dataType === 'node' && params?.data?.email) {
        queryParams.personEmail = params.data.email
        void handleQuery()
        return
      }
      if (params?.dataType === 'edge' && params?.data?.source && params?.data?.target) {
        void openEdgeDrawer(params.data.source, params.data.target)
      }
    })
  }
  const nodes = (graphData.value.nodes || []).map((item: any) => ({
    ...item,
    name: item.displayName || item.email,
    value: item.count || 1,
    symbolSize: 24 + Math.min((item.count || 1) * 2, 26)
  }))
  const links = (graphData.value.edges || []).map((item: any) => ({
    source: item.source,
    target: item.target,
    value: item.count || 1,
    lineStyle: { width: Math.max(1, Math.min(item.count || 1, 8)) }
  }))
  graphChart.setOption({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        data: nodes,
        links,
        label: { show: true, formatter: '{b}' },
        force: { repulsion: 220, edgeLength: 130 }
      }
    ]
  })
}

onMounted(async () => {
  await Promise.all([getList(), getGraph()])
})
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title {
  font-size: 20px;
  font-weight: 600;
}

.subtitle {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

.graph-box {
  width: 100%;
  height: 420px;
}

.body-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}
</style>
