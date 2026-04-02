<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      v-loading="formLoading"
    >
      <el-form-item prop="mediumName">
        <template #label>
          <span class="label-with-help">
            名称
            <el-tooltip content="用于 RAG 内部识别该数据源，建议填写业务上易理解的名称。" placement="top" effect="light">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input v-model="formData.mediumName" placeholder="请输入数据源名称，例如：研发共享NAS" />
      </el-form-item>

      <el-form-item prop="mediumDesc">
        <template #label>
          <span class="label-with-help">
            描述
            <el-tooltip content="可补充说明数据源用途、目录范围或维护人，便于后续排查和管理。" placement="top" effect="light">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input
          v-model="formData.mediumDesc"
          type="textarea"
          :rows="2"
          placeholder="请输入数据源描述，例如：挂载研发部共享资料目录"
        />
      </el-form-item>

      <el-form-item prop="mediumType">
        <template #label>
          <span class="label-with-help">
            类型
            <el-tooltip content="NAS 用于接入已在 NAS 中心登记的共享目录，数据库用于接入结构化业务数据。" placement="top" effect="light">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-select
          v-model="formData.mediumType"
          placeholder="请选择数据源类型"
          clearable
          style="width: 100%"
          :disabled="formType === 'update'"
          @change="handleTypeChange"
        >
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.STORAGE_MEDIUM_TYPE)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>

      <template v-if="formData.mediumType === '2'">
        <el-form-item prop="nasId">
          <template #label>
            <span class="label-with-help">
              NAS资源
              <el-tooltip content="RAG 只负责选择 NAS 中心中已有的 NAS 资源，不在此页面创建、修改或挂载 NAS。" placement="top" effect="light">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <div class="nas-selector">
            <el-select
              v-model="formData.nasId"
              filterable
              clearable
              placeholder="请选择 NAS 中心中的 NAS 资源"
              style="width: 100%"
              :loading="nasLoading"
              @change="handleNasChange"
            >
              <el-option
                v-for="item in nasOptions"
                :key="item.nasId"
                :label="`${item.nasName} (${item.nasCode})`"
                :value="String(item.nasId)"
              >
                <div class="nas-option">
                  <span>{{ item.nasName }} ({{ item.nasCode }})</span>
                  <el-tag :type="item.isMounted ? 'success' : 'warning'" size="small">
                    {{ item.isMounted ? '已挂载' : '未挂载' }}
                  </el-tag>
                </div>
              </el-option>
            </el-select>
            <el-button @click="loadNasOptions" :loading="nasLoading">刷新</el-button>
          </div>
        </el-form-item>

        <el-form-item label="资源信息">
          <div class="nas-detail-card">
            <div class="nas-detail-row">
              <span class="detail-label">NAS名称</span>
              <span>{{ selectedNas?.nasName || '-' }}</span>
            </div>
            <div class="nas-detail-row">
              <span class="detail-label">NAS编码</span>
              <span>{{ selectedNas?.nasCode || '-' }}</span>
            </div>
            <div class="nas-detail-row">
              <span class="detail-label">NAS地址</span>
              <span>{{ selectedNas?.nasUrl || '-' }}</span>
            </div>
            <div class="nas-detail-row">
              <span class="detail-label">挂载协议</span>
              <span>{{ selectedNas?.mountType || '-' }}</span>
            </div>
            <div class="nas-detail-row">
              <span class="detail-label">本地路径</span>
              <span>{{ selectedNas?.localPath || '-' }}</span>
            </div>
            <div class="nas-detail-row">
              <span class="detail-label">挂载状态</span>
              <el-tag :type="formData.mountStatus === 1 ? 'success' : 'warning'" size="small">
                {{ formData.mountStatus === 1 ? '已挂载' : '未挂载' }}
              </el-tag>
            </div>
          </div>
        </el-form-item>

        <el-form-item>
          <el-alert
            title="NAS 的创建、修改、挂载和可读性校验统一在 NAS 模块完成；RAG 这里只保存业务绑定关系。"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form-item>
      </template>

      <template v-else-if="formData.mediumType === '1'">
        <el-form-item>
          <template #label>
            <span class="label-with-help">
              数据库名称
              <el-tooltip content="当前数据库类型固定为系统默认库名称，用于构造数据库连接串。" placement="top" effect="light">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="dbConfig.database" disabled placeholder="数据库名称由系统预置" />
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="label-with-help">
              主机地址
              <el-tooltip content="填写数据库服务地址或域名，用于连接业务数据库。" placement="top" effect="light">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="dbConfig.host" placeholder="请输入数据库主机地址，例如：127.0.0.1" />
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="label-with-help">
              端口号
              <el-tooltip content="当前端口为默认值，如需调整请在后台数据库配置中统一处理。" placement="top" effect="light">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="dbConfig.port" disabled placeholder="数据库端口由系统预置" />
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="label-with-help">
              用户名
              <el-tooltip content="请输入具备读权限的数据库账号。" placement="top" effect="light">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="dbConfig.username" placeholder="请输入数据库账号" />
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="label-with-help">
              密码
              <el-tooltip content="建议使用只读账号密码，避免误操作生产数据。" placement="top" effect="light">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <InputPassword v-model="dbConfig.password" placeholder="请输入数据库密码" inputmode="text" />
        </el-form-item>

        <el-form-item>
          <template #label>
            <span class="label-with-help">
              云盘密钥
              <el-tooltip content="用于访问配套文件服务接口，请与业务应用配置保持一致。" placement="top" effect="light">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="dbConfig.appKey" placeholder="请输入云盘应用密钥" />
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
import InputPassword from '@/components/InputPassword/src/InputPassword.vue'
import { NasApi, type NasVO } from '@/api/nas/nas'
import { StorageMediumApi, StorageMediumVO } from '@/api/rag/storagemedium'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { QuestionFilled } from '@element-plus/icons-vue'

