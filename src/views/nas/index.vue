<template>
  <ContentWrap>
    <h2 class="mb-10px">NAS 管理</h2>
    <p class="text-gray-500 text-13px mb-15px">
      首期仅提供 NAS 管理、挂载/卸载、文件夹授权三项能力。
    </p>
  </ContentWrap>

  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="80px">
      <el-form-item label="关键字" prop="keyword">
        <el-input
          v-model="queryParams.keyword"
          class="!w-240px"
          clearable
          placeholder="编码 / 名称 / 地址"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px" />
          搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-5px" />
          重置
        </el-button>
        <el-button type="primary" plain v-hasPermi="['nas:nas:create']" @click="handleCreate">
          <Icon icon="ep:plus" class="mr-5px" />
          新增 NAS
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="NAS编码" prop="nasCode" width="160" />
      <el-table-column label="NAS名称" prop="nasName" min-width="180" />
      <el-table-column label="NAS地址" prop="nasUrl" min-width="220" show-overflow-tooltip />
      <el-table-column label="挂载协议" prop="mountType" width="110" />
      <el-table-column label="挂载位置" prop="localPath" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" prop="status" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">
            {{ scope.row.status === 0 ? '可用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="挂载状态" prop="isMounted" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.isMounted ? 'success' : 'warning'">
            {{ scope.row.isMounted ? '已挂载' : '未挂载' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" prop="updateTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="scope">
          <el-button link type="primary" size="small" v-hasPermi="['nas:nas:update']" @click="openForm('update', scope.row)">
            编辑
          </el-button>
          <el-button link type="danger" size="small" v-hasPermi="['nas:nas:delete']" @click="handleDelete(scope.row)">
            删除
          </el-button>
          <el-button link type="warning" size="small" v-hasPermi="['nas:nas:mount']" @click="handleMount(scope.row)">
            {{ scope.row.isMounted ? '卸载' : '挂载' }}
          </el-button>
          <el-button link type="success" size="small" v-hasPermi="['nas:nas:permission']" @click="openPermissionDialog(scope.row)">
            授权
          </el-button>
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

  <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增 NAS' : '编辑 NAS'" width="620px" destroy-on-close>
    <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="110px">
      <el-form-item prop="nasCode">
        <template #label>
          <span class="label-with-help">
            NAS编码
            <el-tooltip content="NAS 编码是实际挂载到本地后的目录名称。最终挂载路径会按“挂载位置 + NAS编码”自动拼接，例如 /mnt/nas + 134nas = /mnt/nas/134nas。" placement="top" effect="light">
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
            <el-tooltip content="用于页面展示和业务识别，建议填写业务上容易识别的名称，例如：研发共享目录。" placement="top" effect="light">
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
            <el-tooltip content="填写 NAS 服务端共享地址，例如 smb://ip/share、//ip/share 或 NFS 地址。地址需与挂载协议匹配。" placement="top" effect="light">
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
            <el-tooltip content="填写用于挂载 NAS 的访问账号。若目标 NAS 允许匿名访问，可留空。" placement="top" effect="light">
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
            <el-tooltip content="新增时可填写挂载密码；编辑时留空表示保持原密码不变。" placement="top" effect="light">
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
            <el-tooltip content="这里只填写上级目录，不需要输入最后一层 NAS 编码。输入框后面的灰色“/NAS编码”会自动跟随 NAS 编码变化显示，最终路径按“挂载位置 + NAS编码”自动拼接，例如填写 /mnt/nas，NAS编码为 134nas，则最终路径为 /mnt/nas/134nas。" placement="top" effect="light">
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
            <el-tooltip content="请选择与 NAS 服务端一致的协议类型，例如 SMB3、CIFS3 或 NFS。选择错误会导致挂载失败。" placement="top" effect="light">
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
            <el-tooltip content="可选扩展配置，建议填写合法 JSON 字符串，用于存放协议附加参数或业务扩展信息。" placement="top" effect="light">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input v-model="formModel.attrText" type="textarea" :rows="4" placeholder="可选，JSON 字符串" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="formSubmitting" @click="submitForm">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="permissionVisible" :title="permissionDialogTitle" width="980px" destroy-on-close>
    <template #header>
      <div>
        <div class="text-16px font-600">{{ permissionDialogTitle }}</div>
        <div class="text-12px text-gray-500 mt-4px">{{ currentNas ? `${currentNas.nasName} (${currentNas.nasCode})` : '' }}</div>
      </div>
    </template>

    <div class="mb-12px">
      <el-button type="primary" plain v-hasPermi="['nas:nas:permission']" @click="openPermissionForm('create')">
        <Icon icon="ep:plus" class="mr-5px" />
        新增授权
      </el-button>
    </div>

    <el-table v-loading="permissionLoading" :data="permissionList">
      <el-table-column label="路径" prop="filePath" min-width="220" show-overflow-tooltip />
      <el-table-column label="对象类型" prop="perTargetType" width="100">
        <template #default="scope">
          {{ TARGET_TYPE_LABELS[scope.row.perTargetType] || scope.row.perTargetType }}
        </template>
      </el-table-column>
      <el-table-column label="对象ID" prop="perTargetId" width="100" />
      <el-table-column label="对象名称" prop="perTargetName" min-width="140" show-overflow-tooltip />
      <el-table-column label="文件夹" prop="folder" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.folder ? 'success' : 'info'">
            {{ scope.row.folder ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="权限" prop="permissions" min-width="240">
        <template #default="scope">
          {{ formatPermissionBits(scope.row.permissions) }}
        </template>
      </el-table-column>
      <el-table-column label="失效时间" prop="expireTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" size="small" v-hasPermi="['nas:nas:permission']" @click="openPermissionForm('update', scope.row)">
            编辑
          </el-button>
          <el-button link type="danger" size="small" v-hasPermi="['nas:nas:permission']" @click="handleDeletePermission(scope.row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="permissionFormVisible" :title="permissionFormMode === 'create' ? '新增路径授权' : '编辑路径授权'" width="720px" append-to-body destroy-on-close>
      <el-form ref="permissionFormRef" :model="permissionFormModel" :rules="permissionFormRules" label-width="110px">
        <el-form-item label="路径" prop="filePath">
          <el-input v-model="permissionFormModel.filePath" placeholder="例如 / 或 /合同/2026" />
        </el-form-item>
        <el-form-item label="对象类型" prop="perTargetType">
          <el-select v-model="permissionFormModel.perTargetType" class="!w-full">
            <el-option v-for="item in TARGET_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="对象ID" prop="perTargetId">
          <el-input-number v-model="permissionFormModel.perTargetId" class="!w-full" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="对象名称" prop="perTargetName">
          <el-input v-model="permissionFormModel.perTargetName" placeholder="请输入显示名称" />
        </el-form-item>
        <el-form-item label="文件夹授权" prop="folder">
          <el-switch v-model="permissionFormModel.folder" />
        </el-form-item>
        <el-form-item label="权限位" prop="permissionBits">
          <el-checkbox-group v-model="permissionFormBits">
            <el-checkbox v-for="item in PERMISSION_BIT_OPTIONS" :key="item.value" :label="item.value">
              {{ item.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="失效时间" prop="expireTime">
          <el-date-picker
            v-model="permissionFormModel.expireTime"
            class="!w-full"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="可选"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="permissionFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="permissionFormSubmitting" @click="submitPermissionForm">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script lang="ts" setup>
import { Icon } from '@/components/Icon'
import {
  NasApi,
  type NasMountType,
  type NasPageReqVO,
  type NasPermissionSaveReqVO,
  type NasPermissionVO,
  type NasSaveReqVO,
  type NasVO
} from '@/api/nas/nas'
import InputPassword from '@/components/InputPassword/src/InputPassword.vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { dateFormatter } from '@/utils/formatTime'

defineOptions({ name: 'NasAdmin' })

type FormMode = 'create' | 'update'

const MOUNT_TYPE_OPTIONS: NasMountType[] = ['SMB2', 'SMB3', 'CIFS2', 'CIFS3', 'FTP', 'NFS']
const TARGET_TYPE_OPTIONS = [
  { label: '用户', value: 0 },
  { label: '部门', value: 1 },
  { label: '企业', value: 100 }
]
const TARGET_TYPE_LABELS: Record<number, string> = {
  0: '用户',
  1: '部门',
  100: '企业'
}
const PERMISSION_BIT_OPTIONS = [
  { label: '查看目录', value: 1 },
  { label: '重命名', value: 4 },
  { label: '查看文件', value: 8 },
  { label: '修改', value: 16 },
  { label: '上传', value: 32 },
  { label: '下载', value: 64 },
  { label: '删除', value: 128 },
  { label: '分享', value: 256 },
  { label: '在线预览', value: 512 },
  { label: '在线编辑', value: 1024 },
  { label: '授权', value: 1073741824 }
]

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const total = ref(0)
const list = ref<NasVO[]>([])
const queryFormRef = ref()
const queryParams = reactive<NasPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  keyword: undefined,
  type: 'admin'
})

const formVisible = ref(false)
const formMode = ref<FormMode>('create')
const formSubmitting = ref(false)
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

const permissionVisible = ref(false)
const permissionLoading = ref(false)
const permissionList = ref<NasPermissionVO[]>([])
const currentNas = ref<NasVO>()
const permissionFormVisible = ref(false)
const permissionFormMode = ref<FormMode>('create')
const permissionFormSubmitting = ref(false)
const permissionFormRef = ref()
const permissionFormBits = ref<number[]>([1])
const permissionFormModel = reactive<NasPermissionSaveReqVO>({
  id: undefined,
  filePath: '/',
  perTargetType: 0,
  perTargetId: 0,
  perTargetName: '',
  folder: true,
  permissions: 1,
  expireTime: undefined,
  mark: undefined,
  markType: undefined,
  attrs: undefined
})
const permissionFormRules = reactive({
  filePath: [{ required: true, message: '路径不能为空', trigger: 'blur' }],
  perTargetType: [{ required: true, message: '对象类型不能为空', trigger: 'change' }],
  perTargetId: [{ required: true, message: '对象ID不能为空', trigger: 'change' }],
  perTargetName: [{ required: true, message: '对象名称不能为空', trigger: 'blur' }],
  permissionBits: [{ required: true, message: '请至少选择一个权限位', trigger: 'change' }]
})

const permissionDialogTitle = computed(() => {
  if (!currentNas.value) {
    return '文件夹授权'
  }
  return `文件夹授权 - ${currentNas.value.nasName}`
})

const getList = async () => {
  loading.value = true
  try {
    queryParams.type = 'admin'
    const data = await NasApi.getNasPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.type = 'admin'
  handleQuery()
}

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

const handleCreate = () => {
  openForm('create')
}

const openForm = async (mode: FormMode, row?: NasVO) => {
  formVisible.value = true
  formMode.value = mode
  resetFormModel()
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
  formSubmitting.value = true
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
    formVisible.value = false
    await getList()
  } finally {
    formSubmitting.value = false
  }
}

const handleDelete = async (row: NasVO) => {
  await message.delConfirm()
  await NasApi.deleteNas(row.nasId)
  message.success(t('common.delSuccess'))
  await getList()
}

const handleMount = async (row: NasVO) => {
  if (row.isMounted) {
    await NasApi.umountNas(row.nasId)
    message.success('卸载成功')
  } else {
    await NasApi.mountNas(row.nasId)
    message.success('挂载成功')
  }
  await getList()
  if (currentNas.value?.nasId === row.nasId) {
    currentNas.value = { ...row, isMounted: !row.isMounted }
  }
}

const formatPermissionBits = (value?: number) => {
  if (!value) {
    return '-'
  }
  const labels = PERMISSION_BIT_OPTIONS.filter((item) => (value & item.value) === item.value).map((item) => item.label)
  return labels.length > 0 ? labels.join('、') : '-'
}

const mergePermissionBits = (values: number[]) => {
  return values.reduce((result, current) => result | current, 0)
}

const resetPermissionForm = () => {
  permissionFormModel.id = undefined
  permissionFormModel.filePath = '/'
  permissionFormModel.perTargetType = 0
  permissionFormModel.perTargetId = 0
  permissionFormModel.perTargetName = ''
  permissionFormModel.folder = true
  permissionFormModel.permissions = 1
  permissionFormModel.expireTime = undefined
  permissionFormModel.mark = undefined
  permissionFormModel.markType = undefined
  permissionFormModel.attrs = undefined
  permissionFormBits.value = [1]
}

const loadPermissions = async (nasId: number) => {
  permissionLoading.value = true
  try {
    permissionList.value = await NasApi.getPermissionList(nasId)
  } finally {
    permissionLoading.value = false
  }
}

const openPermissionDialog = async (row: NasVO) => {
  currentNas.value = row
  permissionVisible.value = true
  await loadPermissions(row.nasId)
}

const openPermissionForm = (mode: FormMode, row?: NasPermissionVO) => {
  permissionFormVisible.value = true
  permissionFormMode.value = mode
  resetPermissionForm()
  permissionFormRef.value?.resetFields()
  if (mode === 'update' && row) {
    permissionFormModel.id = row.id
    permissionFormModel.filePath = row.filePath
    permissionFormModel.perTargetType = row.perTargetType
    permissionFormModel.perTargetId = row.perTargetId
    permissionFormModel.perTargetName = row.perTargetName
    permissionFormModel.folder = row.folder
    permissionFormModel.permissions = row.permissions
    permissionFormModel.expireTime = row.expireTime
    permissionFormModel.mark = row.mark
    permissionFormModel.markType = row.markType
    permissionFormModel.attrs = row.attrs
    permissionFormBits.value = PERMISSION_BIT_OPTIONS.filter((item) => ((row.permissions || 0) & item.value) === item.value).map((item) => item.value)
  }
}

const submitPermissionForm = async () => {
  if (!currentNas.value) {
    return
  }
  permissionFormModel.permissions = mergePermissionBits(permissionFormBits.value)
  await permissionFormRef.value.validate()
  permissionFormSubmitting.value = true
  try {
    if (permissionFormMode.value === 'create') {
      await NasApi.createPermission(currentNas.value.nasId, permissionFormModel)
      message.success(t('common.createSuccess'))
    } else if (permissionFormModel.id) {
      await NasApi.updatePermission(currentNas.value.nasId, permissionFormModel.id, permissionFormModel)
      message.success(t('common.updateSuccess'))
    }
    permissionFormVisible.value = false
    await loadPermissions(currentNas.value.nasId)
  } finally {
    permissionFormSubmitting.value = false
  }
}

const handleDeletePermission = async (row: NasPermissionVO) => {
  if (!currentNas.value) {
    return
  }
  await message.delConfirm()
  await NasApi.deletePermission(currentNas.value.nasId, row.id)
  message.success(t('common.delSuccess'))
  await loadPermissions(currentNas.value.nasId)
}

onMounted(() => {
  getList()
})
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