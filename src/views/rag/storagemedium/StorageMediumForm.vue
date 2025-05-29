<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="名称" prop="mediumName">
        <el-input v-model="formData.mediumName" placeholder="请输入" />
      </el-form-item>
      <el-form-item label="描述" prop="mediumDesc">
        <el-input v-model="formData.mediumDesc" placeholder="请输入描述信息" />
      </el-form-item>
      <el-form-item label="类型" prop="mediumType">
        <el-select 
          v-model="formData.mediumType" 
          placeholder="请选择类型" 
          clearable 
          style="width: 100%"
          @change="handleTypeChange"
          :disabled="formType === 'update'"
        >
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.STORAGE_MEDIUM_TYPE)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      
      <!-- NAS类型特有字段 -->
      <template v-if="formData.mediumType === '2'">
        <el-form-item label="NAS ID" prop="configJson.nasId">
          <el-input 
            v-model="nasConfig.nasId" 
            placeholder="挂载到服务器的NAS ID" 
            @blur="validateNasIdAndPath"
          />
        </el-form-item>
        
        <el-form-item label="挂载路径" prop="mountPath">
          <el-input 
            v-model="formData.mountPath" 
            placeholder="挂载到服务器的绝对路径" 
            @blur="validateNasIdAndPath"
          />
        </el-form-item>
        
        <!-- NAS ID与挂载路径不一致的警告提示 -->
        <el-form-item v-if="showNasIdWarning">
          <el-alert
            title="当前NAS ID与挂载路径不一致，请确认NAS ID是否无误"
            type="warning"
            :closable="false"
            show-icon
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleTestMouthExist" :loading="testing">
            测试路径
          </el-button>
        </el-form-item>
        
        <el-form-item label="挂载状态">
          <div :class="formData.mountStatus === 0 ? 'text-red-500' : 'text-green-500'" class="flex items-center">
            {{ formData.mountStatus === 0 ? '未挂载' : '已挂载' }}
            <el-icon class="ml-5px"><InfoFilled /></el-icon>
            <el-button 
              v-if="formData.mountStatus === 0" 
              type="primary" 
              class="ml-10px"
            >
              挂载
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item label="配置" v-if="configSet">
          <div class="config-form">
            <div class="config-item">
              <span class="config-label">ID:</span>
              <el-input v-model="nasConfig.nasId" />
            </div>
            <div class="config-item">
              <span class="config-label">HOST:</span>
              <el-input v-model="nasConfig.host" disabled />
            </div>
            <div class="config-item">
              <span class="config-label">Type:</span>
              <el-select v-model="nasConfig.type" disabled style="width: 100%">
                <el-option label="NFS" value="NFS" />
                <el-option label="CIFS" value="CIFS" />
              </el-select>
            </div>
            <div class="config-item">
              <span class="config-label">Account:</span>
              <el-input v-model="nasConfig.account" disabled />
            </div>
            <div class="config-item">
              <span class="config-label">Secret:</span>
              <el-input v-model="nasConfig.secret" disabled />
            </div>
          </div>
        </el-form-item>
      </template>
      
      <!-- 数据库类型特有字段 -->
      <template v-else-if="formData.mediumType === '1'">
        <el-form-item label="配置" v-if="configSet">
          <div class="config-form">
            <div class="config-item">
              <span class="config-label">数据库:</span>
              <el-input v-model="dbConfig.database" disabled />
            </div>
            <div class="config-item">
              <span class="config-label">主机地址:</span>
              <el-input v-model="dbConfig.host" />
            </div>
            <div class="config-item">
              <span class="config-label">端口号:</span>
              <el-input v-model="dbConfig.port" disabled />
            </div>
            <div class="config-item">
              <span class="config-label">用户名:</span>
              <el-input v-model="dbConfig.username" />
            </div>
            <div class="config-item">
              <span class="config-label">密码:</span>
              <el-input v-model="dbConfig.password" type="password" />
            </div>
            <div class="config-item">
              <span class="config-label">云盘密钥:</span>
              <el-input v-model="dbConfig.appKey" />
            </div>
            
            <!-- 测试连接按钮现在直接放在密码字段下方 -->
            <div class="config-item test-btn-container">
              <span class="config-label"></span>
              <el-button type="primary" @click="handleTestConnection" :loading="testing">
                测试连接
              </el-button>
            </div>
          </div>
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
import { StorageMediumApi, StorageMediumVO } from '@/api/rag/storagemedium'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { InfoFilled } from '@element-plus/icons-vue'
/** 存储介质 表单 */
defineOptions({ name: 'StorageMediumForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const testing = ref(false) // 测试连接中状态
const configSet = ref(true) // 是否显示配置项
const showNasIdWarning = ref(false) // 是否显示NAS ID与挂载路径不一致的警告

// NAS配置对象
const nasConfig = reactive({
  type: 'CIFS',
  nasId: '',
  host: '192.168.0.1',
  account: 'admin',
  secret: 'sk-123'
})

// 数据库配置对象
const dbConfig = reactive({
  database: 'yliyun',
  host: 'localhost',
  port: '3306',
  username: 'root',
  password: '123456',
  appKey: 'yliyun_123456789',
  userUrl: '/apps/users',
  previewUrl: '/apps/preview',
  downloadUrl: '/apps/file/down'
})

const formData = ref({
  id: undefined,
  mediumName: undefined,
  mediumType: undefined,
  mediumDesc: undefined,
  configJson: undefined,
  status: undefined,
  mountStatus: 0,
  mountPath: '',
})

const formRules = reactive({
  mediumName: [{ required: true, message: '存储介质名称不能为空', trigger: 'blur' }],
  mediumType: [{ required: true, message: '存储介质类型不能为空', trigger: 'change' }],
})

const formRef = ref() // 表单 Ref

// 处理类型切换
const handleTypeChange = (value) => {
  // 重置配置对象
  if (value === '2') { // NAS类型
    nasConfig.type = 'CIFS'
    nasConfig.nasId = '123456'
    nasConfig.host = '192.168.0.1'
    nasConfig.account = 'admin'
    nasConfig.secret = 'sk-123'
  } else if (value === '1') { // 数据库类型
    dbConfig.database = 'yliyun'
    dbConfig.host = 'localhost'
    dbConfig.port = '3306'
    dbConfig.username = 'root'
    dbConfig.password = '123456'
    dbConfig.appKey = 'yliyun_123456789'
  }
}

// 验证NAS ID与挂载路径是否一致
const validateNasIdAndPath = () => {
  // 只在NAS类型时进行验证
  if (formData.value.mediumType !== '2') {
    showNasIdWarning.value = false
    return
  }
  
  const nasId = nasConfig.nasId?.trim()
  const mountPath = formData.value.mountPath?.trim()
  
  // 如果任一字段为空，不显示警告
  if (!nasId || !mountPath) {
    showNasIdWarning.value = false
    return
  }
  
  // 从挂载路径中提取最后的数字部分
  const pathMatch = mountPath.match(/\/([^\/]+)$/)
  if (pathMatch) {
    const pathLastPart = pathMatch[1]
    // 检查NAS ID是否与路径最后部分一致
    showNasIdWarning.value = nasId !== pathLastPart
  } else {
    showNasIdWarning.value = false
  }
}

// 处理测试路径
const handleTestMouthExist = async () => {
  try {
    testing.value = true
    const params = {
      mountPath: formData.value.mountPath
    }
    const res = await StorageMediumApi.testNasConnection(params)
    if (res) {
      message.success('路径存在，已成功挂载')
      // 测试成功后隐藏配置项并更新挂载状态
      configSet.value = false
      formData.value.mountStatus = 1
    } else {
      message.error('路径不存在，请检查是否成功挂载')
    }
  } catch (error) {
    message.error('连接失败: ' + error)
  } finally {
    testing.value = false
  }
}

// 处理测试数据库连接
const handleTestConnection = async () => {
  try {
    testing.value = true
    const params = {
      database: dbConfig.database,
      host: dbConfig.host,
      username: dbConfig.username,
      password: dbConfig.password
    }
    const res = await StorageMediumApi.testDatabaseConnection(params)
    if (res) {
      message.success('连接成功')
    } else {
      message.error('连接失败，请检查各项参数的值')
    }
  } catch (error) {
    message.error('连接失败: ' + error)
  } finally {
    testing.value = false
  }
}

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  
  // 默认显示配置项
  configSet.value = true
  
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      const data = await StorageMediumApi.getStorageMedium(id)
      formData.value = data
      
      // 处理configJson
      if (typeof data.configJson === 'string') {
        const configData = JSON.parse(data.configJson)
        
        if (data.mediumType === '2') { // NAS类型
          Object.assign(nasConfig, configData)
        } else if (data.mediumType === '1') { // 数据库类型
          Object.assign(dbConfig, configData)
        }
      }
      
      // 已挂载的状态下，不显示配置
      if (data.mountStatus === 1) {
        configSet.value = false
      }
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  
  // 处理configJson
  let configJson
  if (formData.value.mediumType === '2') { // NAS类型
    configJson = JSON.stringify(nasConfig)
  } else if (formData.value.mediumType === '1') { // 数据库类型
    configJson = JSON.stringify(dbConfig)
  }
  
  // 提交请求
  formLoading.value = true
  try {
    const data = {
      ...formData.value,
      configJson
    } as unknown as StorageMediumVO
    
    if (formType.value === 'create') {
      await StorageMediumApi.createStorageMedium(data)
      message.success(t('common.createSuccess'))
    } else {
      await StorageMediumApi.updateStorageMedium(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: undefined,
    mediumName: undefined,
    mediumType: undefined,
    mediumDesc: undefined,
    configJson: undefined,
    status: undefined,
    mountStatus: 0,
    mountPath: '',
  }
  
  // 重置警告状态
  showNasIdWarning.value = false
  
  // 重置配置对象
  Object.assign(nasConfig, {
    type: 'CIFS',
    nasId: '',
    host: '192.168.0.1',
    account: 'admin',
    secret: 'sk-123'
  })
  
  Object.assign(dbConfig, {
    database: 'yliyun',
    host: 'localhost',
    port: '3306',
    username: 'root',
    password: '123456',
    appKey: 'yliyun_123456789',
    userUrl: '/apps/users',
    previewUrl: '/apps/preview',
    downloadUrl: '/apps/file/down'
  })
  
  formRef.value?.resetFields()
}
</script>

<style scoped>
.config-form {
  width: 100%;
}

.config-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.config-label {
  width: 80px;
  margin-right: 10px;
  text-align: right;
}

.config-item .el-input,
.config-item .el-select {
  flex: 1;
}

.test-btn-container {
  margin-top: 10px;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.text-red-500 {
  color: #f56c6c;
}

.text-green-500 {
  color: #67c23a;
}

.ml-5px {
  margin-left: 5px;
}

.ml-10px {
  margin-left: 10px;
}
</style>