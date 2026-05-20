<template>
  <div class="default-model-page" v-loading="loading">
    <ContentWrap class="hero-card">
      <div class="hero">
        <div>
          <div class="hero-title">默认模型配置中心</div>
          <div class="hero-desc">
            在正确的 `rag/apps` 页面统一维护模型类型默认值与任务覆盖策略，当前数据直接回显 `/rag/default-model-config`。
          </div>
        </div>
        <div class="hero-actions">
          <el-button @click="loadPageData">
            <Icon icon="ep:refresh" class="mr-5px" />
            刷新
          </el-button>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">模型类型</div>
          <div class="summary-value">{{ modelTypes.length }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">任务覆盖</div>
          <div class="summary-value">{{ overrideCount }}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">候选模型</div>
          <div class="summary-value">{{ modelCandidates.length }}</div>
        </div>
      </div>
    </ContentWrap>

    <ContentWrap class="section-card">
      <div class="section-head">
        <div>
          <div class="section-title">模型类型默认</div>
          <div class="section-desc">9 类模型的基础默认配置，任务没有单独覆盖时会走这里。</div>
        </div>
      </div>

      <el-table :data="typeDefaults" border stripe>
        <el-table-column label="模型类型" min-width="150">
          <template #default="{ row }">
            <div class="primary-text">{{ row.modelTypeName || row.scopeCode }}</div>
            <div class="sub-text">{{ row.scopeCode }}</div>
          </template>
        </el-table-column>
        <el-table-column label="默认模型" min-width="220">
          <template #default="{ row }">
            <div class="primary-text">{{ row.modelName || '未选择模型' }}</div>
            <div class="sub-text">{{ row.modelCode || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="调用方式" prop="invokeMode" min-width="160" />
        <el-table-column label="访问地址" min-width="280">
          <template #default="{ row }">
            <span class="url-text">{{ row.endpointUrl || 'AI_MODEL 直连，无额外 endpoint' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'info'">
              {{ row.status === 0 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="220">
          <template #default="{ row }">
            <span>{{ row.remark || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openTypeDialog(row)">编辑</el-button>
            <el-button type="success" link @click="testConfig(row)">测试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </ContentWrap>

    <ContentWrap class="section-card">
      <div class="section-head">
        <div>
          <div class="section-title">任务覆盖</div>
          <div class="section-desc">按任务粒度重写默认模型，未配置覆盖时自动回退到对应模型类型默认值。</div>
        </div>
      </div>

      <el-table :data="taskRows" border stripe>
        <el-table-column label="任务" min-width="180">
          <template #default="{ row }">
            <div class="primary-text">{{ row.taskDisplayName }}</div>
            <div class="sub-text">{{ row.taskCode }}</div>
          </template>
        </el-table-column>
        <el-table-column label="回退模型类型" min-width="140">
          <template #default="{ row }">
            <el-tag type="warning" effect="plain">{{ row.modelTypeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前覆盖模型" min-width="220">
          <template #default="{ row }">
            <div class="primary-text">{{ row.override?.modelName || '未配置覆盖' }}</div>
            <div class="sub-text">
              {{ row.override?.modelCode || `默认跟随 ${row.modelTypeName}` }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="当前调用方式" min-width="160">
          <template #default="{ row }">
            {{ row.override?.invokeMode || row.typeDefault?.invokeMode || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="当前访问地址" min-width="280">
          <template #default="{ row }">
            <span class="url-text">
              {{ row.override?.endpointUrl || row.typeDefault?.endpointUrl || 'AI_MODEL 直连，无额外 endpoint' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.override ? 'success' : 'info'">
              {{ row.override ? '任务覆盖' : '类型默认' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openTaskDialog(row)">配置覆盖</el-button>
            <el-button type="success" link @click="previewResolve(row)">预览生效</el-button>
            <el-button
              v-if="row.override"
              type="danger"
              link
              @click="deleteOverride(row.taskCode)"
            >
              删除覆盖
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </ContentWrap>

    <Dialog v-model="previewVisible" title="任务生效预览" width="620px">
      <div v-if="previewData" class="preview-box">
        <div class="preview-item">
          <span class="preview-label">来源</span>
          <span>{{ previewData.resolvedSource }}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">作用域</span>
          <span>{{ previewData.scopeType }} / {{ previewData.scopeCode }}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">模型</span>
          <span>{{ previewData.modelName || '-' }} {{ previewData.modelCode ? `(${previewData.modelCode})` : '' }}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">调用方式</span>
          <span>{{ previewData.invokeMode || '-' }}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">访问地址</span>
          <span class="url-text">{{ previewData.endpointUrl || 'AI_MODEL 直连，无额外 endpoint' }}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">备注</span>
          <span>{{ previewData.remark || '-' }}</span>
        </div>
      </div>
    </Dialog>

    <AppsForm ref="formRef" @success="loadPageData" />
  </div>
</template>

<script setup lang="ts">
import {
  DefaultModelConfigItemVO,
  DefaultModelTypeVO,
  ModelCandidateVO,
  RagAppsApi,
  ResolvePreviewRespVO,
  TaskModelMappingVO
} from '@/api/rag/apps'
import { useMessage } from '@/hooks/web/useMessage'
import { computed, ref } from 'vue'
import AppsForm from './AppsForm.vue'

defineOptions({ name: 'Apps' })

interface TaskRow extends TaskModelMappingVO {
  taskDisplayName: string
  modelTypeName: string
  override?: DefaultModelConfigItemVO
  typeDefault?: DefaultModelConfigItemVO
}

const TASK_NAME_MAP: Record<string, string> = {
  summary: '摘要',
  tags: '标签',
  qa: '问答',
  ner: 'NER',
  form_extract: '表单抽取',
  ocr: 'OCR',
  audio_asr: '语音转写',
  related_recommend: '关联推荐',
  document_classify: '文档分类',
  translate: '翻译',
  image_ai_analysis: '图像分析',
  face_analysis: '人脸分析'
}

const message = useMessage()
const loading = ref(false)
const formRef = ref()
const previewVisible = ref(false)
const previewData = ref<ResolvePreviewRespVO>()

const modelTypes = ref<DefaultModelTypeVO[]>([])
const tasks = ref<TaskModelMappingVO[]>([])
const typeDefaults = ref<DefaultModelConfigItemVO[]>([])
const taskOverrides = ref<DefaultModelConfigItemVO[]>([])
const modelCandidates = ref<ModelCandidateVO[]>([])

const overrideCount = computed(() => taskOverrides.value.length)

const typeMap = computed(() => {
  return modelTypes.value.reduce<Record<string, DefaultModelTypeVO>>((acc, item) => {
    acc[item.code] = item
    return acc
  }, {})
})

const typeDefaultMap = computed(() => {
  return typeDefaults.value.reduce<Record<string, DefaultModelConfigItemVO>>((acc, item) => {
    acc[item.scopeCode] = item
    return acc
  }, {})
})

const overrideMap = computed(() => {
  return taskOverrides.value.reduce<Record<string, DefaultModelConfigItemVO>>((acc, item) => {
    acc[item.scopeCode] = item
    return acc
  }, {})
})

const taskRows = computed<TaskRow[]>(() => {
  return tasks.value.map((task) => ({
    ...task,
    taskDisplayName: TASK_NAME_MAP[task.taskCode] || task.taskName || task.taskCode,
    modelTypeName: typeMap.value[task.modelTypeCode]?.name || task.modelTypeCode,
    override: overrideMap.value[task.taskCode],
    typeDefault: typeDefaultMap.value[task.modelTypeCode]
  }))
})

const loadPageData = async () => {
  loading.value = true
  try {
    const res = await RagAppsApi.getPageInit()
    modelTypes.value = res.modelTypes || []
    tasks.value = res.tasks || []
    typeDefaults.value = res.typeDefaults || []
    taskOverrides.value = res.taskOverrides || []
    modelCandidates.value = res.modelCandidates || []
  } catch (error) {
    console.error('加载默认模型配置中心失败:', error)
    message.error('加载默认模型配置中心失败')
  } finally {
    loading.value = false
  }
}

const getModelOptions = () => {
  return modelCandidates.value
}

const openTypeDialog = (row: DefaultModelConfigItemVO) => {
  formRef.value.open({
    title: `编辑 ${row.modelTypeName || row.scopeCode} 默认配置`,
    record: row,
    modelOptions: getModelOptions(),
    saveApi: RagAppsApi.saveTypeDefault
  })
}

const openTaskDialog = (row: TaskRow) => {
  const base = row.override || {
    scopeType: 'TASK_TYPE',
    scopeCode: row.taskCode,
    modelType: row.modelType,
    modelTypeCode: row.modelTypeCode,
    modelTypeName: row.modelTypeName,
    invokeMode: row.typeDefault?.invokeMode || 'AI_MODEL',
    endpointUrl: row.typeDefault?.endpointUrl || '',
    apiKey: row.typeDefault?.apiKey || '',
    headersJson: row.typeDefault?.headersJson || '{}',
    requestTemplateJson: row.typeDefault?.requestTemplateJson || '{}',
    responseMappingJson: row.typeDefault?.responseMappingJson || '{}',
    timeoutMs: row.typeDefault?.timeoutMs || 60000,
    status: row.typeDefault?.status ?? 0,
    remark: row.typeDefault?.remark || '',
    modelId: row.typeDefault?.modelId
  }
  formRef.value.open({
    title: `配置 ${row.taskDisplayName} 任务覆盖`,
    record: base,
    modelOptions: getModelOptions(),
    saveApi: RagAppsApi.saveTaskOverride
  })
}

const testConfig = async (row: DefaultModelConfigItemVO) => {
  try {
    const res = await RagAppsApi.testConfig({
      modelId: row.modelId,
      endpointUrl: row.endpointUrl,
      invokeMode: row.invokeMode,
      apiKey: row.apiKey
    })
    const tone = res.success ? 'success' : 'warning'
    message[tone](`${row.modelTypeName || row.scopeCode}：${res.message}（HTTP ${res.statusCode}）`)
  } catch (error) {
    console.error('测试默认模型配置失败:', error)
    message.error('测试失败')
  }
}

const previewResolve = async (row: TaskRow) => {
  try {
    previewData.value = await RagAppsApi.resolvePreview(row.taskCode)
    previewVisible.value = true
  } catch (error) {
    console.error('预览任务生效配置失败:', error)
    message.error('预览失败')
  }
}

const deleteOverride = async (taskCode: string) => {
  try {
    await ElMessageBox.confirm(
      `确定删除任务 ${TASK_NAME_MAP[taskCode] || taskCode} 的覆盖配置吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await RagAppsApi.deleteTaskOverride(taskCode)
    message.success('删除成功')
    loadPageData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除任务覆盖失败:', error)
      message.error('删除失败')
    }
  }
}

loadPageData()
</script>

<style lang="scss" scoped>
.default-model-page {
  display: flex;
  gap: 12px;
  flex-direction: column;
}

.hero-card,
.section-card {
  border-radius: 16px;
}

.hero {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.hero-title {
  font-size: 24px;
  font-weight: 700;
  color: #20304a;
}

.hero-desc {
  max-width: 860px;
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: #607089;
}

.hero-actions {
  flex-shrink: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.summary-card {
  padding: 18px 20px;
  background: linear-gradient(135deg, #f5f9ff 0%, #edf6f2 100%);
  border: 1px solid #dfe9f3;
  border-radius: 14px;
}

.summary-label {
  font-size: 13px;
  color: #607089;
}

.summary-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  color: #20304a;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #20304a;
}

.section-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #607089;
}

.primary-text {
  font-weight: 600;
  color: #20304a;
}

.sub-text {
  margin-top: 4px;
  font-size: 12px;
  color: #7b8ba5;
  word-break: break-all;
}

.url-text {
  color: #4f5f78;
  word-break: break-all;
}

.preview-box {
  display: flex;
  gap: 12px;
  flex-direction: column;
}

.preview-item {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e7edf5;
  border-radius: 10px;
}

.preview-label {
  font-weight: 600;
  color: #20304a;
}

.mr-5px {
  margin-right: 5px;
}
</style>