defineOptions({ name: 'StorageMediumForm' })

type FormDataType = {
  id: number | undefined
  mediumName: string | undefined
  mediumType: string | undefined
  mediumDesc: string | undefined
  configJson: string | undefined
  status: number | undefined
  mountStatus: number
  mountPath: string
  nasId: string
}

const defaultDbConfig = () => ({
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

const createEmptyFormData = (): FormDataType => ({
  id: undefined,
  mediumName: undefined,
  mediumType: undefined,
  mediumDesc: undefined,
  configJson: undefined,
  status: undefined,
  mountStatus: 0,
  mountPath: '',
  nasId: ''
})

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const nasLoading = ref(false)

const nasOptions = ref<NasVO[]>([])
const selectedNas = ref<NasVO>()

const dbConfig = reactive(defaultDbConfig())
const formData = ref<FormDataType>(createEmptyFormData())
const formRef = ref()

const parseJson = (json?: string) => {
  if (!json) {
    return {}
  }
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

const parseNasId = (configJson?: string) => {
  const config = parseJson(configJson)
  return config?.nasId ? String(config.nasId) : ''
}

const validateNasId = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (formData.value.mediumType === '2' && !value) {
    callback(new Error('请选择已有 NAS 资源'))
    return
  }
  callback()
}

const formRules = reactive({
  mediumName: [{ required: true, message: '存储介质名称不能为空', trigger: 'blur' }],
  mediumType: [{ required: true, message: '存储介质类型不能为空', trigger: 'change' }],
  nasId: [{ validator: validateNasId, trigger: 'change' }]
})

const buildNasConfigJson = () => JSON.stringify({
  source: 'localfile',
  nasId: formData.value.nasId
})

const syncSelectedNas = (nas?: NasVO) => {
  selectedNas.value = nas
  formData.value.mountPath = nas?.localPath || ''
  formData.value.mountStatus = nas?.isMounted ? 1 : 0
}

const loadNasOptions = async () => {
  nasLoading.value = true
  try {
    nasOptions.value = await NasApi.getAdminNasOptions()
    if (formData.value.nasId) {
      const current = nasOptions.value.find((item) => String(item.nasId) === formData.value.nasId)
      if (current) {
        syncSelectedNas(current)
      }
    }
  } finally {
    nasLoading.value = false
  }
}

const handleTypeChange = async (value?: string) => {
  selectedNas.value = undefined
  formData.value.nasId = ''
  formData.value.mountPath = ''
  formData.value.mountStatus = 0

  if (value === '2') {
    await loadNasOptions()
    return
  }

  nasOptions.value = []
  Object.assign(dbConfig, defaultDbConfig())
}

const handleNasChange = async (nasId?: string) => {
  if (!nasId) {
    syncSelectedNas(undefined)
    return
  }
  const detail = await NasApi.getNasDetail(Number(nasId))
  syncSelectedNas(detail)
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()

  if (!id) {
    return
  }

  formLoading.value = true
  try {
    const data = await StorageMediumApi.getStorageMedium(id)
    formData.value = {
      id: data.id,
      mediumName: data.mediumName,
      mediumType: data.mediumType,
      mediumDesc: data.mediumDesc,
      configJson: data.configJson,
      status: data.status,
      mountStatus: data.mountStatus || 0,
      mountPath: data.mountPath || '',
      nasId: parseNasId(data.configJson)
    }

    if (data.mediumType === '2') {
      await loadNasOptions()
      if (formData.value.nasId) {
        try {
          const detail = await NasApi.getNasDetail(Number(formData.value.nasId))
          syncSelectedNas(detail)
        } catch {
          syncSelectedNas(undefined)
        }
      }
    } else if (data.mediumType === '1' && typeof data.configJson === 'string') {
      Object.assign(dbConfig, defaultDbConfig(), parseJson(data.configJson))
    }
  } finally {
    formLoading.value = false
  }
}
defineExpose({ open })

const emit = defineEmits(['success'])

const submitForm = async () => {
  await formRef.value.validate()

  let configJson
  if (formData.value.mediumType === '2') {
    configJson = buildNasConfigJson()
  } else if (formData.value.mediumType === '1') {
    configJson = JSON.stringify(dbConfig)
  }

  formLoading.value = true
  try {
    const data: StorageMediumVO = {
      id: formData.value.id as number,
      mediumName: formData.value.mediumName || '',
      mediumType: formData.value.mediumType || '',
      mediumDesc: formData.value.mediumDesc || '',
      configJson,
      status: formData.value.status ?? 0,
      mountStatus: formData.value.mountStatus,
      mountPath: formData.value.mountPath
    }

    if (formType.value === 'create') {
      await StorageMediumApi.createStorageMedium(data)
      message.success(t('common.createSuccess'))
    } else {
      await StorageMediumApi.updateStorageMedium(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  formData.value = createEmptyFormData()
  selectedNas.value = undefined
  nasOptions.value = []
  Object.assign(dbConfig, defaultDbConfig())
  formRef.value?.resetFields()
}
</script>

<style scoped>
.label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.help-icon {
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.nas-selector {
  width: 100%;
  display: flex;
  gap: 12px;
}

.nas-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.nas-detail-card {
  width: 100%;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px 16px;
  background: var(--el-fill-color-blank);
}

.nas-detail-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.nas-detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--el-text-color-secondary);
}
</style>
