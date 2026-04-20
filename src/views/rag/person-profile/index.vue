<template>
  <ContentWrap>
    <div class="header-row">
      <div>
        <div class="title">人员档案与知识图谱</div>
        <div class="subtitle">基于 NER 自动建档、保守合并、溯源回看与人物共现图谱</div>
      </div>
      <div class="header-actions">
        <el-button type="success" plain :loading="backfillLoading" @click="handleBackfill">
          <Icon icon="ep:refresh" class="mr-5px" />
          NER 回填建档
        </el-button>
        <el-button type="warning" plain :loading="mergeScanLoading" @click="handleScanMergeCandidates">
          <Icon icon="ep:operation" class="mr-5px" />
          扫描冲突候选
        </el-button>
        <el-button type="primary" @click="openForm()">
          <Icon icon="ep:plus" class="mr-5px" />
          新增人员档案
        </el-button>
      </div>
    </div>
  </ContentWrap>

  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="72px">
      <el-form-item label="姓名">
        <el-input v-model="queryParams.personName" class="!w-220px" clearable placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="性别">
        <el-select v-model="queryParams.gender" class="!w-160px" clearable placeholder="请选择性别">
          <el-option label="男" value="男" />
          <el-option label="女" value="女" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryParams.status" class="!w-160px" clearable placeholder="请选择状态">
          <el-option label="启用" :value="0" />
          <el-option label="停用" :value="1" />
        </el-select>
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
    <div class="workbench-header">
      <div>
        <div class="workbench-title">冲突待确认合并工作台</div>
        <div class="workbench-subtitle">同归一化姓名但性别或年龄冲突的档案会进入这里，等待人工确认</div>
      </div>
      <div class="workbench-actions">
        <el-input v-model="mergeQuery.keyword" class="!w-220px" clearable placeholder="按归一化姓名筛选" />
        <el-select v-model="mergeQuery.status" class="!w-160px" clearable placeholder="请选择状态">
          <el-option label="待确认" :value="0" />
          <el-option label="已合并" :value="1" />
          <el-option label="已忽略" :value="2" />
        </el-select>
        <el-button type="primary" @click="handleMergeQuery">
          <Icon icon="ep:search" class="mr-5px" />
          查询候选
        </el-button>
      </div>
    </div>

    <el-table v-loading="mergeLoading" :data="mergeList" stripe class="!mt-16px">
      <el-table-column label="归一化姓名" prop="normalizedName" width="180" show-overflow-tooltip />
      <el-table-column label="目标档案" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <div>{{ row.targetProfileName || '-' }}</div>
          <div class="candidate-meta">性别：{{ row.targetGender || '-' }} / 年龄：{{ row.targetAge ?? '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="待合并档案" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <div>{{ row.sourceProfileName || '-' }}</div>
          <div class="candidate-meta">性别：{{ row.sourceGender || '-' }} / 年龄：{{ row.sourceAge ?? '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="冲突字段" prop="conflictFields" width="140" />
      <el-table-column label="冲突原因" prop="conflictReason" min-width="240" show-overflow-tooltip />
      <el-table-column label="状态" prop="status" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 0 ? 'warning' : row.status === 1 ? 'success' : 'info'">
            {{ row.status === 0 ? '待确认' : row.status === 1 ? '已合并' : '已忽略' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="success" :disabled="row.status !== 0" @click="handleApproveMerge(row)">确认合并</el-button>
          <el-button link type="info" :disabled="row.status !== 0" @click="handleRejectMerge(row)">忽略</el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination
      :total="mergeTotal"
      v-model:page="mergeQuery.pageNo"
      v-model:limit="mergeQuery.pageSize"
      @pagination="getMergeCandidateList"
    />
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column label="姓名" prop="personName" min-width="160" />
      <el-table-column label="别名" prop="aliasNames" min-width="200" show-overflow-tooltip />
      <el-table-column label="性别" prop="gender" width="100" />
      <el-table-column label="年龄" prop="age" width="100" />
      <el-table-column label="溯源数量" prop="evidenceCount" width="100" />
      <el-table-column label="简介" prop="summary" min-width="240" show-overflow-tooltip />
      <el-table-column label="状态" prop="status" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 0 ? 'success' : 'info'">
            {{ row.status === 0 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="220">
        <template #default="{ row }">
          <el-button link type="primary" @click="openForm(row)">编辑</el-button>
          <el-button link type="success" @click="openDetail(row)">溯源</el-button>
          <el-button link type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="formVisible" :title="formData.id ? '编辑人员档案' : '新增人员档案'" width="620px">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="90px">
      <el-form-item label="姓名" prop="personName">
        <el-input v-model="formData.personName" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="别名">
        <el-input v-model="formData.aliasNames" placeholder="多个别名用逗号分隔" />
      </el-form-item>
      <el-form-item label="性别">
        <el-select v-model="formData.gender" class="!w-full" clearable>
          <el-option label="男" value="男" />
          <el-option label="女" value="女" />
        </el-select>
      </el-form-item>
      <el-form-item label="年龄">
        <el-input-number v-model="formData.age" class="!w-full" :controls="false" :min="0" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="formData.status" class="!w-full">
          <el-option label="启用" :value="0" />
          <el-option label="停用" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="简介">
        <el-input v-model="formData.summary" type="textarea" :rows="3" placeholder="请输入简介" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>

  <el-drawer v-model="detailVisible" title="人员档案详情与溯源" size="56%">
    <template v-if="detailRow">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="姓名">{{ detailRow.personName }}</el-descriptions-item>
        <el-descriptions-item label="别名">{{ detailRow.aliasNames || '-' }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ detailRow.gender || '-' }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ detailRow.age ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="简介">{{ detailRow.summary || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-table v-loading="evidenceLoading" :data="evidenceList" stripe class="!mt-16px">
        <el-table-column label="文件名称" prop="fileName" min-width="220" show-overflow-tooltip />
        <el-table-column label="命中文本" prop="matchedText" width="140" />
        <el-table-column label="偏移量" prop="matchedOffset" width="100" />
        <el-table-column label="来源任务" prop="sourceTaskType" width="120" />
        <el-table-column label="文档ID" prop="esId" min-width="220" show-overflow-tooltip />
      </el-table>

      <Pagination :total="evidenceTotal" v-model:page="evidenceQuery.pageNo" v-model:limit="evidenceQuery.pageSize" @pagination="loadEvidence" />
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { PersonProfileApi, PersonProfileVO } from '@/api/rag/person-profile'
import * as echarts from 'echarts'

defineOptions({ name: 'RagPersonProfile' })

const message = useMessage()
const loading = ref(false)
const backfillLoading = ref(false)
const mergeScanLoading = ref(false)
const mergeLoading = ref(false)
const submitLoading = ref(false)
const formVisible = ref(false)
const detailVisible = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const detailRow = ref<any>()
const evidenceList = ref<any[]>([])
const evidenceTotal = ref(0)
const evidenceLoading = ref(false)
const mergeList = ref<any[]>([])
const mergeTotal = ref(0)
const graphRef = ref<HTMLElement>()
let graphChart: echarts.ECharts | null = null
const queryFormRef = ref()
const formRef = ref()

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  personName: undefined,
  gender: undefined,
  status: undefined
})

const evidenceQuery = reactive({
  profileId: undefined as number | undefined,
  pageNo: 1,
  pageSize: 10
})

const mergeQuery = reactive({
  pageNo: 1,
  pageSize: 8,
  keyword: undefined as string | undefined,
  status: 0 as number | undefined
})

const formData = reactive<PersonProfileVO>({
  personName: '',
  aliasNames: '',
  gender: undefined,
  age: undefined,
  summary: '',
  status: 0
})

const rules = {
  personName: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const getList = async () => {
  loading.value = true
  try {
    const data = await PersonProfileApi.getPage(queryParams)
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const getGraph = async () => {
  const data = await PersonProfileApi.getGraph(queryParams.personName)
  nextTick(() => renderGraph(data || { nodes: [], edges: [] }))
}

const handleQuery = async () => {
  queryParams.pageNo = 1
  await Promise.all([getList(), getGraph()])
}

const resetQuery = async () => {
  queryFormRef.value?.resetFields()
  await handleQuery()
}

const openForm = (row?: any) => {
  Object.assign(formData, {
    id: row?.id,
    personName: row?.personName || '',
    aliasNames: row?.aliasNames || '',
    gender: row?.gender,
    age: row?.age,
    summary: row?.summary || '',
    status: row?.status ?? 0
  })
  formVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitLoading.value = true
  try {
    if (formData.id) {
      await PersonProfileApi.update(formData)
      message.success('更新成功')
    } else {
      await PersonProfileApi.create(formData)
      message.success('创建成功')
    }
    formVisible.value = false
    await Promise.all([getList(), getGraph()])
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (id: number) => {
  await message.delConfirm()
  await PersonProfileApi.delete(id)
  message.success('删除成功')
  await Promise.all([getList(), getGraph()])
}

const handleBackfill = async () => {
  backfillLoading.value = true
  try {
    const result = await PersonProfileApi.backfillNer(1000)
    message.success(`回填完成：新增 ${result.createdProfiles || 0}，新增证据 ${result.createdEvidence || 0}`)
    await Promise.all([getList(), getGraph()])
  } finally {
    backfillLoading.value = false
  }
}

const getMergeCandidateList = async () => {
  mergeLoading.value = true
  try {
    const data = await PersonProfileApi.getMergeCandidatePage(mergeQuery)
    mergeList.value = data.list || []
    mergeTotal.value = data.total || 0
  } finally {
    mergeLoading.value = false
  }
}

const handleMergeQuery = async () => {
  mergeQuery.pageNo = 1
  await getMergeCandidateList()
}

const handleScanMergeCandidates = async () => {
  mergeScanLoading.value = true
  try {
    const result = await PersonProfileApi.scanMergeCandidates()
    message.success(`冲突候选扫描完成：新增 ${result.created || 0}，更新 ${result.updated || 0}，待确认 ${result.pending || 0}`)
    await getMergeCandidateList()
  } finally {
    mergeScanLoading.value = false
  }
}

const handleApproveMerge = async (row: any) => {
  try {
    await message.confirm('确认将该候选合并到目标档案吗？')
  } catch {
    return
  }
  await PersonProfileApi.approveMergeCandidate(row.id)
  message.success('已确认合并')
  await Promise.all([getList(), getGraph(), getMergeCandidateList()])
}

const handleRejectMerge = async (row: any) => {
  await PersonProfileApi.rejectMergeCandidate(row.id)
  message.success('已忽略该候选')
  await getMergeCandidateList()
}

const openDetail = async (row: any) => {
  detailRow.value = row
  evidenceQuery.profileId = row.id
  evidenceQuery.pageNo = 1
  detailVisible.value = true
  await loadEvidence()
}

const loadEvidence = async () => {
  if (!evidenceQuery.profileId) return
  evidenceLoading.value = true
  try {
    const data = await PersonProfileApi.getEvidencePage(evidenceQuery)
    evidenceList.value = data.list || []
    evidenceTotal.value = data.total || 0
  } finally {
    evidenceLoading.value = false
  }
}

const renderGraph = (graphData: any) => {
  if (!graphRef.value) return
  if (!graphChart) {
    graphChart = echarts.init(graphRef.value)
    graphChart.on('click', (params: any) => {
      if (params?.dataType === 'node') {
        queryParams.personName = params.data.name
        void handleQuery()
      }
    })
  }
  const nodes = (graphData.nodes || []).map((item: any) => ({
    ...item,
    name: item.name,
    value: item.evidenceCount || 1,
    symbolSize: 24 + Math.min((item.evidenceCount || 1) * 2, 24)
  }))
  const links = (graphData.edges || []).map((item: any) => ({
    source: item.source,
    target: item.target,
    value: item.weight || 1,
    lineStyle: { width: Math.max(1, Math.min(item.weight || 1, 8)) }
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
        force: { repulsion: 220, edgeLength: 120 }
      }
    ]
  })
}

onMounted(async () => {
  await Promise.all([getList(), getGraph(), getMergeCandidateList()])
})
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
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

.workbench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.workbench-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.workbench-title {
  font-size: 18px;
  font-weight: 600;
}

.workbench-subtitle {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

.candidate-meta {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}
</style>
