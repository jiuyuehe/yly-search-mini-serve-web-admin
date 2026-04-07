<template>
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="620px" destroy-on-close>
    <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="110px">
      <el-form-item prop="nasCode">
        <template #label>
          <span class="label-with-help">
            NAS编码
            <el-tooltip
              content="NAS 编码是实际挂载到本地后的目录名称。最终挂载路径会按“挂载位置 + NAS编码”自动拼接，例如 /mnt/nas + 134nas = /mnt/nas/134nas。"
              placement="top"
              effect="light"
            >
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input v-model="formModel.nasCode" placeholder="请输入 NAS 编码" />
      </el-form-item>
      <el-form-item prop="nasName">
        <template #label>
          <span class="label-with-help">
            NAS名称
            <el-tooltip
              content="用于页面展示和业务识别，建议填写业务上容易识别的名称，例如：研发共享目录。"
              placement="top"
              effect="light"
            >
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input v-model="formModel.nasName" placeholder="请输入 NAS 名称" />
      </el-form-item>
      <el-form-item prop="nasUrl">
        <template #label>
          <span class="label-with-help">
            NAS地址
            <el-tooltip
              content="填写 NAS 服务端共享地址，例如 smb://ip/share、//ip/share 或 NFS 地址。地址需与挂载协议匹配。"
              placement="top"
              effect="light"
            >
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input v-model="formModel.nasUrl" placeholder="如 smb://ip/share 或 //ip/share" />
      </el-form-item>
      <el-form-item prop="nasAccount">
        <template #label>
          <span class="label-with-help">
            挂载账号
            <el-tooltip
              content="填写用于挂载 NAS 的访问账号。若目标 NAS 允许匿名访问，可留空。"
              placement="top"
              effect="light"
            >
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input v-model="formModel.nasAccount" placeholder="可选" />
      </el-form-item>
      <el-form-item prop="nasPassword">
        <template #label>
          <span class="label-with-help">
            挂载密码
            <el-tooltip
              content="新增时可填写挂载密码；编辑时留空表示保持原密码不变。"
              placement="top"
              effect="light"
            >
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <InputPassword
          v-model="formModel.nasPassword"
          class="!w-full"
          placeholder="新增时可填写，编辑时留空表示不变"
          inputmode="text"
        />
      </el-form-item>
      <el-form-item prop="localPath">
        <template #label>
          <span class="label-with-help">
            挂载位置
            <el-tooltip
              content="这里只填写上级目录，不需要输入最后一层 NAS 编码。输入框后面的灰色“/NAS编码”会自动跟随 NAS 编码变化显示，最终路径按“挂载位置 + NAS编码”自动拼接，例如填写 /mnt/nas，NAS编码为 134nas，则最终路径为 /mnt/nas/134nas。"
              placement="top"
              effect="light"
            >
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input v-model="formModel.localPath" placeholder="例如：/mnt/nas">
          <template #append>
            <span class="mount-path-suffix">{{ mountPathSuffix }}</span>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="最终路径">
        <div class="path-preview">
          <div class="path-preview__value">{{ finalMountPath || '留空则按系统默认路径生成' }}</div>
          <div class="path-preview__tip">系统将以“挂载位置 + NAS编码”作为实际挂载到本地的目录路径。</div>
        </div>
      </el-form-item>
      <el-form-item prop="mountType">
        <template #label>
          <span class="label-with-help">
            挂载协议
            <el-tooltip
              content="请选择与 NAS 服务端一致的协议类型，例如 SMB3、CIFS3 或 NFS。选择错误会导致挂载失败。"
              placement="top"
              effect="light"
            >
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-select v-model="formModel.mountType" class="!w-full">
          <el-option v-for="item in MOUNT_TYPE_OPTIONS" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item prop="attrText">
        <template #label>
          <span class="label-with-help">
            扩展属性
            <el-tooltip
              content="可选扩展配置，建议填写合法 JSON 字符串，用于存放协议附加参数或业务扩展信息。"
              placement="top"
              effect="light"
            >
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input v-model="formModel.attrText" type="textarea" :rows="4" placeholder="可选，JSON 字符串" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import type { NasSaveReqVO, NasVO } from '@/api/nas/nas'
import { NasApi } from '@/api/nas/nas'
import InputPassword from '@/components/InputPassword/src/InputPassword.vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { MOUNT_TYPE_OPTIONS, type FormMode } from './constants'

