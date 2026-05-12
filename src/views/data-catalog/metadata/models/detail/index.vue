<template>
  <div class="model-detail-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 元数据数据建模 / 数据模型列表 / <span>{{ form?.name || '模型详情' }}</span></div>
          <div class="page-title">{{ form?.name || '数据模型详情' }}</div>
          <div class="page-subtitle">
            {{ form?.esIndexName || '未关联 ES 索引' }} · {{ schemaFields.length }} 字段 · {{ total }} 行结果
          </div>
        </div>
        <div class="head-actions">
          <el-button @click="router.back()"><Icon icon="ep:back" class="mr-5px" />返回</el-button>
          <el-button type="primary" @click="loadAll"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
        </div>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">字段数量</div>
        <div class="kpi-value">{{ schemaFields.length }}</div>
        <div class="kpi-delta">模型结构</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">结果数据</div>
        <div class="kpi-value">{{ total }}</div>
        <div class="kpi-delta">ES 行数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">索引状态</div>
        <div class="kpi-value">{{ form?.esIndexName ? '正常' : '缺失' }}</div>
        <div class="kpi-delta">{{ form?.esIndexName || '待创建' }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">模型状态</div>
        <div class="kpi-value">{{ form?.status === 1 ? '启用' : '禁用' }}</div>
        <div class="kpi-delta">{{ form?.systemFlag === 1 ? '内置模型' : '自建模型' }}</div>
      </div>
    </div>

    <ContentWrap>
      <div class="toolbar">
        <el-form :inline="true" :model="query">
          <el-form-item label="来源文档ID">
            <el-input v-model="query.esId" class="!w-240px" clearable placeholder="按 esId 筛选" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleQuery"><Icon icon="ep:search" class="mr-5px" />查询</el-button>
            <el-button @click="resetQuery"><Icon icon="ep:refresh-left" class="mr-5px" />重置</el-button>
          </el-form-item>
        </el-form>
        <div class="toolbar-actions">
          <el-button type="primary" @click="openEdit()"><Icon icon="ep:plus" class="mr-5px" />新增</el-button>
          <el-button type="success" @click="aiFillVisible = true"><Icon icon="ep:cpu" class="mr-5px" />AI 填充</el-button>
          <el-button @click="importVisible = true"><Icon icon="ep:upload" class="mr-5px" />导入</el-button>
          <el-button @click="exportCsv"><Icon icon="ep:download" class="mr-5px" />导出</el-button>
          <el-button @click="publishVisible = true"><Icon icon="ep:share" class="mr-5px" />发布 Tool/MCP</el-button>
        </div>
      </div>
    </ContentWrap>

    <ContentWrap>
      <el-table v-loading="loading" :data="rows" border class="data-table" height="560">
        <el-table-column label="文档ID" fixed="left" width="210" show-overflow-tooltip>
          <template #default="{ row }">{{ getResultId(row) }}</template>
        </el-table-column>
        <el-table-column
          v-for="field in schemaFields"
          :key="field.key"
          :label="field.label"
          min-width="160"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ formatCell(row, field) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-popconfirm title="确认删除该行数据？" @confirm="deleteRow(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <Pagination
        :total="total"
        v-model:page="query.pageNo"
        v-model:limit="query.pageSize"
        @pagination="loadRows"
      />
    </ContentWrap>

    <Dialog :title="editingId ? '编辑数据行' : '新增数据行'" v-model="editVisible" width="780px">
      <el-form label-width="120px" :model="editForm">
        <el-form-item v-for="field in schemaFields" :key="field.key" :label="field.label" :required="field.required">
          <el-input
            v-if="isTextarea(field)"
            v-model="editForm[field.key]"
            type="textarea"
            :rows="4"
            :placeholder="`请输入${field.label}`"
          />
          <el-input-number
            v-else-if="isNumber(field)"
            v-model="editForm[field.key]"
            class="!w-full"
            :placeholder="`请输入${field.label}`"
          />
          <el-date-picker
            v-else-if="isDate(field)"
            v-model="editForm[field.key]"
            class="!w-full"
            :type="isDatetime(field) ? 'datetime' : 'date'"
            :placeholder="`请选择${field.label}`"
          />
          <el-select
            v-else-if="isSelect(field)"
            v-model="editForm[field.key]"
            class="!w-full"
            :multiple="isMultiSelect(field)"
            clearable
            :placeholder="`请选择${field.label}`"
          >
            <el-option
              v-for="option in field.options || []"
              :key="option.value || option.label"
              :label="option.label || option.value"
              :value="option.value || option.label"
            />
          </el-select>
          <el-input v-else v-model="editForm[field.key]" :placeholder="`请输入${field.label}`" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRow">保存</el-button>
      </template>
    </Dialog>

    <Dialog title="AI 填充数据" v-model="aiFillVisible" width="760px">
      <el-input
        v-model="aiFillText"
        type="textarea"
        :rows="9"
        placeholder="粘贴原始文本，系统会按当前模型结构抽取并写入结果表"
      />
      <template #footer>
        <el-button @click="aiFillVisible = false">取消</el-button>
        <el-button type="primary" :loading="aiFilling" @click="fillByAi">抽取并写入</el-button>
      </template>
    </Dialog>

    <Dialog title="导入 JSON 数据" v-model="importVisible" width="760px">
      <el-input
        v-model="importText"
        type="textarea"
        :rows="10"
        placeholder="支持单个 JSON 对象或 JSON 数组"
      />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="importJson">确认导入</el-button>
      </template>
    </Dialog>

    <Dialog title="发布 Tool / MCP" v-model="publishVisible" width="820px">
      <el-table :data="publishItems" border max-height="380">
        <el-table-column label="工具名称" prop="name" min-width="170" />
        <el-table-column label="模块" prop="module" width="140" />
        <el-table-column label="端点" prop="endpoint" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.mcpPublished ? 'success' : 'info'">{{ row.publishStatus }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { MetadataApi, MetadataModelVO, MetadataMcpPublishVO } from '@/api/rag/metadata'

defineOptions({ name: 'DataCatalogMetadataModelDetail' })

interface ModelField {
  key: string
  label: string
  type?: string
  required?: boolean
  options?: Array<{ label: string; value: string }>
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const aiFilling = ref(false)
const importing = ref(false)
const form = ref<MetadataModelVO>()
const rows = ref<any[]>([])
const total = ref(0)
const editVisible = ref(false)
const aiFillVisible = ref(false)
const importVisible = ref(false)
const publishVisible = ref(false)
const editingId = ref('')
const editForm = reactive<Record<string, any>>({})
const aiFillText = ref('')
const importText = ref('')
const publishItems = ref<MetadataMcpPublishVO[]>([])
const query = reactive({ esId: '', pageNo: 1, pageSize: 10 })

const formId = computed(() => Number(route.query.id || 0))
const schemaFields = computed<ModelField[]>(() => parseFields(form.value?.structure))

const loadAll = async () => {
  await loadForm()
  await Promise.all([loadRows(), loadPublishItems()])
}

const loadForm = async () => {
  if (!formId.value) return
  form.value = await MetadataApi.get(formId.value)
}

const loadRows = async () => {
  if (!formId.value) return
  loading.value = true
  try {
    const page = await MetadataApi.pageFormData({
      formId: formId.value,
      esId: query.esId || undefined,
      pageNo: query.pageNo,
      pageSize: query.pageSize
    })
    rows.value = page?.list || []
    total.value = Number(page?.total || 0)
  } finally {
    loading.value = false
  }
}

const loadPublishItems = async () => {
  publishItems.value = await MetadataApi.getMcpPublishCatalog()
}

const handleQuery = () => {
  query.pageNo = 1
  loadRows()
}

const resetQuery = () => {
  query.esId = ''
  handleQuery()
}

const openEdit = (row?: any) => {
  clearEditForm()
  editingId.value = row ? getResultId(row) : ''
  if (row) {
    Object.assign(editForm, pickSchemaData(row))
  }
  editVisible.value = true
}

const saveRow = async () => {
  if (!formId.value) return
  saving.value = true
  try {
    const payload = { ...editForm, formId: formId.value, metadataModelId: formId.value }
    if (editingId.value) {
      await MetadataApi.updateFormData(formId.value, editingId.value, payload)
      ElMessage.success('已更新数据行')
    } else {
      await MetadataApi.saveFormData(formId.value, payload)
      ElMessage.success('已新增数据行')
    }
    editVisible.value = false
    await loadRows()
  } finally {
    saving.value = false
  }
}

const deleteRow = async (row: any) => {
  const id = getResultId(row)
  if (!id || !formId.value) {
    ElMessage.warning('无法识别数据行 ID')
    return
  }
  await MetadataApi.deleteFormData(formId.value, id)
  ElMessage.success('已删除数据行')
  await loadRows()
}

const fillByAi = async () => {
  if (!form.value || !aiFillText.value.trim()) {
    ElMessage.warning('请先输入需要抽取的文本')
    return
  }
  aiFilling.value = true
  try {
    const result = await MetadataApi.extractFormNew({
      formId: form.value.id,
      formName: form.value.name,
      text: aiFillText.value
    })
    const items = normalizeExtractResult(result)
    for (const item of items) {
      await MetadataApi.saveFormData(formId.value, { ...item, formId: formId.value, metadataModelId: formId.value })
    }
    ElMessage.success(`已写入 ${items.length} 条抽取结果`)
    aiFillVisible.value = false
    aiFillText.value = ''
    await loadRows()
  } finally {
    aiFilling.value = false
  }
}

const importJson = async () => {
  if (!importText.value.trim()) {
    ElMessage.warning('请先粘贴 JSON 数据')
    return
  }
  importing.value = true
  try {
    const parsed = JSON.parse(importText.value)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    for (const item of list) {
      await MetadataApi.saveFormData(formId.value, { ...item, formId: formId.value, metadataModelId: formId.value })
    }
    ElMessage.success(`已导入 ${list.length} 条数据`)
    importVisible.value = false
    importText.value = ''
    await loadRows()
  } catch {
    ElMessage.error('JSON 格式不正确')
  } finally {
    importing.value = false
  }
}

const exportCsv = async () => {
  if (!rows.value.length) {
    ElMessage.warning('当前没有可导出的数据')
    return
  }
  await ElMessageBox.confirm('将导出当前分页数据为 CSV，是否继续？', '导出确认', { type: 'info' })
  const headers = schemaFields.value.map((field) => field.label)
  const keys = schemaFields.value.map((field) => field.key)
  const lines = [headers.join(',')]
  rows.value.forEach((row) => {
    const data = getRowData(row)
    lines.push(keys.map((key) => csvCell(data[key])).join(','))
  })
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${form.value?.name || 'metadata'}-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const parseFields = (structure?: string): ModelField[] => {
  if (!structure) return []
  try {
    const parsed = JSON.parse(structure)
    const fields = Array.isArray(parsed) ? parsed : parsed.fields || []
    return fields.map((item: any, index: number) => {
      const key = item.key || item.name || item.field || item.prop || `field_${index + 1}`
      return {
        ...item,
        key,
        label: item.label || item.title || item.name || key,
        type: normalizeType(item.type)
      }
    })
  } catch {
    return []
  }
}

const normalizeType = (type?: string) => {
  const value = String(type || 'text').toLowerCase()
  const map: Record<string, string> = {
    'input-short': 'text',
    'input-long': 'textarea',
    'input-number': 'number',
    'input-date': 'date',
    'input-datetime': 'datetime',
    'select-single': 'select',
    'select-multiple': 'multi-select'
  }
  return map[value] || value
}

const getRowData = (row: any) => row?.data || row?.fields || row || {}
const getResultId = (row: any) => String(row?._id || row?.id || row?.documentId || row?.resultId || '')
const pickSchemaData = (row: any) => {
  const data = getRowData(row)
  return schemaFields.value.reduce<Record<string, any>>((acc, field) => {
    acc[field.key] = data[field.key]
    return acc
  }, {})
}

const clearEditForm = () => {
  Object.keys(editForm).forEach((key) => delete editForm[key])
  schemaFields.value.forEach((field) => {
    editForm[field.key] = undefined
  })
}

const formatCell = (row: any, field: ModelField) => {
  const value = getRowData(row)[field.key]
  if (Array.isArray(value)) return value.join('、')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value ?? '-'
}

const normalizeExtractResult = (result: any) => {
  const payload = result?.formResult || result?.result || result
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return [{ content: payload }]
    }
  }
  return Array.isArray(payload) ? payload : [payload]
}

const csvCell = (value: any) => {
  const text = Array.isArray(value) ? value.join('、') : value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

const isTextarea = (field: ModelField) => ['textarea', 'text-area', 'longtext'].includes(field.type || '')
const isNumber = (field: ModelField) => field.type === 'number'
const isDate = (field: ModelField) => ['date', 'datetime'].includes(field.type || '')
const isDatetime = (field: ModelField) => field.type === 'datetime'
const isSelect = (field: ModelField) => ['select', 'multi-select'].includes(field.type || '')
const isMultiSelect = (field: ModelField) => field.type === 'multi-select'

onMounted(loadAll)
</script>

<style scoped>
.model-detail-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 800; color: #101828; }
.page-subtitle { margin-top: 6px; color: #667085; }
.head-actions, .toolbar, .toolbar-actions { display: flex; align-items: center; gap: 8px; }
.toolbar { justify-content: space-between; flex-wrap: wrap; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi-card { min-height: 118px; padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 25px; font-weight: 800; color: #101828; }
.kpi-delta { margin-top: 10px; color: #12a666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.data-table { width: 100%; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) {
  .page-head { align-items: flex-start; flex-direction: column; }
  .kpi-grid { grid-template-columns: 1fr; }
  .toolbar, .toolbar-actions { align-items: flex-start; flex-direction: column; }
}
</style>
