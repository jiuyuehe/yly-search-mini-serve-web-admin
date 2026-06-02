<template>
  <div class="model-setting-panel">
    <el-skeleton v-if="loading" :rows="8" animated />

    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="180px"
      class="model-setting-form"
    >
      <div class="model-setting-grid">
        <div class="model-setting-card avatar-card">
          <div class="section-title">知识库图片</div>
          <div class="avatar-content">
            <el-upload
              class="avatar-uploader"
              action="#"
              :show-file-list="false"
              :before-upload="handleAvatarUpload"
              accept="image/*"
            >
              <div v-if="form.avatar" class="avatar-preview">
                <el-image :src="form.avatar" fit="cover" />
              </div>
              <div v-else class="avatar-placeholder">
                <el-icon><Plus /></el-icon>
                <span>上传图片</span>
              </div>
            </el-upload>
          </div>
          <div class="avatar-actions">
            <el-button v-if="form.avatar" text type="danger" @click="handleAvatarRemove">
              移除图片
            </el-button>
          </div>
        </div>

        <div class="model-setting-card prompt-card">
          <div class="section-title">提示词</div>
          <el-form-item prop="parser_config.raptor.prompt" label="RAPTOR 提示词">
            <el-input
              v-model="form.parser_config.raptor.prompt"
              type="textarea"
              :autosize="{ minRows: 7, maxRows: 12 }"
              maxlength="1024"
              show-word-limit
              placeholder="请输入提示词"
            />
          </el-form-item>
        </div>
      </div>

      <div class="model-setting-card">
        <div class="section-title">基础配置</div>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="知识库名称" prop="name">
              <el-input v-model="form.name" maxlength="128" show-word-limit placeholder="请输入知识库名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="嵌入模型" prop="embedding_model">
              <el-select v-model="form.embedding_model" class="w-full">
                <el-option label="bge-m3@Ollama" value="bge-m3@Ollama" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="权限" prop="permission">
              <el-radio-group v-model="form.permission">
                <el-radio value="me">仅自己</el-radio>
                <el-radio value="team">团队成员</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="PDF 解析器" prop="parser_config.layout_recognize">
              <el-input v-model="form.parser_config.layout_recognize" placeholder="如 DeepDOC" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="切片方法" prop="chunk_method">
              <el-select v-model="form.chunk_method" class="w-full">
                <el-option
                  v-for="item in chunkMethodOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="建议文本块大小" prop="parser_config.chunk_token_num">
              <el-input-number v-model="form.parser_config.chunk_token_num" :min="1" :max="2048" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="文本分段标识符" prop="parser_config.delimiter">
              <el-input v-model="form.parser_config.delimiter" placeholder="如 \n" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="页面排名" prop="pagerank">
              <el-input-number v-model="form.pagerank" :min="0" :max="100" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div v-if="form.chunk_method === 'naive'" class="model-setting-card">
        <div class="section-title">Naive 切片配置</div>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="自动关键词提取" prop="parser_config.auto_keywords">
              <el-input-number v-model="form.parser_config.auto_keywords" :min="0" :max="32" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="自动问题提取" prop="parser_config.auto_questions">
              <el-input-number v-model="form.parser_config.auto_questions" :min="0" :max="10" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="表格转 HTML" prop="parser_config.html4excel">
              <el-switch v-model="form.parser_config.html4excel" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标签集" prop="parser_config.tag_kb_ids">
              <el-input v-model="form.parser_config.tag_kb_ids" placeholder="逗号分隔多个 ID" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div
        v-if="['naive', 'qa', 'manual', 'paper', 'book', 'laws', 'presentation'].includes(form.chunk_method)"
        class="model-setting-card"
      >
        <div class="section-title">高级策略</div>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="RAPTOR 设置" prop="parser_config.raptor.use_raptor">
              <el-switch
                v-model="form.parser_config.raptor.use_raptor"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="提取知识图谱" prop="parser_config.graphrag.use_graphrag">
              <el-switch
                v-model="form.parser_config.graphrag.use_graphrag"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="model-setting-card">
        <div class="section-title">描述</div>
        <el-form-item label="知识库描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 10 }"
            maxlength="1024"
            show-word-limit
            placeholder="请输入知识库描述"
          />
        </el-form-item>
      </div>

      <div class="form-actions">
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules, UploadProps } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

import { getKnowledgeBaseDetail, updateKnowledgeBase } from '@/api/rag-aichat/knowledgeBase'

defineOptions({ name: 'RagAiKnowledgeBaseModelSettingPanel' })

const props = defineProps({
  datasetId: { type: [String, Number], required: true }
})

const emit = defineEmits<{
  (e: 'saved', payload: Record<string, any>): void
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)

const chunkMethodOptions = [
  { value: 'naive', label: 'General(naive)' },
  { value: 'book', label: 'Book' },
  { value: 'email', label: 'Email' },
  { value: 'laws', label: 'Laws' },
  { value: 'manual', label: 'Manual' },
  { value: 'one', label: 'One' },
  { value: 'paper', label: 'Paper' },
  { value: 'picture', label: 'Picture' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'qa', label: 'Q&A' },
  { value: 'table', label: 'Table' },
  { value: 'tag', label: 'Tag' }
]

const buildDefaultParserConfig = (chunkMethod: string) => {
  if (chunkMethod === 'naive') {
    return {
      auto_keywords: 10,
      auto_questions: 3,
      chunk_token_num: 128,
      delimiter: '\n',
      html4excel: true,
      layout_recognize: 'DeepDOC',
      tag_kb_ids: '',
      task_page_size: 12,
      raptor: { use_raptor: false, prompt: '' },
      graphrag: { use_graphrag: false }
    }
  }
  return {
    raptor: { use_raptor: false, prompt: '' },
    graphrag: { use_graphrag: false }
  }
}

