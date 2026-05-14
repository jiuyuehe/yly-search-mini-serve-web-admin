<template>
  <ContentWrap>
    <div class="image-hero">
      <div>
        <div class="image-hero__eyebrow">Image Embedding Control Tower</div>
        <div class="image-hero__title">图片索引管理</div>
        <div class="image-hero__desc">统一查看图片扫描量、向量覆盖率、增长趋势、格式分布和重建入口。</div>
      </div>
      <el-button type="primary" plain @click="openRebuild()">按当前筛选重建向量</el-button>
    </div>
  </ContentWrap>

  <el-row :gutter="16" class="mb-16px">
    <el-col v-for="item in statCards" :key="item.label" :xs="12" :sm="8" :md="4">
      <ContentWrap class="stat-card">
        <div class="stat-card__label">{{ item.label }}</div>
        <div class="stat-card__value">{{ item.value }}</div>
        <div class="stat-card__hint">{{ item.hint }}</div>
      </ContentWrap>
    </el-col>
  </el-row>

  <el-row :gutter="16" class="mb-16px">
    <el-col :xs="24" :md="14">
      <ContentWrap>
        <template #header>最近 7 天增长</template>
        <div class="trend-list">
          <div v-for="item in trend" :key="item.date" class="trend-row">
            <span class="trend-row__date">{{ item.date }}</span>
            <div class="trend-row__bar">
              <span :style="{ width: `${trendPercent(item.imageCount)}%` }"></span>
            </div>
            <span class="trend-row__count">图片 {{ item.imageCount || 0 }} / 向量 {{ item.embeddingCount || 0 }}</span>
          </div>
        </div>
      </ContentWrap>
    </el-col>
    <el-col :xs="24" :md="10">
      <ContentWrap>
        <template #header>格式与来源分布</template>
        <div class="chips">
          <el-tag v-for="item in extDistribution" :key="item.name" effect="plain">{{ item.name }}：{{ item.count }}</el-tag>
        </div>
        <el-divider />
        <div class="chips">
          <el-tag v-for="item in sourceDistribution" :key="item.name" type="success" effect="plain">{{ item.name }}：{{ item.count }}</el-tag>
        </div>
      </ContentWrap>
    </el-col>
  </el-row>

  <ContentWrap>
    <el-form :inline="true" :model="queryParams" class="-mb-15px" label-width="72px">
      <el-form-item label="文件名">
        <el-input v-model="queryParams.keyword" class="!w-220px" clearable placeholder="输入文件名关键词" />
      </el-form-item>
      <el-form-item label="扩展名">
        <el-input v-model="queryParams.fileExt" class="!w-140px" clearable placeholder="jpg/png/webp" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryParams.embeddingStatus" class="!w-160px" clearable placeholder="向量状态">
          <el-option label="待向量化" value="pending" />
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">搜索</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" stripe @selection-change="selection = $event">
      <el-table-column type="selection" width="45" />
      <el-table-column label="缩略图" width="92">
        <template #default="{ row }">
          <el-image v-if="row.thumbnail" class="thumb" :src="`data:image/jpeg;base64,${row.thumbnail}`" fit="cover" />
          <div v-else class="thumb thumb--empty">IMG</div>
        </template>
      </el-table-column>
      <el-table-column label="文件名" prop="fileName" min-width="220" show-overflow-tooltip />
      <el-table-column label="来源" prop="sourceType" width="100" />
      <el-table-column label="扫描任务" prop="taskId" width="120" />
      <el-table-column label="扩展名" prop="fileExt" width="90" />
      <el-table-column label="大小" width="110">
        <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
      </el-table-column>
      <el-table-column label="向量状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.embeddingStatus === 'success' ? 'success' : row.embeddingStatus === 'failed' ? 'danger' : 'info'">
            {{ statusLabel(row.embeddingStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="人脸分析" width="120">
        <template #default="{ row }">
          <el-tag :type="row.faceStatus === 'success' ? 'success' : 'info'">
            {{ row.faceStatus === 'success' ? `已识别 ${row.faceCount || 0}` : '待分析' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="模型" prop="embeddingModel" min-width="180" show-overflow-tooltip />
      <el-table-column label="错误原因" prop="embeddingError" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" fixed="right" width="220">
        <template #default="{ row }">
          <el-button link type="primary" @click="openRebuild([row.esId])">重建</el-button>
          <el-button link type="success" @click="analyzeFace(row)">人脸分析</el-button>
          <el-button link type="info" @click="openFaces(row)">查看人脸</el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </ContentWrap>

  <el-dialog v-model="rebuildVisible" title="重建图片向量" width="560px">
    <el-form :model="rebuildForm" label-width="110px">
      <el-form-item label="Embedding 模型">
        <el-select v-model="rebuildForm.modelId" class="!w-full" filterable placeholder="请选择 type=5 模型">
          <el-option v-for="item in embeddingModels" :key="item.id" :label="`${item.name}（${item.model}）`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="覆盖已有向量">
        <el-switch v-model="rebuildForm.overwrite" />
      </el-form-item>
      <el-alert show-icon :closable="false" type="info" title="未选择具体文件时，会按当前筛选条件重建本页已选范围；建议优先小批量验证模型维度。" />
    </el-form>
    <template #footer>
      <el-button @click="rebuildVisible = false">取消</el-button>
      <el-button type="primary" :loading="rebuildLoading" @click="submitRebuild">开始重建</el-button>
    </template>
  </el-dialog>

  <el-drawer v-model="faceDrawerVisible" title="图片人脸明细" size="620px">
    <div v-loading="faceLoading" class="face-list">
      <div v-for="item in faceList" :key="item.id" class="face-row">
        <img v-if="faceImageSrc(item)" :src="faceImageSrc(item)" />
        <div v-else class="face-empty">FACE</div>
        <div class="face-info">
          <div class="face-title">{{ item.personName || '未命名人脸' }}</div>
          <div class="face-meta">{{ item.fileName }}</div>
          <div class="face-meta">第 {{ (item.faceIndex || 0) + 1 }} 张人脸 · 置信度 {{ facePercent(item.confidence) }}</div>
          <div class="face-meta">{{ item.aliasNames || '暂无别名' }}</div>
          <div class="face-actions">
            <el-tag size="small" effect="plain">{{ item.modelVersion || '-' }}</el-tag>
            <el-button link type="primary" @click="openFaceEdit(item)">标记/编辑</el-button>
          </div>
        </div>
      </div>
      <el-empty v-if="!faceLoading && faceList.length === 0" description="暂无人脸分析结果" />
    </div>
  </el-drawer>

  <el-dialog v-model="faceEditVisible" title="编辑图片人脸" width="520px">
    <el-form :model="faceEditForm" label-width="90px">
      <el-form-item label="姓名">
        <el-input v-model="faceEditForm.personName" placeholder="请输入人员姓名" />
      </el-form-item>
      <el-form-item label="别名">
        <el-input v-model="faceEditForm.aliasNames" placeholder="多个别名可用逗号分隔" />
      </el-form-item>
      <el-form-item label="置信度">
        <el-slider v-model="faceEditForm.confidence" :min="0" :max="1" :step="0.01" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="faceEditForm.remark" type="textarea" :rows="3" placeholder="补充说明" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="faceEditVisible = false">取消</el-button>
      <el-button type="primary" :loading="faceSubmitLoading" @click="submitFaceEdit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ImageIndexApi } from '@/api/rag/image-index'
import { FaceApi } from '@/api/rag/face'
import { ModelApi } from '@/api/ai/model/model'

defineOptions({ name: 'RagImageIndex' })

const message = useMessage()
const loading = ref(false)
const rebuildLoading = ref(false)
const rebuildVisible = ref(false)
const faceDrawerVisible = ref(false)
const stats = ref<any>({})
const trend = ref<any[]>([])
const distribution = ref<any>({})
const list = ref<any[]>([])
const total = ref(0)
const selection = ref<any[]>([])
const embeddingModels = ref<any[]>([])
const selectedEsIds = ref<string[]>([])
const faceLoading = ref(false)
const faceSubmitLoading = ref(false)
const faceList = ref<any[]>([])
const faceEditVisible = ref(false)
const faceEditForm = reactive<any>({})
const currentFaceEsId = ref('')

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  fileExt: '',
  embeddingStatus: ''
})

const rebuildForm = reactive({
  modelId: undefined as number | undefined,
  overwrite: false,
  embeddingTarget: 'image'
})

const statCards = computed(() => [
  { label: '图片总数', value: stats.value.totalImages || 0, hint: '来自主索引 formatGroup=image' },
  { label: '已向量化', value: stats.value.embeddedCount || 0, hint: 'embeddingStatus=success' },
  { label: '待处理', value: stats.value.pendingCount || 0, hint: '等待 embedding' },
  { label: '失败数', value: stats.value.failureCount || 0, hint: '需要重建或排错' },
  { label: '覆盖率', value: `${Math.round((stats.value.coverageRate || 0) * 100)}%`, hint: '向量覆盖图片比例' },
  { label: '今日新增', value: stats.value.todayNewImages || 0, hint: `向量 ${stats.value.todayNewEmbeddings || 0}` }
])

const extDistribution = computed(() => toDistribution(distribution.value.byExt))
const sourceDistribution = computed(() => toDistribution(distribution.value.bySource))
const maxTrend = computed(() => Math.max(1, ...trend.value.map((item) => item.imageCount || 0)))

const getList = async () => {
  loading.value = true
  try {
    const data = await ImageIndexApi.getPage(queryParams)
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const loadDashboard = async () => {
  const [statsData, trendData, distributionData, models] = await Promise.all([
    ImageIndexApi.getStats(),
    ImageIndexApi.getTrend({ days: 7 }),
    ImageIndexApi.getDistribution(),
    ModelApi.getModelSimpleList(5)
  ])
  stats.value = statsData || {}
  trend.value = trendData || []
  distribution.value = distributionData || {}
  embeddingModels.value = models || []
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.fileExt = ''
  queryParams.embeddingStatus = ''
  handleQuery()
}

const openRebuild = (esIds?: string[]) => {
  selectedEsIds.value = esIds || selection.value.map((item) => item.esId)
  rebuildVisible.value = true
}

const submitRebuild = async () => {
  if (!rebuildForm.modelId) {
    message.warning('请选择 Embedding 模型')
    return
  }
  rebuildLoading.value = true
  try {
    const data = await ImageIndexApi.rebuild({
      esIds: selectedEsIds.value,
      modelId: rebuildForm.modelId,
      overwrite: rebuildForm.overwrite,
      embeddingTarget: rebuildForm.embeddingTarget
    })
    message.success(`重建完成：成功 ${data.success || 0}，失败 ${data.failure || 0}`)
    rebuildVisible.value = false
    await Promise.all([loadDashboard(), getList()])
  } finally {
    rebuildLoading.value = false
  }
}

const analyzeFace = async (row: any) => {
  await ImageIndexApi.analyzeFace({ esId: row.esId, overwrite: true })
  message.success('人脸分析完成')
  await getList()
}

const openFaces = async (row: any) => {
  faceDrawerVisible.value = true
  currentFaceEsId.value = row.esId
  faceLoading.value = true
  try {
    faceList.value = await ImageIndexApi.getFaces({ esId: row.esId })
  } finally {
    faceLoading.value = false
  }
}

const openFaceEdit = (row: any) => {
  Object.assign(faceEditForm, {
    id: row.id,
    personName: row.personName,
    aliasNames: row.aliasNames,
    remark: row.remark,
    confidence: row.confidence ?? 0
  })
  faceEditVisible.value = true
}

const submitFaceEdit = async () => {
  faceSubmitLoading.value = true
  try {
    await FaceApi.updateInstance(faceEditForm)
    message.success('人脸信息已更新')
    faceEditVisible.value = false
    if (currentFaceEsId.value) {
      faceList.value = await ImageIndexApi.getFaces({ esId: currentFaceEsId.value })
    }
    await getList()
  } finally {
    faceSubmitLoading.value = false
  }
}

const toDistribution = (obj?: Record<string, number>) => {
  return Object.entries(obj || {}).map(([name, count]) => ({ name, count })).slice(0, 12)
}

const trendPercent = (count?: number) => Math.max(4, Math.round(((count || 0) / maxTrend.value) * 100))
const statusLabel = (status?: string) => ({ success: '成功', failed: '失败', pending: '待处理' }[status || 'pending'] || status)
const facePercent = (value?: number) => value == null ? '-' : `${Math.round(value * 100)}%`
const faceImageSrc = (item: any) => item?.thumbnailUrl || (item?.thumbnail ? `data:image/jpeg;base64,${item.thumbnail}` : '')
const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(async () => {
  await Promise.all([loadDashboard(), getList()])
})
</script>

<style scoped>
.image-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 132px;
  padding: 22px;
  color: #12312b;
  border-radius: 18px;
  background:
    radial-gradient(circle at 20% 20%, rgba(103, 194, 58, 0.24), transparent 34%),
    linear-gradient(135deg, #f4fbf7 0%, #e8f2ff 100%);
}
.image-hero__eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.7; }
.image-hero__title { margin-top: 8px; font-size: 28px; font-weight: 800; }
.image-hero__desc { margin-top: 8px; color: #5f6f72; }
.stat-card { min-height: 108px; }
.stat-card__label { color: #69797b; font-size: 13px; }
.stat-card__value { margin-top: 8px; font-size: 26px; font-weight: 800; color: #173f35; }
.stat-card__hint { margin-top: 4px; color: #8a999c; font-size: 12px; }
.trend-list { display: grid; gap: 12px; }
.trend-row { display: grid; grid-template-columns: 92px 1fr 170px; gap: 12px; align-items: center; }
.trend-row__date { color: #637477; }
.trend-row__bar { height: 10px; overflow: hidden; background: #eef3f1; border-radius: 999px; }
.trend-row__bar span { display: block; height: 100%; background: linear-gradient(90deg, #2fb36d, #48a4ff); border-radius: inherit; }
.trend-row__count { color: #667; font-size: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.thumb { width: 56px; height: 56px; border-radius: 12px; background: #f2f5f7; }
.thumb--empty { display: grid; place-items: center; color: #99a4aa; font-size: 12px; }
.face-list { display: flex; flex-direction: column; gap: 12px; }
.face-row { display: grid; grid-template-columns: 92px 1fr; gap: 14px; padding: 12px; border: 1px solid #e6ebf2; border-radius: 6px; }
.face-row img, .face-empty { width: 92px; height: 92px; border-radius: 6px; object-fit: cover; background: #f3f6fb; display: flex; align-items: center; justify-content: center; color: #8a98ad; font-weight: 700; }
.face-info { min-width: 0; }
.face-title { font-weight: 700; color: #101828; }
.face-meta { margin-top: 6px; color: #667085; }
.face-actions { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
</style>
