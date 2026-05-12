<template>
  <div class="metadata-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 元数据数据建模 / <span>数据模型列表</span></div>
          <div class="page-title">数据模型列表</div>
        </div>
        <el-button type="primary" @click="loadModels"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div v-for="item in kpis" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">{{ item.delta }}</div>
      </div>
    </div>

    <ContentWrap>
      <el-form :inline="true" :model="query">
        <el-form-item label="模型名称">
          <el-input v-model="query.name" class="!w-240px" clearable placeholder="搜索模型" @keyup.enter="loadModels" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" class="!w-160px" clearable placeholder="全部">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadModels"><Icon icon="ep:search" class="mr-5px" />查询</el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <div class="card-grid" v-loading="loading">
      <div v-for="item in models" :key="item.id" class="model-card">
        <div class="card-title-row">
          <div class="card-title">{{ item.name }}</div>
          <el-tag :type="item.status === 1 ? 'success' : 'info'">{{ item.status === 1 ? '启用' : '禁用' }}</el-tag>
        </div>
        <div class="card-desc">{{ item.description || '-' }}</div>
        <div class="metric-grid">
          <div><span>字段</span><b>{{ item.fieldCount || 0 }}</b></div>
          <div><span>数据量</span><b>{{ item.resultCount || 0 }}</b></div>
          <div><span>索引</span><b>{{ item.indexExists ? '正常' : '缺失' }}</b></div>
          <div><span>发布</span><b>{{ item.systemFlag === 1 ? '内置' : '自建' }}</b></div>
        </div>
        <div class="card-foot">
          <span>{{ item.updateTime || '-' }}</span>
          <div class="card-actions">
            <el-button link type="primary" @click="editModel(item)">编辑</el-button>
            <el-button link type="primary" @click="openDetail(item)">详情</el-button>
            <el-button
              v-if="canDeleteModel(item)"
              link
              type="danger"
              @click="deleteModel(item)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <FormDesigner
      v-model:visible="designerVisible"
      :form="editingModel"
      @save="handleDesignerSave"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MetadataApi, MetadataModelCardVO } from '@/api/rag/metadata'
import FormDesigner from '@/views/rag/metadata/components/FormDesigner.vue'

defineOptions({ name: 'DataCatalogMetadataModels' })

const loading = ref(false)
const models = ref<MetadataModelCardVO[]>([])
const router = useRouter()
const query = reactive({ name: '', status: undefined as number | undefined })
const designerVisible = ref(false)
const editingModel = ref<any>()

const kpis = computed(() => [
  { label: '模型总数', value: formatNumber(models.value.length), delta: '当前筛选' },
  { label: '启用模型', value: formatNumber(models.value.filter((item) => item.status === 1).length), delta: '可填充' },
  { label: '字段总数', value: formatNumber(models.value.reduce((sum, item) => sum + Number(item.fieldCount || 0), 0)), delta: '结构字段' },
  { label: '结果数据', value: formatNumber(models.value.reduce((sum, item) => sum + Number(item.resultCount || 0), 0)), delta: 'ES 行数' }
])

const loadModels = async () => {
  loading.value = true
  try {
    models.value = await MetadataApi.getModelCards(query)
  } finally {
    loading.value = false
  }
}

const openDetail = (item: MetadataModelCardVO) => {
  router.push({ path: '/data-catalog/metadata/models/detail', query: { id: item.id } })
}

const editModel = (item: MetadataModelCardVO) => {
  designerVisible.value = false
  editingModel.value = undefined
  nextTick(() => {
    editingModel.value = {
      ...item,
      schema: parseFields(item.structure)
    }
    designerVisible.value = true
  })
}

const canDeleteModel = (item: MetadataModelCardVO) => Boolean(item.id) && item.systemFlag !== 1

const deleteModel = async (item: MetadataModelCardVO) => {
  if (!item.id || item.systemFlag === 1) return
  await ElMessageBox.confirm(
    `确认删除模型「${item.name}」？删除后会同步删除关联 ES 索引与数据。`,
    '删除模型',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  )
  await MetadataApi.delete(item.id)
  ElMessage.success('模型已删除')
  await loadModels()
}

const handleDesignerSave = async () => {
  designerVisible.value = false
  editingModel.value = undefined
  await loadModels()
}
const parseFields = (structure?: string) => {
  if (!structure) return []
  try {
    const parsed = JSON.parse(structure)
    return Array.isArray(parsed) ? parsed : parsed?.fields || parsed?.schema || []
  } catch {
    return []
  }
}
const formatNumber = (value?: number | string) => Number(value || 0).toLocaleString()

onMounted(loadModels)
</script>

<style scoped>
.metadata-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 28px; font-weight: 800; }
.kpi-delta { margin-top: 10px; color: #12a666; }
.card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.model-card { min-height: 230px; padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; display: flex; flex-direction: column; gap: 12px; }
.card-title-row, .card-foot, .card-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; font-weight: 800; }
.card-desc { min-height: 44px; color: #667085; line-height: 22px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.metric-grid div { padding: 10px; background: #f8fafc; border-radius: 6px; }
.metric-grid span { display: block; color: #667085; font-size: 12px; }
.metric-grid b { display: block; margin-top: 6px; color: #101828; }
.card-foot { margin-top: auto; color: #667085; }
@media (max-width: 1200px) { .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .card-grid, .kpi-grid { grid-template-columns: 1fr; } }
</style>
