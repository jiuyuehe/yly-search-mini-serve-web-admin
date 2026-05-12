<template>
  <div class="metadata-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 元数据数据建模 / <span>内置模型</span></div>
          <div class="page-title">内置模型</div>
        </div>
        <el-button @click="loadModels"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
      </div>
    </ContentWrap>

    <div class="card-grid" v-loading="loading">
      <div v-for="item in models" :key="item.id" class="model-card">
        <div class="card-title-row">
          <div class="card-title">{{ item.name }}</div>
          <el-tag type="success">{{ item.scene }}</el-tag>
        </div>
        <div class="card-desc">{{ item.description || '-' }}</div>
        <div class="metric-grid">
          <div><span>字段</span><b>{{ item.fieldCount || 0 }}</b></div>
          <div><span>数据</span><b>{{ item.resultCount || 0 }}</b></div>
          <div><span>索引</span><b>{{ item.indexExists ? '正常' : '缺失' }}</b></div>
        </div>
        <div class="card-actions">
          <el-button link type="primary" @click="openFields(item)">字段</el-button>
          <el-button link type="primary" @click="editModel(item)" v-hasPermi="['rag:metadata:model']">编辑</el-button>
          <el-button type="primary" @click="loadDemo(item)" v-hasPermi="['rag:metadata:result']">加载 demo 数据</el-button>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="fieldVisible"
      :title="currentModel?.name || '字段结构'"
      width="760px"
      append-to-body
      destroy-on-close
      @closed="currentModel = undefined"
    >
      <el-table :data="fields" border>
        <el-table-column label="字段" prop="label" min-width="160" />
        <el-table-column label="Key" prop="key" min-width="150" />
        <el-table-column label="类型" prop="type" width="140" />
        <el-table-column label="必填" width="90">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'">{{ row.required ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <FormDesigner
      v-model:visible="designerVisible"
      :form="editingModel"
      @save="handleDesignerSave"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { MetadataApi, MetadataModelCardVO } from '@/api/rag/metadata'
import FormDesigner from '@/views/rag/metadata/components/FormDesigner.vue'

defineOptions({ name: 'DataCatalogMetadataBuiltin' })

const loading = ref(false)
const models = ref<MetadataModelCardVO[]>([])
const currentModel = ref<MetadataModelCardVO>()
const fieldVisible = ref(false)
const designerVisible = ref(false)
const editingModel = ref<any>()
const fields = computed(() => parseFields(currentModel.value?.structure))

const loadModels = async () => {
  loading.value = true
  try {
    models.value = await MetadataApi.getBuiltinModels()
  } finally {
    loading.value = false
  }
}

const openFields = (item: MetadataModelCardVO) => {
  fieldVisible.value = false
  currentModel.value = item
  nextTick(() => {
    fieldVisible.value = true
  })
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

const handleDesignerSave = async () => {
  designerVisible.value = false
  editingModel.value = undefined
  await loadModels()
}

const loadDemo = async (item: MetadataModelCardVO) => {
  const result = await MetadataApi.loadBuiltinDemo(item.id as number)
  ElMessage.success(`已加载 ${result.loadedCount || 0} 条 demo 数据`)
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

onMounted(loadModels)
</script>

<style scoped>
.metadata-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.model-card { min-height: 230px; padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; display: flex; flex-direction: column; gap: 12px; }
.card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; font-weight: 800; }
.card-desc { min-height: 44px; color: #667085; line-height: 22px; }
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.metric-grid div { padding: 10px; background: #f8fafc; border-radius: 6px; }
.metric-grid span { display: block; color: #667085; font-size: 12px; }
.metric-grid b { display: block; margin-top: 6px; color: #101828; }
.card-actions { margin-top: auto; display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 1200px) { .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .card-grid { grid-template-columns: 1fr; } }
</style>
