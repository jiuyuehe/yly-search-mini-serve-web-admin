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
          <el-input v-model="formData.secret" placeholder="请输入Dify服务的接口密钥" />
          <div class="el-form-item-msg">调用Dify接口服务的密钥</div>
        </el-form-item>
        
        <!-- Dify 应用配置 -->
        <div v-for="(item, index) in formData.difyApps" :key="index" class="dify-app-item">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>应用 {{ index + 1 }}</span>
                <el-button 
                  type="danger" 
                  :icon="Delete" 
                  circle 
                  @click="removeDifyApp(index)" 
                />
              </div>
            </template>
            <el-form-item 
              :label="'应用代码'" 
              :prop="'difyApps.' + index + '.code'"
              :rules="{ required: true, message: '请输入应用代码', trigger: 'blur' }"
            >
              <el-input v-model="item.code" placeholder="请输入应用代码" :disabled="item.code !== ''" />
            </el-form-item>
            <el-form-item 
              :label="'应用名称'" 
              :prop="'difyApps.' + index + '.name'" 
              :rules="{ required: true, message: '请输入应用名称', trigger: 'blur' }"
            >
              <el-input v-model="item.name" placeholder="请输入应用名称" />
            </el-form-item>
            <el-form-item 
              :label="'App Key'" 
              :prop="'difyApps.' + index + '.appKey'" 
              :rules="{ required: true, message: '请输入App Key', trigger: 'blur' }"
            >
              <el-input v-model="item.appKey" placeholder="请输入App Key" />
            </el-form-item>
          </el-card>
        </div>

        <el-form-item>
          <el-button type="primary" @click="addDifyApp">新增应用</el-button>
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
import { Delete } from '@element-plus/icons-vue'
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
const formData = reactive<PluginsConfigVO & { difyApps: { name: string; appKey: string; code: string }[] }>({
  code: '',
  name: '',
  description: '',
  status: 0,
  url: '',
  path: '',
  host: '',
  port: '',
  secret: '',
  spare: '',
  difyApps: []
})

// 特定配置 - 用于spare字段的JSON数据
const spareConfig = reactive({
  watermarkTxt: '',
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
      
      if (plugin.code === 'dify') {
        if (spareData.items) {
          formData.difyApps = spareData.items
        }
      } else {
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
      }
    } catch (e) {
      console.error('解析spare配置失败:', e)
      if (plugin.code === 'dify') {
        formData.difyApps = []
      }
    }
  }
}

// 新增 Dify 应用
const addDifyApp = () => {
  formData.difyApps.push({ name: '', appKey: '', code: '' })
}

// 删除 Dify 应用
const removeDifyApp = (index: number) => {
  formData.difyApps.splice(index, 1)
}

// 提交表单
const submitForm = async () => {
  formLoading.value = true
  try {
    // 准备提交数据
    const submitData = { ...formData }
    delete (submitData as any).difyApps
    
    // 处理特定插件的spare字段
    if (formData.code === 'dify') {
      submitData.spare = JSON.stringify({ items: formData.difyApps })
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
    spare: '',
    difyApps: []
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

.dify-app-item {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>