<template>
  <div class="face-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="eyebrow">Face Asset Center</div>
          <div class="title">人脸库管理</div>
          <div class="subtitle">统一管理图片索引过程中识别到的人脸、命名信息和来源图片。</div>
        </div>
        <el-button type="primary" plain @click="loadAll">
          <Icon icon="ep:refresh" class="mr-5px" />
          刷新
        </el-button>
      </div>
    </ContentWrap>

    <div class="kpi-grid" v-loading="loading">
      <div v-for="item in kpis" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">{{ item.delta }}</div>
      </div>
    </div>

    <ContentWrap>
      <el-form :inline="true" :model="queryParams" class="-mb-15px" label-width="72px">
        <el-form-item label="关键词">
          <el-input v-model="queryParams.keyword" class="!w-260px" clearable placeholder="姓名、别名" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" class="!w-160px" clearable placeholder="全部">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
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
      <div class="face-grid" v-loading="loading">
        <div v-for="item in list" :key="item.id" class="face-card">
          <div class="avatar">
            <img v-if="personImageSrc(item)" :src="personImageSrc(item)" />
            <Icon v-else icon="ep:user" />
          </div>
          <div class="face-info">
            <div class="face-name">{{ item.personName || '未命名人脸' }}</div>
            <div class="face-meta">{{ item.aliasNames || '暂无别名' }}</div>
            <div class="chips">
              <el-tag size="small" effect="plain">实例 {{ item.instanceCount || 0 }}</el-tag>
              <el-tag size="small" :type="isNamed(item) ? 'success' : 'warning'" effect="plain">
                {{ isNamed(item) ? '已命名' : '待命名' }}
              </el-tag>
            </div>
          </div>
          <div class="card-actions">
            <el-button link type="primary" @click="openEdit(item)">命名/编辑</el-button>
            <el-button link type="info" @click="openInstances(item)">关联图片</el-button>
            <el-button v-if="!item.systemBuiltIn" link type="danger" @click="handleDelete(item)">删除</el-button>
          </div>
        </div>
      </div>
      <Pagination :total="total" v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" @pagination="getList" />
    </ContentWrap>

    <el-dialog v-model="editVisible" title="人脸命名" width="520px">
      <el-form :model="editForm" label-width="86px">
        <el-form-item label="姓名">
          <el-input v-model="editForm.personName" placeholder="请输入人员姓名" />
        </el-form-item>
        <el-form-item label="别名">
          <el-input v-model="editForm.aliasNames" placeholder="多个别名可用逗号分隔" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="3" placeholder="补充说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="instanceVisible" title="关联图片" size="520px">
      <div v-loading="instanceLoading" class="instance-list">
        <div v-for="item in instances" :key="item.id" class="instance-row">
          <img v-if="faceImageSrc(item)" :src="faceImageSrc(item)" />
          <div v-else class="mini-empty">FACE</div>
          <div>
            <div class="instance-title">{{ item.fileName }}</div>
            <div class="instance-meta">相似置信度 {{ percent(item.confidence) }} · {{ item.modelVersion }}</div>
            <div class="instance-path">{{ item.filePath || item.sourceEsId }}</div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { FaceApi } from '@/api/rag/face'

defineOptions({ name: 'DataCatalogFaceLibrary' })

const message = useMessage()
const loading = ref(false)
const submitLoading = ref(false)
const instanceLoading = ref(false)
const editVisible = ref(false)
const instanceVisible = ref(false)
const stats = ref<any>({})
const list = ref<any[]>([])
const total = ref(0)
const instances = ref<any[]>([])

const queryParams = reactive({
  pageNo: 1,
  pageSize: 12,
  keyword: '',
  status: undefined as number | undefined
})

const editForm = reactive<any>({})

const kpis = computed(() => [
  { label: '人脸主体', value: stats.value.totalPersons || 0, delta: '可命名管理' },
  { label: '已命名', value: stats.value.namedPersons || 0, delta: '可被姓名检索' },
  { label: '待命名', value: stats.value.unnamedPersons || 0, delta: '需人工确认' },
  { label: '人脸实例', value: stats.value.totalInstances || 0, delta: '来自图片索引' },
  { label: '模型状态', value: stats.value.modelHealth?.loaded ? '在线' : '离线', delta: stats.value.modelHealth?.modelVersion || '-' }
])

const loadStats = async () => {
  stats.value = await FaceApi.getStats()
}

const getList = async () => {
  loading.value = true
  try {
    const data = await FaceApi.getPersonPage(queryParams)
    list.value = data.list || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const loadAll = async () => {
  await Promise.all([loadStats(), getList()])
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.status = undefined
  handleQuery()
}

const openEdit = (row: any) => {
  Object.assign(editForm, row)
  editVisible.value = true
}

const submitEdit = async () => {
  submitLoading.value = true
  try {
    await FaceApi.updatePerson(editForm)
    message.success('保存成功')
    editVisible.value = false
    await loadAll()
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: any) => {
  await message.delConfirm()
  await FaceApi.deletePerson(row.id)
  message.success('删除成功')
  await loadAll()
}

const openInstances = async (row: any) => {
  instanceVisible.value = true
  instanceLoading.value = true
  try {
    instances.value = await FaceApi.getInstances({ personId: row.id })
  } finally {
    instanceLoading.value = false
  }
}

const isNamed = (item: any) => item.personName && !item.personName.startsWith('未命名人脸')
const percent = (value?: number) => value == null ? '-' : `${Math.round(value * 100)}%`
const personImageSrc = (item: any) => item?.coverImageUrl || (item?.coverThumbnail ? `data:image/jpeg;base64,${item.coverThumbnail}` : '')
const faceImageSrc = (item: any) => item?.thumbnailUrl || (item?.thumbnail ? `data:image/jpeg;base64,${item.thumbnail}` : '')

onMounted(loadAll)
</script>

<style scoped>
.face-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.eyebrow { color: #1f6fff; font-weight: 700; }
.title { margin-top: 8px; font-size: 24px; font-weight: 800; color: #101828; }
.subtitle { margin-top: 6px; color: #667085; }
.kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 10px; font-size: 24px; font-weight: 800; color: #101828; }
.kpi-delta { margin-top: 8px; color: #12a666; }
.face-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; min-height: 180px; }
.face-card { display: grid; grid-template-columns: 82px 1fr; gap: 12px; padding: 14px; border: 1px solid #e6ebf2; border-radius: 6px; background: #fff; }
.avatar { width: 82px; height: 82px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f3f6fb; color: #8a98ad; border-radius: 6px; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.face-name { font-weight: 800; color: #101828; }
.face-meta { margin-top: 6px; color: #667085; min-height: 20px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.card-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #eef2f7; padding-top: 10px; }
.instance-list { display: flex; flex-direction: column; gap: 12px; }
.instance-row { display: grid; grid-template-columns: 72px 1fr; gap: 12px; padding: 12px; border: 1px solid #e6ebf2; border-radius: 6px; }
.instance-row img, .mini-empty { width: 72px; height: 72px; border-radius: 6px; object-fit: cover; background: #f3f6fb; display: flex; align-items: center; justify-content: center; color: #8a98ad; font-weight: 700; }
.instance-title { font-weight: 700; color: #101828; }
.instance-meta { margin-top: 6px; color: #12a666; }
.instance-path { margin-top: 6px; color: #667085; word-break: break-all; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } .face-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .page-head { flex-direction: column; align-items: flex-start; } .kpi-grid, .face-grid { grid-template-columns: 1fr; } }
</style>
