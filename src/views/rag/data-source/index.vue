<template>
  <div class="data-source-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">RAG 知识库 / <span>新数据源接入</span></div>
          <div class="page-title">数据源接入与索引任务</div>
          <div class="page-subtitle">统一管理数据源、挂载状态、索引任务、内容处理进度和后续分析入口。</div>
        </div>
        <div class="head-actions">
          <el-button @click="reloadAll"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
          <el-button type="primary" @click="openStorageForm('create')" v-hasPermi="['rag:storage-medium:create']">
            <Icon icon="ep:plus" class="mr-5px" />新增数据源
          </el-button>
        </div>
      </div>
    </ContentWrap>

    <div class="kpi-grid" v-loading="loading">
      <div v-for="item in kpiCards" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-tip">{{ item.tip }}</div>
      </div>
    </div>

    <ContentWrap>
      <div class="filter-bar">
        <el-input v-model="filters.keyword" clearable placeholder="搜索数据源或任务名称" class="filter-keyword" @keyup.enter="handleQuery" />
        <el-select v-model="filters.mediumType" clearable placeholder="全部类型" class="filter-select" @change="handleQuery">
          <el-option label="数据库" value="1" />
          <el-option label="NAS / 文件目录" value="2" />
        </el-select>
        <el-select v-model="filters.connection" clearable placeholder="连接状态" class="filter-select" @change="handleQuery">
          <el-option label="已连接" value="connected" />
          <el-option label="未连接" value="disconnected" />
        </el-select>
        <el-button type="primary" @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />查询</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh-left" class="mr-5px" />重置</el-button>
      </div>
    </ContentWrap>

    <div v-loading="loading" class="source-grid">
      <div v-for="card in filteredCards" :key="card.id" class="source-card">
        <div class="card-top">
          <div class="source-icon" :class="card.mediumType === '2' ? 'file' : 'db'">
            <Icon :icon="card.mediumType === '2' ? 'ep:folder-opened' : 'ep:coin'" />
          </div>
          <div class="source-main">
            <div class="source-title-row">
              <div class="source-title">{{ card.mediumName }}</div>
              <el-tag :type="connectionMeta(card).type" effect="light">
                {{ connectionMeta(card).label }}
              </el-tag>
            </div>
            <div class="source-desc">{{ card.mediumDesc || '暂无描述' }}</div>
            <div class="source-meta">
              <span>{{ mediumTypeLabel(card.mediumType) }}</span>
              <span>{{ card.mountPath || configPreview(card.configJson) || '未配置路径' }}</span>
            </div>
            <div class="connection-row">
              <span>连接状态</span>
              <b :class="connectionMeta(card).className">{{ connectionMeta(card).label }}</b>
              <em>{{ connectionMeta(card).hint }}</em>
            </div>
          </div>
        </div>

        <div class="status-strip">
          <div>
            <span>任务</span>
            <b>{{ card.tasks.length }}</b>
          </div>
          <div>
            <span>文件</span>
            <b>{{ formatNumber(card.totalFiles) }}</b>
          </div>
          <div>
            <span>成功</span>
            <b>{{ formatNumber(card.successCount) }}</b>
          </div>
          <div>
            <span>异常</span>
            <b class="danger">{{ formatNumber(card.errorCount) }}</b>
          </div>
        </div>

        <div class="task-list">
          <div v-if="card.tasks.length === 0" class="empty-task">
            <Icon icon="ep:document-add" />
            <span>尚未创建索引任务</span>
          </div>
          <div v-for="task in card.tasks.slice(0, 3)" :key="task.id" class="task-row">
            <div>
              <div class="task-name">{{ task.taskName }}</div>
              <div class="task-progress">
                <span>内容 {{ formatNumber(task.contentProcessedCount || 0) }}/{{ formatNumber(task.totalFiles || 0) }}</span>
                <el-progress :percentage="progressPercent(task)" :show-text="false" />
              </div>
            </div>
            <el-tag :type="taskStatusMeta(task.status).type" size="small">{{ taskStatusMeta(task.status).label }}</el-tag>
            <el-button link type="success" @click="openAnalysis(task)">分类统计</el-button>
          </div>
        </div>

        <div class="card-actions">
          <el-button link type="primary" @click="openStorageForm('update', card.id)" v-hasPermi="['rag:storage-medium:update']">编辑数据源</el-button>
          <el-button link type="success" :loading="connectionLoading[card.id]" @click="handleTestConnection(card)" v-hasPermi="['rag:storage-medium:delete']">
            {{ card.mediumType === '2' ? '挂载校验' : '连接测试' }}
          </el-button>
          <el-button
            link
            type="primary"
            :disabled="card.tasks.length > 0"
            @click="openTaskForm('create', undefined, card.id)"
            v-hasPermi="['rag:control-task:create']"
          >
            {{ card.tasks.length > 0 ? '已创建基础索引' : '创建索引任务' }}
          </el-button>
          <el-dropdown trigger="click">
            <el-button link type="info">更多<Icon icon="ep:arrow-down" class="ml-3px" /></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="openTaskDrawer(card)">任务明细</el-dropdown-item>
                <el-dropdown-item v-if="card.tasks[0]" @click="handleStart(card.tasks[0])">启动最近任务</el-dropdown-item>
                <el-dropdown-item divided @click="handleDeleteStorage(card.id)">删除数据源</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <ContentWrap v-if="!loading && filteredCards.length === 0">
      <el-empty description="暂无匹配的数据源">
        <el-button type="primary" @click="openStorageForm('create')">新增数据源</el-button>
      </el-empty>
    </ContentWrap>

    <el-drawer v-model="taskDrawerVisible" :title="`${currentCard?.mediumName || ''} · 索引任务`" size="70%">
      <el-table :data="currentCard?.tasks || []" stripe>
        <el-table-column label="任务名称" prop="taskName" min-width="180" show-overflow-tooltip />
        <el-table-column label="文件总量" prop="totalFiles" width="110" />
        <el-table-column label="内容成功" prop="contentProcessedCount" width="110" />
        <el-table-column label="内容异常" prop="contentErrorCount" width="110" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="taskStatusMeta(row.status).type">{{ taskStatusMeta(row.status).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后执行时间" prop="lastExecuteTime" min-width="170" show-overflow-tooltip />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleStart(row)" v-hasPermi="['rag:control-task:update']">启动</el-button>
            <el-button link type="warning" @click="handlePause(row)" v-hasPermi="['rag:control-task:update']">停止</el-button>
            <el-button link type="primary" @click="openTaskForm('update', row.id)" v-hasPermi="['rag:control-task:update']">编辑</el-button>
            <el-button link type="success" @click="openAnalysis(row)">分类统计</el-button>
            <el-button link type="danger" @click="handleDeleteTask(row.id)" v-hasPermi="['rag:control-task:delete']">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <el-drawer v-model="analysisVisible" title="扫描任务分类统计" size="72%">
      <template v-if="currentTask">
        <div class="analysis-header">
          <div>
            <div class="analysis-title">{{ currentTask.taskName }}</div>
            <div class="analysis-subtitle">基础扫描、内容提取、格式分类和源文件明细</div>
          </div>
          <el-button @click="loadAnalysis(currentTask.id)">
            <Icon icon="ep:refresh" class="mr-5px" />刷新
          </el-button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">文件总量</div>
            <div class="stat-value">{{ formatNumber(statistics.totalFiles) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">基础信息</div>
            <div class="stat-value">{{ formatNumber(statistics.basicFileInfoCount) }}</div>
          </div>
          <div class="stat-card success">
            <div class="stat-label">内容提取成功</div>
            <div class="stat-value">{{ formatNumber(statistics.contentProcessedCount) }}</div>
          </div>
          <div class="stat-card danger">
            <div class="stat-label">内容提取失败</div>
            <div class="stat-value">{{ formatNumber(statistics.contentErrorCount) }}</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-label">处理中</div>
            <div class="stat-value">{{ formatNumber(statistics.processingCount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">等待中</div>
            <div class="stat-value">{{ formatNumber(statistics.waitingCount) }}</div>
          </div>
        </div>

        <ContentWrap class="!mt-16px">
          <div class="format-toolbar">
            <div class="section-title">格式分类统计</div>
            <div class="section-tip">点击 PDF、文档、视频等卡片，可钻取对应源文件明细</div>
          </div>
          <div class="format-grid">
            <div
              v-for="item in formatStats"
              :key="item.formatGroup"
              class="format-card"
              :class="{ active: detailQuery.formatGroup === item.formatGroup }"
              @click="filterByFormat(item.formatGroup)"
            >
              <div class="format-name">{{ formatGroupLabel(item.formatGroup) }}</div>
              <div class="format-count">{{ formatNumber(item.count) }}</div>
            </div>
          </div>
        </ContentWrap>

        <ContentWrap class="!mt-16px">
          <el-form :inline="true" :model="detailQuery" label-width="84px">
            <el-form-item label="文件名称">
              <el-input v-model="detailQuery.keyword" class="!w-240px" clearable placeholder="请输入文件名" />
            </el-form-item>
            <el-form-item label="总体状态">
              <el-select v-model="detailQuery.overallStatus" class="!w-180px" clearable placeholder="请选择状态">
                <el-option label="等待中" value="waiting" />
                <el-option label="处理中" value="processing" />
                <el-option label="成功" value="success" />
                <el-option label="失败" value="error" />
              </el-select>
            </el-form-item>
            <el-form-item label="格式分组">
              <el-select v-model="detailQuery.formatGroup" class="!w-180px" clearable placeholder="请选择格式分组">
                <el-option v-for="item in formatOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadDetailPage"><Icon icon="ep:search" class="mr-5px" />查询明细</el-button>
              <el-button @click="resetDetailQuery"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="detailLoading" :data="detailList" stripe class="!mt-12px">
            <el-table-column label="文件名称" prop="fileName" min-width="220" show-overflow-tooltip />
            <el-table-column label="来源" prop="sourceType" width="100" />
            <el-table-column label="格式分组" prop="formatGroup" width="120">
              <template #default="{ row }">{{ formatGroupLabel(row.formatGroup) }}</template>
            </el-table-column>
            <el-table-column label="扩展名" prop="fileExt" width="100" />
            <el-table-column label="基础状态" prop="basicInfoStatus" width="100" />
            <el-table-column label="内容状态" prop="contentProcessStatus" width="100" />
            <el-table-column label="总体状态" prop="overallStatus" width="100" />
            <el-table-column label="文件大小" width="120">
              <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
            </el-table-column>
            <el-table-column label="错误原因" prop="errorReason" min-width="180" show-overflow-tooltip />
            <el-table-column label="最后更新时间" prop="lastModified" width="180" />
          </el-table>

          <Pagination
            :total="detailTotal"
            v-model:page="detailQuery.pageNo"
            v-model:limit="detailQuery.pageSize"
            @pagination="loadDetailPage"
          />
        </ContentWrap>
      </template>
    </el-drawer>

    <StorageMediumForm ref="storageFormRef" @success="reloadAll" />
    <ControlTaskForm ref="taskFormRef" @success="reloadAll" />
  </div>
</template>

<script setup lang="ts">
import { ControlTaskApi, type ControlTaskVO } from '@/api/rag/controltask'
import { StorageMediumApi, type StorageMediumVO } from '@/api/rag/storagemedium'
import ControlTaskForm from '../controltask/ControlTaskForm.vue'
import StorageMediumForm from '../storagemedium/StorageMediumForm.vue'

defineOptions({ name: 'RagDataSource' })

type TaskRow = ControlTaskVO & {
  basicFileInfoCount?: number
  contentProcessedCount?: number
  contentErrorCount?: number
}
type SourceCard = StorageMediumVO & {
  tasks: TaskRow[]
  totalFiles: number
  successCount: number
  errorCount: number
}

const message = useMessage()
const { t } = useI18n()
const loading = ref(false)
const storageList = ref<StorageMediumVO[]>([])
const taskList = ref<TaskRow[]>([])
const storageFormRef = ref()
const taskFormRef = ref()
const taskDrawerVisible = ref(false)
const analysisVisible = ref(false)
const detailLoading = ref(false)
const currentCard = ref<SourceCard>()
const currentTask = ref<TaskRow>()
const statistics = ref<any>({})
const detailList = ref<any[]>([])
const detailTotal = ref(0)
const connectionLoading = ref<Record<number, boolean>>({})
const actionLoading = ref<Record<number, boolean>>({})
const filters = reactive({
  keyword: '',
  mediumType: '',
  connection: ''
})
const detailQuery = reactive({
  id: undefined as number | undefined,
  pageNo: 1,
  pageSize: 10,
  keyword: undefined as string | undefined,
  overallStatus: undefined as string | undefined,
  formatGroup: undefined as string | undefined
})
const formatOptions = [
  { label: 'Office', value: 'office' },
  { label: 'PDF', value: 'pdf' },
  { label: '文本', value: 'text' },
  { label: '代码', value: 'code' },
  { label: '脚本', value: 'script' },
  { label: '图片', value: 'image' },
  { label: '音频', value: 'audio' },
  { label: '视频', value: 'video' },
  { label: '压缩包', value: 'archive' },
  { label: '设计图', value: 'design' },
  { label: '邮件', value: 'email' },
  { label: '日志', value: 'log' },
  { label: '其他', value: 'other' }
]

const cards = computed<SourceCard[]>(() => {
  return storageList.value.map((storage) => {
    const tasks = taskList.value.filter((task) => task.storageId === storage.id)
    return {
      ...storage,
      tasks,
      totalFiles: tasks.reduce((sum, item) => sum + Number(item.totalFiles || 0), 0),
      successCount: tasks.reduce((sum, item) => sum + Number(item.contentProcessedCount || item.textCount || 0), 0),
      errorCount: tasks.reduce((sum, item) => sum + Number(item.contentErrorCount || 0), 0)
    }
  })
})

const filteredCards = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  return cards.value.filter((card) => {
    const matchedKeyword = !keyword
      || card.mediumName?.toLowerCase().includes(keyword)
      || card.mediumDesc?.toLowerCase().includes(keyword)
      || card.tasks.some((task) => task.taskName?.toLowerCase().includes(keyword))
    const matchedType = !filters.mediumType || card.mediumType === filters.mediumType
    const matchedConnection = !filters.connection
      || (filters.connection === 'connected' && card.mountStatus === 1)
      || (filters.connection === 'disconnected' && card.mountStatus !== 1)
    return matchedKeyword && matchedType && matchedConnection
  })
})
const formatStats = computed(() => {
  const rows = statistics.value?.formatStats || []
  if (rows.length) return rows
  return formatOptions.map((item) => ({ formatGroup: item.value, count: 0 }))
})

const kpiCards = computed(() => [
  { label: '数据源总量', value: formatNumber(storageList.value.length), tip: '数据库与 NAS 接入' },
  { label: '已连接数据源', value: formatNumber(cards.value.filter((item) => item.mountStatus === 1).length), tip: '可用于索引任务' },
  { label: '索引任务', value: formatNumber(taskList.value.length), tip: '扫描与内容提取任务' },
  { label: '累计文件', value: formatNumber(cards.value.reduce((sum, item) => sum + item.totalFiles, 0)), tip: '任务统计口径' },
  { label: '内容成功', value: formatNumber(cards.value.reduce((sum, item) => sum + item.successCount, 0)), tip: '已完成内容提取' },
  { label: '内容异常', value: formatNumber(cards.value.reduce((sum, item) => sum + item.errorCount, 0)), tip: '需要治理修复' }
])

const reloadAll = async () => {
  loading.value = true
  try {
    const [storageData, taskData] = await Promise.all([
      StorageMediumApi.getStorageMediumPage({ pageNo: 1, pageSize: 200 }),
      ControlTaskApi.getControlTaskPage({ pageNo: 1, pageSize: 200 })
    ])
    storageList.value = storageData?.list || []
    taskList.value = taskData?.list || []
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  filters.keyword = filters.keyword.trim()
}
const resetQuery = () => {
  filters.keyword = ''
  filters.mediumType = ''
  filters.connection = ''
}
const openStorageForm = (type: string, id?: number) => storageFormRef.value.open(type, id)
const openTaskForm = (type: string, id?: number, storageId?: number) => {
  if (type === 'create' && storageId && cards.value.some((card) => card.id === storageId && card.tasks.length > 0)) {
    message.warning('该数据源已经创建基础索引任务，不能重复创建')
    return
  }
  taskFormRef.value.open(type, id, storageId ? { storageId } : undefined)
}
const openTaskDrawer = (card: SourceCard) => {
  currentCard.value = card
  taskDrawerVisible.value = true
}

const openAnalysis = async (row: TaskRow) => {
  currentTask.value = row
  detailQuery.id = row.id
  detailQuery.pageNo = 1
  detailQuery.keyword = undefined
  detailQuery.overallStatus = undefined
  detailQuery.formatGroup = undefined
  analysisVisible.value = true
  await loadAnalysis(row.id)
}

const loadAnalysis = async (taskId: number) => {
  statistics.value = await ControlTaskApi.getControlTaskStatistics(taskId)
  await loadDetailPage()
}

const loadDetailPage = async () => {
  if (!detailQuery.id) return
  detailLoading.value = true
  try {
    const data = await ControlTaskApi.getUnifiedDetailPage(detailQuery)
    detailList.value = data.list || []
    detailTotal.value = data.total || 0
  } finally {
    detailLoading.value = false
  }
}

const resetDetailQuery = async () => {
  detailQuery.pageNo = 1
  detailQuery.keyword = undefined
  detailQuery.overallStatus = undefined
  detailQuery.formatGroup = undefined
  await loadDetailPage()
}

const filterByFormat = async (formatGroup: string) => {
  detailQuery.pageNo = 1
  detailQuery.formatGroup = detailQuery.formatGroup === formatGroup ? undefined : formatGroup
  await loadDetailPage()
}

const handleTestConnection = async (row: StorageMediumVO) => {
  if (connectionLoading.value[row.id]) return
  connectionLoading.value[row.id] = true
  try {
    const res = row.mediumType === '2'
      ? await StorageMediumApi.testNasConnection({ nasId: parseNasId(row.configJson) })
      : await StorageMediumApi.testDatabaseConnection(row.id)
    if (res) {
      message.success(row.mediumType === '2' ? 'NAS 挂载状态正常' : '连接成功')
      await reloadAll()
    } else {
      message.error(row.mediumType === '2' ? 'NAS 尚未挂载，请先完成挂载' : '连接失败，请检查参数')
    }
  } finally {
    connectionLoading.value[row.id] = false
  }
}

const handleStart = async (row: TaskRow) => {
  if (actionLoading.value[row.id]) return
  actionLoading.value[row.id] = true
  try {
    await ControlTaskApi.startControlTask({ id: row.id })
    message.success('启动成功')
    await reloadAll()
  } finally {
    actionLoading.value[row.id] = false
  }
}

const handlePause = async (row: TaskRow) => {
  if (actionLoading.value[row.id]) return
  actionLoading.value[row.id] = true
  try {
    await ControlTaskApi.stopControlTask({ id: row.id })
    message.success('停止成功')
    await reloadAll()
  } finally {
    actionLoading.value[row.id] = false
  }
}

const handleDeleteStorage = async (id: number) => {
  try {
    await message.delConfirm()
    await StorageMediumApi.deleteStorageMedium(id)
    message.success(t('common.delSuccess'))
    await reloadAll()
  } catch {}
}

const handleDeleteTask = async (id: number) => {
  try {
    await message.delConfirm()
    await ControlTaskApi.deleteControlTask(id)
    message.success(t('common.delSuccess'))
    await reloadAll()
  } catch {}
}

const mediumTypeLabel = (value?: string) => value === '1' ? '数据库' : value === '2' ? 'NAS / 文件目录' : '其他数据源'
const connectionMeta = (row: StorageMediumVO) => {
  if (row.mountStatus === 1) {
    return {
      label: row.mediumType === '2' ? 'NAS已挂载' : '数据库已连接',
      hint: row.mediumType === '2' ? '挂载校验通过' : '连接测试通过',
      type: 'success' as const,
      className: 'ok'
    }
  }
  return {
    label: row.mediumType === '2' ? 'NAS未挂载' : '数据库未连接',
    hint: row.mediumType === '2' ? '请先完成 NAS 挂载或校验' : '请执行连接测试',
    type: 'danger' as const,
    className: 'bad'
  }
}
const taskStatusMeta = (status?: number) => {
  const map: Record<number, { label: string; type: 'success' | 'warning' | 'info' | 'danger' | 'primary' }> = {
    0: { label: '未开始', type: 'info' },
    1: { label: '进行中', type: 'primary' },
    2: { label: '运行中', type: 'success' },
    3: { label: '已完成', type: 'success' },
    4: { label: '异常', type: 'danger' }
  }
  return map[Number(status)] || { label: '未知', type: 'warning' }
}
const progressPercent = (task: TaskRow) => {
  const total = Number(task.totalFiles || 0)
  if (!total) return 0
  return Math.min(100, Math.round((Number(task.contentProcessedCount || 0) * 100) / total))
}
const parseNasId = (configJson?: string) => {
  try {
    return configJson ? String(JSON.parse(configJson)?.nasId || '') : ''
  } catch {
    return ''
  }
}
const configPreview = (configJson?: string) => {
  try {
    const config = configJson ? JSON.parse(configJson) : {}
    return config.host || config.database || config.source || ''
  } catch {
    return ''
  }
}
const formatNumber = (value?: number | string) => Number(value || 0).toLocaleString()
const formatGroupLabel = (value?: string) => formatOptions.find((item) => item.value === value)?.label || value || '-'
const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(reloadAll)
</script>

<style scoped>
.data-source-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 700; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 800; color: #101828; }
.page-subtitle { margin-top: 6px; color: #667085; }
.head-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
.kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #d9e2ef; border-radius: 6px; box-shadow: 0 10px 24px rgb(28 39 76 / 6%); }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 10px; font-size: 24px; font-weight: 800; color: #101828; }
.kpi-tip { margin-top: 8px; color: #12a666; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.filter-keyword { width: 300px; }
.filter-select { width: 170px; }
.source-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; min-height: 180px; }
.source-card { padding: 18px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); border: 1px solid #d9e2ef; border-radius: 8px; box-shadow: 0 12px 30px rgb(16 24 40 / 7%); }
.card-top { display: flex; gap: 14px; align-items: flex-start; }
.source-icon { width: 48px; height: 48px; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 48px; color: #fff; border-radius: 8px; font-size: 24px; }
.source-icon.db { background: linear-gradient(135deg, #1f6fff, #00a3ff); }
.source-icon.file { background: linear-gradient(135deg, #12a666, #21c6a8); }
.source-main { min-width: 0; flex: 1; }
.source-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.source-title { min-width: 0; overflow: hidden; color: #101828; font-size: 18px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.source-desc { margin-top: 6px; min-height: 20px; color: #667085; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; color: #475467; font-size: 13px; }
.source-meta span { padding: 3px 8px; background: #eef4ff; border: 1px solid #d7e3ff; border-radius: 4px; }
.connection-row { display: grid; grid-template-columns: 72px 110px 1fr; gap: 8px; align-items: center; margin-top: 10px; padding: 8px 10px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; color: #667085; font-size: 13px; }
.connection-row b { font-weight: 800; }
.connection-row b.ok { color: #12a666; }
.connection-row b.bad { color: #d92d20; }
.connection-row em { overflow: hidden; font-style: normal; color: #98a2b3; text-overflow: ellipsis; white-space: nowrap; }
.status-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 16px; padding: 12px; background: #101828; border-radius: 6px; }
.status-strip div { display: flex; flex-direction: column; gap: 6px; }
.status-strip span { color: #98a2b3; font-size: 12px; }
.status-strip b { color: #f9fafb; font-size: 18px; }
.status-strip b.danger { color: #ffb4ab; }
.task-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; min-height: 112px; }
.task-row { display: grid; grid-template-columns: minmax(0, 1fr) 74px 72px; gap: 10px; align-items: center; padding: 10px 12px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.task-name { overflow: hidden; font-weight: 700; color: #101828; text-overflow: ellipsis; white-space: nowrap; }
.task-progress { display: grid; grid-template-columns: 116px 1fr; gap: 8px; align-items: center; margin-top: 6px; color: #667085; font-size: 12px; }
.empty-task { height: 92px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #98a2b3; border: 1px dashed #cfd8e6; border-radius: 6px; background: #fff; }
.card-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e6ebf2; }
.analysis-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
.analysis-title { font-size: 20px; font-weight: 800; color: #101828; }
.analysis-subtitle { margin-top: 4px; color: #667085; }
.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.stat-card { padding: 16px; background: #fff; border: 1px solid #d9e2ef; border-radius: 6px; }
.stat-card.success { background: #f0fff8; border-color: #bdebd3; }
.stat-card.warning { background: #fffbeb; border-color: #fde68a; }
.stat-card.danger { background: #fff1f0; border-color: #ffc9c4; }
.stat-label { color: #667085; font-size: 13px; }
.stat-value { margin-top: 8px; color: #101828; font-size: 28px; font-weight: 800; }
.format-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.section-title { font-size: 16px; font-weight: 800; color: #101828; }
.section-tip { color: #667085; font-size: 13px; }
.format-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.format-card { padding: 14px; cursor: pointer; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; transition: all 0.2s ease; }
.format-card.active,
.format-card:hover { background: #eff6ff; border-color: #1f6fff; }
.format-name { color: #475467; }
.format-count { margin-top: 8px; color: #101828; font-size: 24px; font-weight: 800; }
@media (max-width: 1280px) { .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .source-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-head, .filter-bar, .analysis-header { align-items: flex-start; flex-direction: column; } .head-actions, .filter-keyword, .filter-select { width: 100%; } .kpi-grid, .stats-grid, .format-grid { grid-template-columns: 1fr; } .task-progress, .connection-row { grid-template-columns: 1fr; } }
</style>
