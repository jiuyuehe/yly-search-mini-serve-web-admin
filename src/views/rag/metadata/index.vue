<template>
  <div class="governance-page">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / 元数据管理 / <span>元数据目录</span></div>
          <div class="governance-page-title">元数据模型与结果工作台</div>
          <div class="governance-page-subtitle">模板市场、提示词建模、手动表单编辑、结果列表、导入导出统一入口。</div>
        </div>
        <div class="head-actions">
          <el-button @click="settingsVisible = true">
            <Icon icon="ep:setting" class="mr-5px" />
            设置
          </el-button>
          <el-button @click="templateVisible = true" v-hasPermi="['rag:metadata:model']">
            <Icon icon="ep:shop" class="mr-5px" />
            模板市场
          </el-button>
          <el-button type="primary" @click="openDesigner()" v-hasPermi="['rag:metadata:model']">
            <Icon icon="ep:plus" class="mr-5px" />
            新建模型
          </el-button>
        </div>
      </div>
    </ContentWrap>

    <div class="governance-kpi-grid metadata-kpi-grid">
      <div v-for="item in kpiCards" :key="item.label" class="governance-kpi-card">
        <div class="governance-kpi-label">{{ item.label }}</div>
        <div class="governance-kpi-value">{{ item.value }}</div>
        <div class="governance-kpi-delta">当前页 <span>{{ item.delta }}</span></div>
      </div>
    </div>

    <div class="metadata-workbench">
      <ContentWrap class="governance-panel metadata-side">
        <template #header>目录视角</template>
        <button
          v-for="item in viewCards"
          :key="item.key"
          class="view-card"
          :class="{ active: activeView === item.key }"
          type="button"
          @click="activeView = item.key"
        >
          <Icon :icon="item.icon" />
          <span>{{ item.label }}</span>
          <b>{{ item.count }}</b>
        </button>
      </ContentWrap>

      <div class="metadata-main">
        <ContentWrap class="governance-panel">
          <template #header>{{ activeViewTitle }}</template>
          <div class="toolbar-row">
            <el-form :inline="true" :model="queryParams" class="metadata-query">
              <el-form-item label="模型名称">
                <el-input
                  v-model="queryParams.name"
                  class="!w-220px"
                  clearable
                  placeholder="请输入模型名称"
                  @keyup.enter="handleQuery"
                />
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="queryParams.status" class="!w-150px" clearable placeholder="全部">
                  <el-option label="启用" :value="1" />
                  <el-option label="禁用" :value="0" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleQuery" v-hasPermi="['rag:metadata:model']">
                  <Icon icon="ep:search" class="mr-5px" />
                  搜索
                </el-button>
                <el-button @click="resetQuery">
                  <Icon icon="ep:refresh" class="mr-5px" />
                  重置
                </el-button>
              </el-form-item>
            </el-form>

            <div class="toolbar-actions">
              <el-button v-if="activeView === 'market'" type="primary" @click="templateVisible = true">打开模板市场</el-button>
              <el-button v-if="activeView === 'importExport'" @click="handleImport">导入结果</el-button>
              <el-button v-if="activeView === 'importExport'" type="primary" @click="handleExport">导出结果</el-button>
            </div>
          </div>
        </ContentWrap>

        <ContentWrap v-if="activeView === 'market'" class="governance-panel">
          <template #header>内置模型模板</template>
          <div class="template-grid">
            <div v-for="item in builtInTemplates" :key="item.name" class="template-card">
              <div class="template-title">{{ item.name }}</div>
              <div class="template-desc">{{ item.description }}</div>
              <div class="template-meta">
                <span>{{ item.fieldCount }} 字段</span>
                <el-tag effect="plain">{{ item.scene }}</el-tag>
              </div>
              <el-button link type="primary" @click="templateVisible = true">选择模板</el-button>
            </div>
          </div>
        </ContentWrap>

        <ContentWrap v-else class="governance-table-panel">
          <template #header>{{ tableTitle }}</template>
          <el-table v-loading="loading" :data="list" row-key="id" class="governance-dense-table">
            <el-table-column label="模型名称" prop="name" min-width="180" show-overflow-tooltip />
            <el-table-column label="字段数" width="90">
              <template #default="{ row }">{{ row.schema?.length || 0 }}</template>
            </el-table-column>
            <el-table-column label="ES索引" prop="esIndexName" min-width="180" show-overflow-tooltip />
            <el-table-column label="模型ID" prop="modelId" width="110" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" prop="createTime" width="180" />
            <el-table-column label="操作" fixed="right" width="360">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDesigner(row)" v-hasPermi="['rag:metadata:model']">结构</el-button>
                <el-button link type="primary" @click="openPrompt(row)" v-hasPermi="['rag:metadata:model']">提示词</el-button>
                <el-button link type="success" @click="openDataView(row)" v-hasPermi="['rag:metadata:result']">结果</el-button>
                <el-button link type="warning" @click="generateIndex(row)" v-hasPermi="['rag:metadata:model']">建索引</el-button>
                <el-button v-if="activeView === 'importExport'" link type="primary" @click="handleExport(row)">导出</el-button>
                <el-popconfirm title="确认删除该元数据模型？" @confirm="handleDelete(row.id)">
                  <template #reference>
                    <el-button link type="danger" v-hasPermi="['rag:metadata:model']">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <Pagination
            :total="total"
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            @pagination="getList"
          />
        </ContentWrap>
      </div>
    </div>

    <FormDesigner v-model:visible="designerVisible" :form="currentForm" @save="handleModelSaved" />
    <FormDataView v-model:visible="dataVisible" :form="currentForm" />
    <PromptEditor v-model:visible="promptVisible" :form="currentForm" @save="handleModelSaved" />
    <TemplateMarket v-model:visible="templateVisible" @select-template="handleTemplateSelected" />
    <SettingsDialog v-model:visible="settingsVisible" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { MetadataApi } from '@/api/rag/metadata'
