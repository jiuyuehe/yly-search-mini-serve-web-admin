<template>
  <el-dialog v-model="dialogVisible" title="AI提示词管理" width="80%" :close-on-click-modal="false" @close="handleClose">
    <div class="prompt-editor-container">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-tag type="info">
            <el-icon>
              <Document />
            </el-icon>
            表单: {{ form?.name || "未知" }}
          </el-tag>
          <el-tag v-if="tokenCount > 0" type="warning">
            <el-icon>
              <DataLine />
            </el-icon>
            Token数: {{ tokenCount }}
          </el-tag>
          <el-tag v-if="isCustomPrompt" type="success">
            <el-icon>
              <EditPen />
            </el-icon>
            自定义提示词
          </el-tag>
        </div>
        <div class="toolbar-right">
          <el-select
            v-model="selectedModelId"
            placeholder="选择模型"
            size="small"
            style="width: 120px"
            filterable
            :loading="modelsLoading"
            @change="handleModelChange"
          >
            <el-option
              v-for="model in models"
              :key="model.id || model.modelId"
              :label="model.name || model.modelName || model.id"
              :value="model.id || model.modelId"
            />
          </el-select>
          <el-button @click="handleGenerateDefault" :icon="Refresh">
            生成默认提示词
          </el-button>
       
        </div>
      </div>

      <!-- 新增模型绑定 -->

      <!-- 提示词编辑区 -->
      <div class="prompt-section">
        <div class="section-header">
          <h3>提示词内容</h3>
          <el-text size="small" type="info">
            提示词将发送给AI模型用于数据提取。可以自定义修改以提高提取准确度。
          </el-text>
        </div>
        <el-input v-model="promptContent" type="textarea" :rows="20" placeholder="提示词内容..." :disabled="loading" />
      </div>

      <!-- 测试区域 -->
      <div v-if="showTestArea" class="test-section">
        <div class="section-header">
          <h3>测试数据提取</h3>
        </div>
        <el-input v-model="testContent" type="textarea" :rows="8" placeholder="输入要测试的文本内容..." />

        <div v-if="testResult" class="test-result">
          <h4>提取结果:</h4>
          <el-alert v-if="testError" :title="testError" type="error" :closable="false" />
          <pre v-else>{{ JSON.stringify(testResult, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">
        保存提示词
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  DataLine,
  EditPen,
  Refresh,
  ChatLineSquare
} from '@element-plus/icons-vue'
import { ModelApi } from '@/api/ai/model/model'
import { MetadataApi } from '@/api/rag/metadata'
import { generateMetadataPrompt } from '../utils/metadataPrompt'

// Props
const props = defineProps({
  visible: Boolean,
  form: Object,
  storageMode: {
    type: String,
    default: 'localStorage'
  }
})

// Emits
const emit = defineEmits(['update:visible', 'save'])

// 响应式数据
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const promptContent = ref('')
const isCustomPrompt = ref(false)
const tokenCount = ref(0)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const showTestArea = ref(false)
const testContent = ref('')
const testResult = ref(null)
const testError = ref('')
const models = ref([])
const selectedModelId = ref(null)
const modelsLoading = ref(false)

// 加载提示词
const loadPrompt = async () => {
  if (!props.form) return

  loading.value = true

  if (props.form) {
    promptContent.value = props.form.promptString || ''
    isCustomPrompt.value = true
  } else {
    // 生成默认提示词
    generateDefaultPrompt()
  }

  // 计算token数
  calculateTokens()
  loading.value = false
}

const loadModels = async () => {
  modelsLoading.value = true
  try {
    const res = await ModelApi.getModelSimpleList(1)
    const list = res?.data || res?.list || res || []
    models.value = Array.isArray(list) ? list : []
  } catch (error) {
    console.error('加载模型列表失败:', error)
  } finally {
    modelsLoading.value = false
  }
}


// 监听 form 变化，加载提示词
watch(() => props.form, async (newForm) => {
  if (newForm && newForm.id) {
    selectedModelId.value = newForm.modelId || null
    await loadPrompt()
  }
}, { immediate: true })

// 初始加载模型列表
loadModels()



// 生成默认提示词
const generateDefaultPrompt = () => {
  if (!props.form || !props.form.schema) return

  const sampleContent = '这是示例文本内容'
  promptContent.value = generateMetadataPrompt(props.form.schema, sampleContent)
  isCustomPrompt.value = false
  calculateTokens()
}

// 计算token数（简化版本，实际应使用tiktoken库）
function calculateTokens() {
  if (!promptContent.value) {
    tokenCount.value = 0
    return
  }

  const chineseChars = (promptContent.value.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (promptContent.value.match(/[a-zA-Z]+/g) || []).length
  const punctuation = (promptContent.value.match(/[^\w\s\u4e00-\u9fa5]/g) || []).length

  tokenCount.value = Math.ceil(chineseChars * 1.5 + englishWords + punctuation * 0.5)
}

// 处理生成默认提示词
const handleGenerateDefault = () => {
  ElMessageBox.confirm('生成默认提示词将覆盖当前内容，是否继续？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    generateDefaultPrompt()
    ElMessage.success('已生成默认提示词')
  }).catch(() => {
    // 用户取消
  })
}


// 保存提示词
const handleSave = async () => {
  if (!promptContent.value) {
    ElMessage.warning('提示词内容不能为空')
    return
  }
  saving.value = true
  try {
    await MetadataApi.updatePrompt({
      formId: props.form.id,
      promptString: promptContent.value,
      modelId: selectedModelId.value
    })
    isCustomPrompt.value = true
    ElMessage.success('保存成功')
    emit('save', promptContent.value)
    dialogVisible.value = false
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleModelChange = (val) => {
  selectedModelId.value = val
}

// 关闭对话框
const handleClose = () => {
  dialogVisible.value = false
}

// 监听提示词内容变化，重新计算token
watch(() => promptContent.value, () => {
  calculateTokens()
})
</script>

<style scoped>
.prompt-editor-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.section-header {
  margin-bottom: 15px;
}

.section-header h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  color: #303133;
}

.prompt-section {
  margin-top: 20px;
}

.test-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #dcdfe6;
}

.test-result {
  margin-top: 15px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.test-result h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
}

.test-result pre {
  margin: 0;
  padding: 10px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  color: #303133;
}
</style>
