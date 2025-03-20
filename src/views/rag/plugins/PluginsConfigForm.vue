<template>
  <Dialog :title="title" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      label-width="120px"
      v-loading="formLoading"
    >
      <!-- 通用配置 -->
      <el-form-item label="路径" prop="path">
        <el-input v-model="formData.path" placeholder="请输入路径" />
      </el-form-item>
      <el-form-item label="主机地址" prop="host">
        <el-input v-model="formData.host" placeholder="请输入服务的IP地址" />
      </el-form-item>
      <el-form-item label="端口号" prop="port">
        <el-input v-model="formData.port" placeholder="请输入服务端口号" />
      </el-form-item>
      
      <!-- ElasticSearch 特有配置 -->
      <template v-if="formData.code === 'elasticsearch'">
        <el-form-item label="Secret" prop="secret">
          <el-input 
            v-model="formData.secret" 
            placeholder="请输入ElasticSearch服务的账号密码: elastic|yliyun123, 中间用 | 分隔开" 
          />
          <div class="el-form-item-msg">访问ElasticSearch服务的账号密码</div>
        </el-form-item>
      </template>
      
      <!-- KKFile 特有配置 -->
      <template v-else-if="formData.code === 'kkfile'">
        <el-form-item label="预览路径" prop="path">
          <el-input 
            v-model="formData.path" 
            placeholder="文件预览的路径, 默认是：/preview" 
          />
        </el-form-item>
        <el-form-item label="水印文字" prop="watermarkTxt">
          <el-input 
            v-model="spareConfig.watermarkTxt" 
            placeholder="水印文字" 
          />
        </el-form-item>
      </template>
      
      <!-- Dify 特有配置 -->
      <template v-else-if="formData.code === 'dify'">
        <el-form-item label="Secret" prop="secret">
          <el-input 
            v-model="formData.secret" 
            placeholder="请输入Dify服务的接口密钥" 
          />
          <div class="el-form-item-msg">调用Dify接口服务的密钥</div>
        </el-form-item>
        <el-form-item label="聊天服务地址" prop="chatUrl">
          <el-input 
            v-model="spareConfig.chatUrl" 
            placeholder="请输入聊天服务地址" 
          />
        </el-form-item>
        <el-form-item label="聊天服务密钥" prop="chatApiKey">
          <el-input 
            v-model="spareConfig.chatApiKey" 
            placeholder="请输入聊天服务密钥" 
          />
        </el-form-item>
        <el-form-item label="知识库服务地址" prop="kbUrl">
          <el-input 
            v-model="spareConfig.kbUrl" 
            placeholder="请输入知识库服务地址" 
          />
        </el-form-item>
        <el-form-item label="知识库密钥" prop="kbApiKey">
          <el-input 
            v-model="spareConfig.kbApiKey" 
            placeholder="请输入知识库密钥" 
          />
        </el-form-item>
      </template>
      
      <!-- FastAPI 特有配置 -->
      <template v-else-if="formData.code === 'fastapi'">
        <el-form-item label="标签提取Api" prop="keywordUrl">
          <el-input 
            v-model="spareConfig.keywordUrl" 
            placeholder="请输入标签提取Api" 
          />
        </el-form-item>
        <el-form-item label="文本翻译Api" prop="translationUrl">
          <el-input 
            v-model="spareConfig.translationUrl" 
            placeholder="请输入文本翻译Api" 
          />
        </el-form-item>
        <el-form-item label="摘要生成Api" prop="summaryUrl">
          <el-input 
            v-model="spareConfig.summaryUrl" 
            placeholder="请输入摘要生成Api" 
          />
        </el-form-item>
        <el-form-item label="语言识别Api" prop="languageUrl">
          <el-input 
            v-model="spareConfig.languageUrl" 
            placeholder="请输入语言识别Api" 
          />
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { PluginsConfigApi, PluginsConfigVO } from '@/api/rag/pluginsconfig'
import { useMessage } from '@/hooks/web/useMessage'
import { reactive, ref } from 'vue'

defineOptions({ name: 'PluginsConfigForm' })

const emit = defineEmits(['success'])
const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const title = ref('')
const formLoading = ref(false)
const formRef = ref()

// 表单数据
const formData = reactive<PluginsConfigVO>({
  code: '',
  name: '',
  description: '',
  status: 0,
  url: '',
  path: '',
  host: '',
  port: '',
  secret: '',
  spare: ''
})

// 特定配置 - 用于spare字段的JSON数据
const spareConfig = reactive({
  watermarkTxt: '',
  chatUrl: '',
  chatApiKey: '',
  kbUrl: '',
  kbApiKey: '',
  keywordUrl: '',
  translationUrl: '',
  summaryUrl: '',
  languageUrl: ''
})

// 打开表单弹窗
const open = (plugin: PluginsConfigVO) => {
  dialogVisible.value = true
  title.value = `配置 ${plugin.code}`
  resetForm()
  
  // 设置基本数据
  Object.assign(formData, plugin)
  
  // 处理spare字段
  if (plugin.spare) {
    try {
      const spareData = JSON.parse(plugin.spare)
      
      // 清空配置
      Object.keys(spareConfig).forEach(key => {
        spareConfig[key] = ''
      })
      
      // 设置配置
      Object.keys(spareData).forEach(key => {
        if (key in spareConfig) {
          spareConfig[key] = spareData[key]
        }
      })
    } catch (e) {
      console.error('解析spare配置失败:', e)
    }
  }
}

// 提交表单
const submitForm = async () => {
  formLoading.value = true
  try {
    // 准备提交数据
    const submitData: PluginsConfigVO = {
      ...formData
    }
    
    // 处理特定插件的spare字段
    if (formData.code === 'dify') {
      const spareJson = {
        chatUrl: spareConfig.chatUrl,
        chatApiKey: spareConfig.chatApiKey,
        kbUrl: spareConfig.kbUrl,
        kbApiKey: spareConfig.kbApiKey
      }
      submitData.spare = JSON.stringify(spareJson)
    } 
    else if (formData.code === 'kkfile') {
      submitData.spare = JSON.stringify({
        watermarkTxt: spareConfig.watermarkTxt
      })
    }
    else if (formData.code === 'fastapi') {
      submitData.spare = JSON.stringify({
        keywordUrl: spareConfig.keywordUrl,
        translationUrl: spareConfig.translationUrl,
        summaryUrl: spareConfig.summaryUrl,
        languageUrl: spareConfig.languageUrl
      })
    }
    
    // 提交数据
    await PluginsConfigApi.updatePluginsConfig(submitData)
    
    message.success(t('common.saveSuccessText'))
    dialogVisible.value = false
    emit('success')
  } catch (error) {
    console.error('保存失败:', error)
    message.error(t('common.saveFailText'))
  } finally {
    formLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  // 重置表单数据
  Object.assign(formData, {
    code: '',
    name: '',
    description: '',
    status: 0,
    url: '',
    path: '',
    host: '',
    port: '',
    secret: '',
    spare: ''
  })
  
  // 重置spare配置
  Object.keys(spareConfig).forEach(key => {
    spareConfig[key] = ''
  })
  
  // 重置表单验证
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 对外暴露方法
defineExpose({ open })
</script>

<style scoped>
.el-form-item-msg {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>