import FormDesigner from './components/FormDesigner.vue'
import FormDataView from './components/FormDataView.vue'
import PromptEditor from './components/PromptEditor.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import TemplateMarket from './components/TemplateMarket.vue'

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const currentForm = ref<any>(null)
const designerVisible = ref(false)
const dataVisible = ref(false)
const promptVisible = ref(false)
const templateVisible = ref(false)
const settingsVisible = ref(false)
const activeView = ref('model')

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: '',
  status: undefined as number | undefined
})

const formatNumber = (value: number | string) => Number(value || 0).toLocaleString()
const enabledCount = computed(() => list.value.filter((item) => item.status === 1).length)
const systemModelCount = computed(() => list.value.filter((item) => item.systemFlag === 1).length)
const fieldCount = computed(() => list.value.reduce((sum, item) => sum + (item.schema?.length || 0), 0))
const indexCount = computed(() => list.value.filter((item) => item.esIndexName).length)

const kpiCards = computed(() => [
  { label: '模型总数', value: formatNumber(total.value), delta: '模型定义' },
  { label: '启用模型', value: formatNumber(enabledCount.value), delta: '可填充' },
  { label: '系统模型', value: formatNumber(systemModelCount.value), delta: '内置模板' },
  { label: '字段总数', value: formatNumber(fieldCount.value), delta: '结构字段' },
  { label: '已建索引', value: formatNumber(indexCount.value), delta: 'ES 写入' },
  { label: '结果入口', value: formatNumber(list.value.length), delta: '当前页' }
])

const viewCards = computed(() => [
  { key: 'market', label: '模板市场', count: '4', icon: 'ep:shop' },
  { key: 'model', label: '数据库模型', count: formatNumber(total.value), icon: 'ep:coin' },
  { key: 'prompt', label: '提示词建模', count: formatNumber(enabledCount.value), icon: 'ep:edit-pen' },
  { key: 'form', label: '手动表单编辑', count: formatNumber(list.value.length), icon: 'ep:document' },
  { key: 'result', label: '数据结果列表', count: formatNumber(list.value.length), icon: 'ep:grid' },
  { key: 'importExport', label: '结果导入导出', count: formatNumber(indexCount.value), icon: 'ep:upload-filled' }
])

