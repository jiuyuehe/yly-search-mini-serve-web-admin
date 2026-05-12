<template>
  <div class="metadata-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 元数据数据建模 / <span>模板市场管理</span></div>
          <div class="page-title">模板市场管理</div>
        </div>
        <div class="head-actions">
          <el-button type="primary" @click="openAiDraft">
            <Icon icon="ep:magic-stick" class="mr-5px" />AI 创建卡片
          </el-button>
          <el-button @click="loadTemplates"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
        </div>
      </div>
    </ContentWrap>

    <ContentWrap>
      <el-form :inline="true" :model="query">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" class="!w-240px" clearable placeholder="搜索模板" @keyup.enter="loadTemplates" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.category" class="!w-180px" clearable placeholder="全部">
            <el-option label="全部" value="all" />
            <el-option label="内置模型" value="builtin" />
            <el-option label="NER" value="ner" />
            <el-option label="人物画像" value="person" />
            <el-option label="邮件分析" value="mail" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadTemplates"><Icon icon="ep:search" class="mr-5px" />查询</el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <div class="card-grid" v-loading="loading">
      <div v-for="item in templates" :key="item.id || item.name" class="model-card">
        <div class="card-title-row">
          <div class="card-title">{{ item.name }}</div>
          <el-tag effect="plain">{{ item.scene || item.category }}</el-tag>
        </div>
        <div class="card-desc">{{ item.description || '-' }}</div>
        <div class="card-meta">
          <span>字段 {{ item.fieldCount || 0 }}</span>
          <span>{{ item.esIndexName || '未建索引' }}</span>
        </div>
        <div class="card-actions">
          <el-button link type="primary" @click="previewTemplate(item)">预览</el-button>
          <el-button link type="primary" @click="editTemplate(item)" v-hasPermi="['rag:metadata:model']">编辑</el-button>
          <el-button
            v-if="canDeleteTemplate(item)"
            link
            type="danger"
            @click="deleteTemplate(item)"
            v-hasPermi="['rag:metadata:model']"
          >
            删除
          </el-button>
          <el-button type="primary" @click="createFromTemplate(item)" v-hasPermi="['rag:metadata:model']">创建模型</el-button>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="previewVisible"
      :title="currentTemplate?.name || '模板预览'"
      width="760px"
      append-to-body
      destroy-on-close
      @closed="currentTemplate = undefined"
    >
      <el-table :key="currentTemplate?.id || currentTemplate?.name || 'preview'" :data="previewFields" border>
        <el-table-column label="字段" prop="label" min-width="150" />
        <el-table-column label="Key" prop="key" min-width="140" />
        <el-table-column label="类型" prop="type" width="140" />
        <el-table-column label="必填" width="90">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'">{{ row.required ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="aiDraftVisible" title="AI 创建模型卡片" width="860px" append-to-body destroy-on-close>
      <div class="draft-layout">
        <div class="draft-panel">
          <el-form label-position="top">
            <el-form-item label="建模需求">
              <el-input
                v-model="aiRequirement"
                type="textarea"
                :rows="7"
                placeholder="描述要管理的数据，例如：邮件分析模型，需要抽取发件人、收件人、主题、意图、关键词和来源文档ID"
              />
            </el-form-item>
            <el-button type="primary" :loading="aiGenerating" @click="generateAiDraft">
              <Icon icon="ep:cpu" class="mr-5px" />生成 JSON 草稿
            </el-button>
          </el-form>
        </div>
        <div class="draft-panel">
          <div class="draft-title">{{ aiDraft?.name || '等待生成' }}</div>
          <div class="draft-desc">{{ aiDraft?.description || '生成后可预览字段，并由用户确认创建模型与 ES 索引。' }}</div>
          <el-table :data="aiDraftFields" border height="260">
            <el-table-column label="字段" prop="label" min-width="130" />
            <el-table-column label="Key" prop="key" min-width="130" />
            <el-table-column label="类型" prop="type" width="110" />
            <el-table-column label="必填" width="80">
              <template #default="{ row }">
                <el-tag :type="row.required ? 'danger' : 'info'">{{ row.required ? '是' : '否' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="aiDraftVisible = false">取消</el-button>
        <el-button :disabled="!aiDraft" @click="editAiDraft">编辑草稿</el-button>
        <el-button type="primary" :disabled="!aiDraft" @click="confirmAiDraft">
          确认写入 ES
        </el-button>
      </template>
    </el-dialog>

    <FormDesigner
      v-model:visible="designerVisible"
      :form="editingForm"
      @save="handleDesignerSave"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MetadataApi, MetadataTemplateCardVO } from '@/api/rag/metadata'
import FormDesigner from '@/views/rag/metadata/components/FormDesigner.vue'

defineOptions({ name: 'DataCatalogMetadataTemplates' })

const loading = ref(false)
const templates = ref<MetadataTemplateCardVO[]>([])
const previewVisible = ref(false)
const currentTemplate = ref<MetadataTemplateCardVO>()
const aiDraftVisible = ref(false)
const aiGenerating = ref(false)
const aiRequirement = ref('')
const aiDraft = ref<MetadataTemplateCardVO>()
const designerVisible = ref(false)
const editingForm = ref<any>()
const query = reactive({ keyword: '', category: 'all' })

const previewFields = computed(() => parseFields(currentTemplate.value?.structure))
const aiDraftFields = computed(() => parseFields(aiDraft.value?.structure))

const loadTemplates = async () => {
  loading.value = true
  try {
    templates.value = await MetadataApi.getTemplateMarket(query)
  } finally {
    loading.value = false
  }
}

const previewTemplate = (item: MetadataTemplateCardVO) => {
  previewVisible.value = false
  currentTemplate.value = item
  nextTick(() => {
    previewVisible.value = true
  })
}

const createFromTemplate = async (item: MetadataTemplateCardVO) => {
  openDesigner(buildDesignerForm(item, true))
}

const editTemplate = (item: MetadataTemplateCardVO) => {
  openDesigner(buildDesignerForm(item, false))
}

const canDeleteTemplate = (item: MetadataTemplateCardVO) => Boolean(item.id) && item.systemFlag !== 1

const deleteTemplate = async (item: MetadataTemplateCardVO) => {
  if (!item.id || item.systemFlag === 1) return
  await ElMessageBox.confirm(
    `确认删除模型「${item.name}」？删除后会同步删除关联 ES 索引与数据。`,
    '删除模型',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  )
  await MetadataApi.delete(item.id)
  ElMessage.success('模型已删除')
  await loadTemplates()
}

const openDesigner = (form: any) => {
  designerVisible.value = false
  editingForm.value = undefined
  nextTick(() => {
    editingForm.value = form
    designerVisible.value = true
  })
}

const openAiDraft = () => {
  aiDraftVisible.value = true
  aiRequirement.value = ''
  aiDraft.value = undefined
}

const generateAiDraft = async () => {
  if (!aiRequirement.value.trim()) {
    ElMessage.warning('请先填写建模需求')
    return
  }
  aiGenerating.value = true
  try {
    aiDraft.value = await MetadataApi.generateAiDraftTemplate(aiRequirement.value)
    ElMessage.success('已生成模型 JSON 草稿')
  } finally {
    aiGenerating.value = false
  }
}

const confirmAiDraft = async () => {
  if (!aiDraft.value) return
  await MetadataApi.create(buildCreatePayload(aiDraft.value, aiDraft.value.name?.replace('AI生成-', '') || 'AI模型'))
  ElMessage.success('已写入模型并创建 ES 索引')
  aiDraftVisible.value = false
  await loadTemplates()
}

const editAiDraft = () => {
  if (!aiDraft.value) return
  const draft = { ...aiDraft.value, name: aiDraft.value.name?.replace('AI生成-', '') || 'AI模型' }
  aiDraftVisible.value = false
  openDesigner(buildDesignerForm(draft, true))
}

const handleDesignerSave = async () => {
  designerVisible.value = false
  editingForm.value = undefined
  await loadTemplates()
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

const buildCreatePayload = (item: MetadataTemplateCardVO, name?: string) => ({
  name: name || item.name,
  description: item.description,
  structure: item.structure,
  structureResult: item.structure,
  promptString: item.promptString,
  metadataType: item.code || item.category || 'custom',
  status: 1,
  systemFlag: 0
})

const buildDesignerForm = (item: MetadataTemplateCardVO, clone: boolean) => ({
  ...(clone ? {} : item),
  id: clone ? undefined : item.id,
  name: clone && item.id ? `${item.name} 副本` : item.name,
  description: item.description,
  schema: parseFields(item.structure),
  structure: item.structure,
  structureResult: item.structure,
  promptString: item.promptString,
  metadataType: item.code || item.category || 'custom',
  status: 1,
  systemFlag: clone ? 0 : item.systemFlag ?? 0
})

onMounted(loadTemplates)
</script>

<style scoped>
.metadata-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.head-actions { display: flex; align-items: center; gap: 8px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.model-card { min-height: 190px; padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; display: flex; flex-direction: column; gap: 12px; }
.card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; font-weight: 800; }
.card-desc { min-height: 44px; color: #667085; line-height: 22px; }
.card-meta { display: flex; justify-content: space-between; gap: 12px; color: #475467; font-size: 13px; }
.card-actions { margin-top: auto; display: flex; justify-content: flex-end; gap: 8px; }
.draft-layout { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: 14px; }
.draft-panel { padding: 14px; border: 1px solid #e6ebf2; border-radius: 6px; background: #fbfdff; }
.draft-title { color: #101828; font-size: 16px; font-weight: 800; }
.draft-desc { margin: 8px 0 12px; color: #667085; line-height: 22px; }
@media (max-width: 1200px) { .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .card-grid, .draft-layout { grid-template-columns: 1fr; } }
</style>
