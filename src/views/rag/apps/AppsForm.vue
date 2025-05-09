<template>
  <Dialog :title="title" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      label-width="120px"
      v-loading="formLoading"
      class="app-config-form"
    >
      <!-- 基本信息区域 -->
      <div class="form-section">
        <div class="section-header">基本信息</div>
        
        <el-form-item label="应用名称" required>
          <el-input v-model="formData.appName" placeholder="请输入应用名称" />
        </el-form-item>
        
        <el-form-item label="应用代码" required>
          <el-input v-model="formData.appCode" placeholder="请输入唯一应用代码" :disabled="!isAddMode" />
          <div class="form-hint">应用代码必须唯一，用于系统识别应用</div>
        </el-form-item>
        
        <el-form-item label="应用图标">
          <div class="icon-upload-container">
            <el-upload
              class="app-icon-uploader"
              :action="'/prod-api/admin-api/yly/rag-apps/upload-icon/' + formData.appCode + '/'"
              :show-file-list="false"
              :on-success="handleIconSuccess"
              :on-error="handleIconError"
              :before-upload="beforeIconUpload"
            >
              <div class="upload-area">
                <img v-if="iconPreview" :key="iconPreview" :src="iconPreview" class="app-icon-preview" />
                <el-icon v-else class="upload-icon"><Plus /></el-icon>
                <div v-if="!iconPreview" class="upload-tip">点击上传图标</div>
              </div>
            </el-upload>
          </div>
          <div class="form-hint">建议上传正方形PNG图片，大小不超过10MB。非正方形图片将会被缩放以完整显示。</div>
        </el-form-item>
        
        <el-form-item label="应用描述">
          <el-input v-model="formData.appDescription" type="textarea" :rows="2" placeholder="请输入应用描述" />
        </el-form-item>
      </div>
      
      <!-- API请求区域 -->
      <div class="form-section">
        <div class="section-header">API请求</div>
        
        <el-form-item label="请求路径" required>
          <el-input v-model="apiConfigData.url" placeholder="请输入完整请求路径" />
        </el-form-item>
        
        <el-form-item label="请求方式">
          <el-select v-model="apiConfigData.method" placeholder="请选择请求方式">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="请求参数">
          <el-input
            v-model="requestParamsString"
            type="textarea"
            :rows="5"
            placeholder="请输入请求参数，格式为JSON"
            class="code-input"
          />
        </el-form-item>
        
        <el-form-item label="返回结果">
          <el-input
            v-model="responseFormatString"
            type="textarea"
            :rows="3"
            placeholder="请输入返回结果格式，格式为JSON"
            class="code-input"
          />
        </el-form-item>
      </div>
      
      <!-- iframe嵌入区域 -->
      <div class="form-section">
        <div class="section-header">iframe嵌入</div>
        
        <el-form-item label="iframe地址">
          <el-input v-model="apiConfigData.iframe_url" placeholder="请输入iframe嵌入地址" />
        </el-form-item>
      </div>
    </el-form>
    
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { RagAppsApi, RagAppsVO } from '@/api/rag/apps'
import { useMessage } from '@/hooks/web/useMessage'
import { Plus } from '@element-plus/icons-vue'
import { computed, reactive, ref } from 'vue'

defineOptions({ name: 'AppsForm' })

const emit = defineEmits(['success'])
const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const title = ref('')
const formLoading = ref(false)
const formRef = ref()
const isAddMode = ref(false)
const iconPreview = ref('') // 图标预览URL

// 表单数据
const formData = reactive<RagAppsVO>({
  id: 0,
  appKey: '',
  appName: '',
  appCode: '',
  appDescription: '',
  // appType: '',
  apiConfig: '',
  icon: '',
  sortOrder: 0,
  status: true
})

// API配置数据
const apiConfigData = reactive({
  url: '',
  method: 'POST',
  params: {},
  is_iframe: true,
  iframe_url: '',
  response_format: {}
})

// 计算属性：请求参数字符串形式
const requestParamsString = computed({
  get: () => {
    try {
      return JSON.stringify(apiConfigData.params, null, 2)
    } catch (e) {
      return '{}'
    }
  },
  set: (val) => {
    try {
      apiConfigData.params = JSON.parse(val)
    } catch (e) {
      console.error('解析请求参数失败:', e)
    }
  }
})

// 计算属性：返回结果字符串形式
const responseFormatString = computed({
  get: () => {
    try {
      return JSON.stringify(apiConfigData.response_format, null, 2)
    } catch (e) {
      return '{}'
    }
  },
  set: (val) => {
    try {
      apiConfigData.response_format = JSON.parse(val)
    } catch (e) {
      console.error('解析返回结果格式失败:', e)
    }
  }
})

// 图标上传前的校验
const beforeIconUpload = (file) => {
  const isImage = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    message.error('图标只能是图片格式!')
    return false
  }
  
  if (!isLt10M) {
    message.error('图标大小不能超过10MB!')
    return false
  }
  
  if (!formData.appCode) {
    message.error('请先输入应用代码!')
    return false
  }
  
  return true
}

// 图标上传成功处理
const handleIconSuccess = (response, file) => {
  if (response && response.iconUrl) {
    // 添加时间戳防止缓存
    const timestamp = new Date().getTime()
    iconPreview.value = `${response.iconUrl}?t=${timestamp}`
    formData.icon = response.iconUrl  // 保存原始URL到表单数据
    ElMessage.success('图标上传成功')
  } else {
    ElMessage.error('图标上传失败: 响应格式错误')
  }
}