const activeViewTitle = computed(() => viewCards.value.find((item) => item.key === activeView.value)?.label || '元数据目录')
const tableTitle = computed(() => {
  if (activeView.value === 'prompt') return 'AI 提示词模型列表'
  if (activeView.value === 'form') return '手动表单结构列表'
  if (activeView.value === 'result') return '数据结果模型列表'
  if (activeView.value === 'importExport') return '结果导入导出模型列表'
  return '数据库模型列表'
})

const builtInTemplates = [
  { name: 'NER 信息建模表', scene: '图谱', fieldCount: 12, description: '实体、关系、来源句子与置信度结构。' },
  { name: '邮件分析表单', scene: '邮件', fieldCount: 16, description: '发件人、收件人、附件、时间与主题结构。' },
  { name: '合同管理表单', scene: '合同', fieldCount: 18, description: '合同主体、金额、期限、条款与风险字段。' },
  { name: '人物信息表单', scene: '画像', fieldCount: 14, description: '人物身份、组织、联系方式与关系线索。' }
]

const parseSchema = (row: any) => {
  if (Array.isArray(row.schema)) {
    return row.schema
  }
  if (!row.structure) {
    return []
  }
  try {
    return JSON.parse(row.structure)
  } catch {
    return []
  }
}

const normalizeModel = (row: any) => ({
  ...row,
  schema: parseSchema(row)
})

const getList = async () => {
  loading.value = true
  try {
    const data = await MetadataApi.getPage(queryParams)
    list.value = (data.list || []).map(normalizeModel)
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryParams.pageNo = 1
  queryParams.name = ''
  queryParams.status = undefined
  getList()
}

const openDesigner = (row?: any) => {
  currentForm.value = row ? normalizeModel(row) : null
  designerVisible.value = true
}

const openDataView = (row: any) => {
  currentForm.value = normalizeModel(row)
  dataVisible.value = true
}

const openPrompt = (row: any) => {
  currentForm.value = normalizeModel(row)
  promptVisible.value = true
}

const handleTemplateSelected = (template: any) => {
  currentForm.value = {
    name: template.name,
    description: template.description,
    schema: template.schema || template.fields || [],
    status: 1
  }
  designerVisible.value = true
}

const handleModelSaved = () => {
  getList()
}

const generateIndex = async (row: any) => {
  await MetadataApi.generateEsIndex(row.id)
  ElMessage.success('索引创建任务已提交')
  getList()
}

const handleImport = () => {
  ElMessage.info('导入入口已保留，后续接入批量导入接口')
}

const handleExport = (row?: any) => {
  ElMessage.info(row?.id ? `准备导出模型 ${row.name} 的结果` : '准备导出当前筛选结果')
}

const handleDelete = async (id: number) => {
  await MetadataApi.delete(id)
  ElMessage.success('删除成功')
  getList()
}

onMounted(getList)
</script>

<style scoped>
.head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.metadata-kpi-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.metadata-workbench {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 12px;
}

.metadata-side :deep(.el-card__body) {
  display: grid;
  gap: 10px;
}

.view-card {
  width: 100%;
  display: grid;
  grid-template-columns: 28px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 13px 12px;
  color: #344054;
  text-align: left;
  background: #fff;
  border: 1px solid #e6ebf2;
  border-radius: 6px;
  cursor: pointer;
}

.view-card.active {
  color: #1f6fff;
  background: #f2f7ff;
  border-color: #9bc0ff;
}

.view-card b {
  color: #101828;
  font-size: 13px;
}

.metadata-main {
  min-width: 0;
}

.toolbar-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.metadata-query {
  flex: 1;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.template-card {
  min-height: 168px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e6ebf2;
  border-radius: 6px;
}

.template-title {
  color: #101828;
  font-size: 16px;
  font-weight: 700;
}

.template-desc {
  min-height: 44px;
  margin-top: 10px;
  color: #667085;
  line-height: 1.6;
}

.template-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  color: #475467;
}

@media (max-width: 1300px) {
  .metadata-kpi-grid,
  .template-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .metadata-workbench,
  .metadata-kpi-grid,
  .template-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-row {
    flex-direction: column;
  }
}
</style>