const form = reactive<Record<string, any>>({
  name: '',
  avatar: '',
  description: '',
  embedding_model: 'bge-m3@Ollama',
  permission: 'me',
  pagerank: 0,
  chunk_method: 'naive',
  parser_config: buildDefaultParserConfig('naive')
})

const rules: FormRules = {
  name: [
    { required: true, message: '知识库名称不能为空', trigger: 'blur' },
    { max: 128, message: '最多 128 字符', trigger: 'blur' }
  ],
  embedding_model: [
    { required: true, message: '嵌入模型不能为空', trigger: 'change' }
  ],
  permission: [
    { required: true, message: '权限不能为空', trigger: 'change' }
  ],
  chunk_method: [
    { required: true, message: '切片方法不能为空', trigger: 'change' }
  ],
  'parser_config.delimiter': [
    { required: true, message: '文本分段标识符不能为空', trigger: 'blur' }
  ],
  'parser_config.raptor.prompt': [
    { required: true, message: '提示词不能为空', trigger: 'blur' },
    { max: 1024, message: '提示词最多 1024 字符', trigger: 'blur' }
  ]
}

const ensureNestedConfig = (path: 'raptor' | 'graphrag') => {
  if (!form.parser_config[path]) {
    form.parser_config[path] = path === 'raptor'
      ? { use_raptor: false, prompt: '' }
      : { use_graphrag: false }
  }
}

const normalizeDetail = (detail: any) => {
  const chunkMethod = detail?.chunk_method || 'naive'
  const parserConfig = {
    ...buildDefaultParserConfig(chunkMethod),
    ...(detail?.parser_config || {})
  }

  if (typeof parserConfig.tag_kb_ids === 'string') {
    parserConfig.tag_kb_ids = parserConfig.tag_kb_ids
      .split(',')
      .map((item: string) => item.trim())
      .filter(Boolean)
      .join(',')
  }

  form.name = detail?.name || ''
  form.avatar = detail?.avatar || ''
  form.description = detail?.description || ''
  form.embedding_model = detail?.embedding_model || 'bge-m3@Ollama'
  form.permission = detail?.permission || 'me'
  form.pagerank = detail?.pagerank || 0
  form.chunk_method = chunkMethod
  form.parser_config = parserConfig

  if (form.avatar) {
  }

  ensureNestedConfig('raptor')
  ensureNestedConfig('graphrag')
}

const loadDetail = async () => {
  if (!props.datasetId) return
  loading.value = true
  try {
    const res = await getKnowledgeBaseDetail(String(props.datasetId))
    const detail = res?.data || res?.data?.data || res
    normalizeDetail(detail)
  } catch (error) {
    console.error(error)
    ElMessage.error('获取知识库详情失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.datasetId,
  () => {
    void loadDetail()
  },
  { immediate: true }
)

watch(
  () => form.chunk_method,
  (value) => {
    const currentPrompt = form.parser_config?.raptor?.prompt || ''
    const currentAvatar = form.avatar
    form.parser_config = buildDefaultParserConfig(value)
    if (currentPrompt) {
      ensureNestedConfig('raptor')
      form.parser_config.raptor.prompt = currentPrompt
    }
    if (value !== 'naive') {
      ensureNestedConfig('graphrag')
    }
    form.avatar = currentAvatar
  }
)

const handleAvatarUpload: UploadProps['beforeUpload'] = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      form.avatar = String(event.target?.result || '')
      resolve(false)
    }
    reader.readAsDataURL(file)
  })
}

const handleAvatarRemove = () => {
  form.avatar = ''
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const submitData: Record<string, any> = {
    ...form,
    parser_config: {
      ...form.parser_config,
      tag_kb_ids: form.parser_config.tag_kb_ids
        ? String(form.parser_config.tag_kb_ids)
            .split(',')
            .map((item: string) => item.trim())
            .filter(Boolean)
        : []
    }
  }

  if (!submitData.avatar) {
    delete submitData.avatar
  }

  saving.value = true
  try {
    await updateKnowledgeBase(String(props.datasetId), submitData)
    ElMessage.success('保存成功')
    emit('saved', submitData)
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.model-setting-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.model-setting-form {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 14px;
}

.model-setting-grid {
  display: grid;
  align-items: stretch;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 14px;
}

.model-setting-card {
  padding: 18px;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
}

.section-title {
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.avatar-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  align-items: stretch;
}

.avatar-content {
  display: flex;
  justify-content: center;
}

.avatar-uploader {
  width: 100%;
  max-width: 280px;
}

.avatar-placeholder,
.avatar-preview {
  display: flex;
  width: 100%;
  overflow: hidden;
  color: var(--app-text-secondary);
  background: var(--app-bg-subtle);
  border: 1px dashed var(--app-border-color);
  border-radius: var(--app-radius-lg);
  aspect-ratio: 1 / 1;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder {
  flex-direction: column;
  gap: 8px;
}

.avatar-preview :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.avatar-actions {
  display: flex;
  margin-top: 10px;
  justify-content: center;
}

.form-actions {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.model-setting-card :deep(.el-form-item) {
  margin-bottom: 18px;
}

.model-setting-card :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.prompt-card :deep(.el-form-item) {
  margin-bottom: 0;
}

@media (width <= 1200px) {
  .model-setting-grid {
    grid-template-columns: 1fr;
  }

  .avatar-uploader {
    max-width: 320px;
  }
}

@media (width <= 768px) {
  .model-setting-form {
    gap: 12px;
  }

  .model-setting-card {
    padding: 14px;
  }

  .model-setting-card :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  .model-setting-card :deep(.el-form-item__label) {
    line-height: 1.4;
  }
}
</style>