// 图标上传失败处理
const handleIconError = (error) => {
  console.error('图标上传失败:', error)
  
  let errorMsg = '图标上传失败'
  if (error.response) {
    try {
      const response = JSON.parse(error.response)
      errorMsg = response.error || errorMsg
    } catch (e) {}
  }
  
  message.error(errorMsg)
}

// 生成唯一应用Key
const generateAppKey = () => {
  const timestamp = new Date().getTime()
  return `app-${timestamp}-${Math.floor(Math.random() * 1000)}`
}

// 打开表单弹窗
const open = (app: RagAppsVO | null, isAdd: boolean = false) => {
  dialogVisible.value = true
  isAddMode.value = isAdd
  iconPreview.value = ''
  
  resetForm()
  
  if (isAdd) {
    // 新增模式
    title.value = '添加应用'
    formData.appKey = generateAppKey()
    formData.status = false
    formData.sortOrder = 0
  } else if (app) {
    // 编辑模式
    title.value = `配置 ${app.appName}`
    
    // 设置基本数据
    Object.assign(formData, app)
    if (formData.icon) {
      // If an icon exists, set iconPreview with a timestamp for initial display
      iconPreview.value = `${formData.icon}?t=${new Date().getTime()}`
    }
    
    // 处理apiConfig字段
    if (app.apiConfig) {
      try {
        const apiConfigObj = JSON.parse(app.apiConfig)
        
        // 重置apiConfigData
        apiConfigData.url = apiConfigObj.url || ''
        apiConfigData.method = apiConfigObj.method || 'POST'
        apiConfigData.params = apiConfigObj.params || {}
        apiConfigData.is_iframe = true
        apiConfigData.iframe_url = apiConfigObj.iframe_url || ''
        apiConfigData.response_format = apiConfigObj.response_format || {}
      } catch (e) {
        console.error('解析API配置失败:', e)
      }
    }
  }
}

// 表单验证
const validateForm = () => {
  if (!formData.appName) {
    message.error('应用名称不能为空')
    return false
  }
  
  if (isAddMode.value && !formData.appCode) {
    message.error('应用代码不能为空')
    return false
  }
  
  if (!apiConfigData.url) {
    message.error('请求路径不能为空')
    return false
  }
  
  return true
}

// 提交表单
const submitForm = async () => {
  // 表单验证
  if (!validateForm()) {
    return
  }
  
  formLoading.value = true
  try {
    // 构建apiConfig对象
    const apiConfigObj = {
      url: apiConfigData.url,
      method: apiConfigData.method,
      params: apiConfigData.params,
      is_iframe: apiConfigData.is_iframe,
      iframe_url: apiConfigData.iframe_url,
      response_format: apiConfigData.response_format
    }
    
    // 准备提交数据
    const submitData: RagAppsVO = {
      ...formData,
      apiConfig: JSON.stringify(apiConfigObj)
    }
    
    // 根据模式选择API
    if (isAddMode.value) {
      // 创建新应用
      await RagAppsApi.createRagApps(submitData)
      message.success('创建成功')
    } else {
      // 更新应用
      await RagAppsApi.updateRagApps(submitData)
    }
    
    dialogVisible.value = false
    emit('success')
  } catch (error) {
    console.error(isAddMode.value ? '创建失败:' : '保存失败:', error)
    message.error(isAddMode.value ? '创建失败' : t('common.saveFailText'))
  } finally {
    formLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  // 重置表单数据
  Object.assign(formData, {
    id: 0,
    appKey: '',
    appName: '',
    appCode: '',
    appDescription: '',
    // appType: '',
    apiConfig: '',
    icon: '',
    sortOrder: 0,
    status: true
  })
  
  // 重置API配置数据
  Object.assign(apiConfigData, {
    url: '',
    method: 'POST',
    params: {},
    is_iframe: true,
    iframe_url: '',
    response_format: {}
  })
  
  // 重置图标预览
  iconPreview.value = ''
  
  // 重置表单验证
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 对外暴露方法
defineExpose({ open })
</script>

<style lang="scss" scoped>
.app-config-form {
  padding: 0 10px;
}

.form-section {
  margin-bottom: 24px;
  overflow: hidden;
  border-radius: 4px;
  
  &:not(:last-child) {
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }
}

.section-header {
  position: relative;
  padding-left: 12px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 500;
  line-height: 24px;
  color: #333;
  
  &::before {
    position: absolute;
    top: 4px;
    left: 0;
    width: 4px;
    height: 16px;
    background-color: #409eff;
    border-radius: 2px;
    content: '';
  }
}

.icon-upload-container {
  display: flex;
  align-items: flex-start;
}

.icon-tip {
  margin-left: 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}

.app-icon-uploader {
  :deep(.el-upload) {
    cursor: pointer;
  }
}

.upload-area {
  display: flex;
  width: 100px;
  height: 100px;
  overflow: hidden;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  transition: all 0.3s;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #f5f7fa;
    border-color: #409eff;
  }
}

.app-icon-preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
  text-align: center;
}

.code-input {
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  
  :deep(.el-textarea__inner) {
    padding: 8px 12px;
    font-size: 14px;
    line-height: 1.5;
  }
}

.form-hint {
  padding-left: 2px;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-form-item__label) {
  font-weight: normal;
}

:deep(.el-select) {
  width: 100%;
}
</style>