const emit = defineEmits<{
  success: []
}>()

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const formMode = ref<FormMode>('create')
const submitting = ref(false)
const formRef = ref()
const formModel = reactive<NasSaveReqVO>({
  nasCode: '',
  nasName: '',
  nasUrl: '',
  nasAccount: '',
  nasPassword: '',
  localPath: '',
  mountType: 'SMB3',
  attrText: ''
})

const formRules = reactive({
  nasCode: [{ required: true, message: 'NAS编码不能为空', trigger: 'blur' }],
  nasName: [{ required: true, message: 'NAS名称不能为空', trigger: 'blur' }],
  nasUrl: [{ required: true, message: 'NAS地址不能为空', trigger: 'blur' }],
  mountType: [{ required: true, message: '挂载协议不能为空', trigger: 'change' }]
})

const dialogTitle = computed(() => (formMode.value === 'create' ? '新增 NAS' : '编辑 NAS'))

const normalizePath = (value?: string) => {
  if (!value) {
    return ''
  }
  const normalized = value.trim().replace(/\\/g, '/').replace(/\/+$/g, '')
  return normalized === '' ? '' : normalized
}

const joinMountPath = (basePath?: string, nasCode?: string) => {
  const normalizedBase = normalizePath(basePath)
  const normalizedNasCode = (nasCode || '').trim().replace(/^\/+|\/+$/g, '')

  if (!normalizedBase || !normalizedNasCode) {
    return normalizedBase || ''
  }
  if (normalizedBase === '/') {
    return `/${normalizedNasCode}`
  }
  return `${normalizedBase}/${normalizedNasCode}`
}

const extractBaseMountPath = (fullPath?: string, nasCode?: string) => {
  const normalizedFullPath = normalizePath(fullPath)
  const normalizedNasCode = (nasCode || '').trim().replace(/^\/+|\/+$/g, '')

  if (!normalizedFullPath || !normalizedNasCode) {
    return normalizedFullPath
  }

  const suffix = `/${normalizedNasCode}`
  if (normalizedFullPath.toLowerCase().endsWith(suffix.toLowerCase())) {
    const basePath = normalizedFullPath.slice(0, normalizedFullPath.length - suffix.length)
    return basePath || '/'
  }

  return normalizedFullPath
}

const finalMountPath = computed(() => joinMountPath(formModel.localPath, formModel.nasCode))
const mountPathSuffix = computed(() => {
  const nasCode = (formModel.nasCode || '').trim().replace(/^\/+|\/+$/g, '')
  return `/${nasCode || 'NAS编码'}`
})

const resetFormModel = () => {
  formModel.nasId = undefined
  formModel.nasCode = ''
  formModel.nasName = ''
  formModel.nasUrl = ''
  formModel.nasAccount = ''
  formModel.nasPassword = ''
  formModel.localPath = ''
  formModel.mountType = 'SMB3'
  formModel.attrText = ''
}

const open = async (mode: FormMode, row?: NasVO) => {
  dialogVisible.value = true
  formMode.value = mode
  resetFormModel()
  await nextTick()
  formRef.value?.resetFields()

  if (mode === 'update' && row) {
    const detail = await NasApi.getNasDetail(row.nasId)
    formModel.nasId = detail.nasId
    formModel.nasCode = detail.nasCode
    formModel.nasName = detail.nasName
    formModel.nasUrl = detail.nasUrl
    formModel.nasAccount = detail.nasAccount || ''
    formModel.nasPassword = detail.nasPassword || ''
    formModel.localPath = extractBaseMountPath(detail.localPath, detail.nasCode)
    formModel.mountType = detail.mountType
    formModel.attrText = detail.attrText || ''
  }
}

const submitForm = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    const payload: NasSaveReqVO = {
      ...formModel,
      localPath: formModel.localPath ? joinMountPath(formModel.localPath, formModel.nasCode) : ''
    }
    if (formMode.value === 'create') {
      await NasApi.createAdminNas(payload)
      message.success(t('common.createSuccess'))
    } else if (formModel.nasId) {
      await NasApi.updateNas(formModel.nasId, payload)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
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

.path-preview {
  width: 100%;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--el-fill-color-lighter);
}

.path-preview__value {
  color: var(--el-text-color-primary);
  font-weight: 500;
  word-break: break-all;
}

.path-preview__tip {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.mount-path-suffix {
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
}
</style>
