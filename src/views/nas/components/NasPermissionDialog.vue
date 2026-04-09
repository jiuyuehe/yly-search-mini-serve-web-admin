<template>
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="980px" destroy-on-close>
    <template #header>
      <div>
        <div class="text-16px font-600">{{ dialogTitle }}</div>
        <div class="text-12px text-gray-500 mt-4px">{{ currentNas ? `${currentNas.nasName} (${currentNas.nasCode})` : '' }}</div>
      </div>
    </template>

    <el-card >
      <div class="mb-12px">
        <el-button type="primary" plain v-hasPermi="['nas:nas:permission']" @click="openPermissionForm('create')">
          <Icon icon="ep:plus" class="mr-5px" />
          新增授权
        </el-button>
      </div>
      <el-table
        height="500"
        max-height="600" v-loading="permissionLoading" :data="permissionList">
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

      <Pagination
        :total="permissionTotal"
        v-model:page="permissionQueryParams.pageNo"
        v-model:limit="permissionQueryParams.pageSize"
        @pagination="getPermissionList"
      />
    </el-card>


    <el-dialog v-model="permissionFormVisible" :title="permissionFormTitle" width="720px" append-to-body destroy-on-close>
      <el-form ref="permissionFormRef" :model="permissionFormModel" :rules="permissionFormRules" label-width="110px">
        <el-form-item label="选择文件夹" prop="filePath">
          <div class="permission-path-picker">
            <el-input v-model="permissionFormModel.filePath" readonly placeholder="请选择挂载目录下的文件夹">
              <template #append>
                <el-button @click="openFileBrowser">浏览目录</el-button>
              </template>
            </el-input>
            <div class="permission-path-picker__meta">
              <span>双击文件夹可继续进入目录，只允许选择文件夹。</span>
              <el-tag size="small" :type="permissionFormModel.folder ? 'success' : 'info'">
                {{ permissionFormModel.folder ? '当前为文件夹' : '当前为文件' }}
              </el-tag>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="对象类型" prop="perTargetType">
          <el-select v-model="permissionFormModel.perTargetType" class="!w-full">
            <el-option v-for="item in TARGET_TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isPermissionUserTarget" label="对象ID" prop="perTargetId">
          <div class="permission-target-picker">
            <el-select
              v-model="permissionTargetUserIds"
              class="!w-full"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择用户，可多选"
            >
              <el-option
                v-for="item in permissionUserOptions"
                :key="item.id"
                :label="`${item.nickname} (ID:${item.id})`"
                :value="item.id"
              />
            </el-select>
            <div class="permission-target-preview">
              <template v-if="selectedPermissionUsers.length">
                <el-tag v-for="item in selectedPermissionUsers" :key="item.id" size="small" class="mr-6px mb-6px">
                  {{ item.nickname }}
                </el-tag>
              </template>
              <span v-else>请选择至少一个用户</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-else-if="isPermissionDeptTarget" label="对象ID" prop="perTargetId">
          <div class="permission-target-picker">
            <el-tree-select
              v-model="permissionTargetDeptId"
              class="!w-full"
              :data="permissionDeptTree"
              :props="defaultProps"
              check-strictly
              clearable
              default-expand-all
              filterable
              node-key="id"
              placeholder="请选择部门"
            />
            <div class="permission-target-preview">
              {{ permissionTargetPreviewText }}
            </div>
          </div>
        </el-form-item>
        <el-form-item v-else label="对象ID">
          <el-input :model-value="'企业级授权，无需额外选择对象'" disabled />
        </el-form-item>
        <el-form-item label="文件夹授权" prop="folder">
          <el-switch v-model="permissionFormModel.folder" />
        </el-form-item>
        <el-form-item label="权限位" prop="permissions">
          <el-checkbox-group v-model="permissionFormBits">
            <el-checkbox v-for="item in PERMISSION_BIT_OPTIONS" :key="item.value" :label="item.value">
              {{ item.label }}
            </el-checkbox>
          </el-checkbox-group>
          <div class="permission-target-preview">
            当前权限值：{{ permissionBitsValue }}{{ permissionBitsValue ? `（${formatPermissionBits(permissionBitsValue)}）` : '' }}
          </div>
        </el-form-item>
        <el-form-item label="失效时间" prop="expireTime">
          <el-date-picker
            v-model="permissionFormModel.expireTime"
            class="!w-full"
            type="datetime"
            value-format="x"
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

  <NasFolderBrowserDialog ref="folderBrowserDialogRef" @confirm="handleFolderBrowserConfirm" />
</template>

<script lang="ts" setup>
import * as DeptApi from '@/api/system/dept'
import * as UserApi from '@/api/system/user'
import { Icon } from '@/components/Icon'
import { NasApi, type NasPermissionPageReqVO, type NasPermissionSaveReqVO, type NasPermissionVO, type NasVO } from '@/api/nas/nas'
import { dateFormatter } from '@/utils/formatTime'
import { defaultProps, handleTree } from '@/utils/tree'
import NasFolderBrowserDialog from './NasFolderBrowserDialog.vue'
import {
  DEPT_TARGET_TYPE,
  ENTERPRISE_TARGET_ID,
  ENTERPRISE_TARGET_TYPE,
  PERMISSION_BIT_OPTIONS,
  TARGET_TYPE_LABELS,
  TARGET_TYPE_OPTIONS,
  USER_TARGET_TYPE,
  type FormMode
} from './constants'

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const permissionLoading = ref(false)
const permissionTotal = ref(0)
const permissionList = ref<NasPermissionVO[]>([])
const currentNas = ref<NasVO>()
const permissionQueryParams = reactive<NasPermissionPageReqVO>({
  pageNo: 1,
  pageSize: 10
})

const permissionFormVisible = ref(false)
const permissionFormMode = ref<FormMode>('create')
const permissionFormSubmitting = ref(false)
const permissionFormRef = ref()
const permissionFormBits = ref<number[]>([1])
const folderBrowserDialogRef = ref<InstanceType<typeof NasFolderBrowserDialog>>()
const permissionUserOptions = ref<UserApi.UserVO[]>([])
const permissionDeptList = ref<DeptApi.DeptVO[]>([])
const permissionDeptTree = ref<any[]>([])
const permissionTargetUserIds = ref<number[]>([])
const permissionTargetDeptId = ref<number>()

const permissionFormModel = reactive<NasPermissionSaveReqVO>({
  id: undefined,
  filePath: '/',
  perTargetType: USER_TARGET_TYPE,
  perTargetId: 0,
  perTargetName: '',
  folder: true,
  permissions: 1,
  expireTime: undefined,
  mark: undefined,
  markType: undefined,
  attrs: undefined
})

const dialogTitle = computed(() => {
  if (!currentNas.value) {
    return '文件夹授权'
  }
  return `文件夹授权 - ${currentNas.value.nasName}`
})

const permissionFormTitle = computed(() => (permissionFormMode.value === 'create' ? '新增路径授权' : '编辑路径授权'))

const normalizePath = (value?: string) => {
  if (!value) {
    return ''
  }
  const normalized = value.trim().replace(/\\/g, '/').replace(/\/+$/g, '')
  return normalized === '' ? '' : normalized
}

const normalizeNasFilePath = (value?: string) => {
  const normalized = normalizePath(value)
  return normalized || '/'
}

const validatePermissionTarget = (_rule: any, _value: any, callback: (error?: Error) => void) => {
  if (permissionFormModel.perTargetType === USER_TARGET_TYPE && permissionTargetUserIds.value.length === 0) {
    callback(new Error('请选择至少一个用户'))
    return
  }
  if (permissionFormModel.perTargetType === DEPT_TARGET_TYPE && !permissionTargetDeptId.value) {
    callback(new Error('请选择部门'))
    return
  }
  callback()
}

const validatePermissionBits = (_rule: any, _value: any, callback: (error?: Error) => void) => {
  if (permissionFormBits.value.length === 0) {
    callback(new Error('请至少选择一个权限位'))
    return
  }
  callback()
}

const permissionFormRules = reactive({
  filePath: [{ required: true, message: '请选择文件夹', trigger: 'change' }],
  perTargetType: [{ required: true, message: '对象类型不能为空', trigger: 'change' }],
  perTargetId: [{ validator: validatePermissionTarget, trigger: 'change' }],
  permissions: [{ validator: validatePermissionBits, trigger: 'change' }]
})

const isPermissionUserTarget = computed(() => permissionFormModel.perTargetType === USER_TARGET_TYPE)
const isPermissionDeptTarget = computed(() => permissionFormModel.perTargetType === DEPT_TARGET_TYPE)
const isPermissionEnterpriseTarget = computed(() => permissionFormModel.perTargetType === ENTERPRISE_TARGET_TYPE)

const selectedPermissionUsers = computed(() =>
  permissionUserOptions.value.filter((item) => permissionTargetUserIds.value.includes(item.id))
)

const selectedPermissionDept = computed(() =>
  permissionDeptList.value.find((item) => item.id === permissionTargetDeptId.value)
)

const permissionTargetPreviewText = computed(() => {
  if (isPermissionDeptTarget.value) {
    return selectedPermissionDept.value?.name || '请选择部门'
  }
  if (isPermissionEnterpriseTarget.value) {
    return TARGET_TYPE_LABELS[ENTERPRISE_TARGET_TYPE]
  }
  return selectedPermissionUsers.value.length
    ? selectedPermissionUsers.value.map((item) => item.nickname).join('、')
    : '请选择至少一个用户'
})

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

const permissionBitsValue = computed(() => mergePermissionBits(permissionFormBits.value))

const syncPermissionTargetModel = () => {
  if (permissionFormModel.perTargetType === USER_TARGET_TYPE) {
    const users = selectedPermissionUsers.value
    permissionFormModel.perTargetId = users[0]?.id || 0
    permissionFormModel.perTargetName = users.map((item) => item.nickname || item.username).join('、')
    return
  }
  if (permissionFormModel.perTargetType === DEPT_TARGET_TYPE) {
    permissionFormModel.perTargetId = permissionTargetDeptId.value || 0
    permissionFormModel.perTargetName = selectedPermissionDept.value?.name || ''
    return
  }
  permissionFormModel.perTargetId = ENTERPRISE_TARGET_ID
  permissionFormModel.perTargetName = TARGET_TYPE_LABELS[ENTERPRISE_TARGET_TYPE]
}

const ensurePermissionTargetOptions = async () => {
  const tasks: Promise<void>[] = []

  if (!permissionUserOptions.value.length) {
    tasks.push(
      UserApi.getSimpleUserList().then((data) => {
        permissionUserOptions.value = data
      })
    )
  }

  if (!permissionDeptList.value.length) {
    tasks.push(
      DeptApi.getSimpleDeptList().then((data) => {
        permissionDeptList.value = data
        permissionDeptTree.value = handleTree(data.map((item) => ({ ...item })))
      })
    )
  }

  if (tasks.length) {
    await Promise.all(tasks)
  }
}

const resetPermissionForm = () => {
  permissionFormModel.id = undefined
  permissionFormModel.filePath = '/'
  permissionFormModel.perTargetType = USER_TARGET_TYPE
  permissionFormModel.perTargetId = 0
  permissionFormModel.perTargetName = ''
  permissionFormModel.folder = true
  permissionFormModel.permissions = 1
  permissionFormModel.expireTime = undefined
  permissionFormModel.mark = undefined
  permissionFormModel.markType = undefined
  permissionFormModel.attrs = undefined
  permissionFormBits.value = [1]
  permissionTargetUserIds.value = []
  permissionTargetDeptId.value = undefined
}

const getPermissionList = async () => {
  if (!currentNas.value) {
    return
  }
  permissionLoading.value = true
  try {
    const data = await NasApi.getPermissionList(currentNas.value.nasId, permissionQueryParams)
    permissionList.value = data.list
    permissionTotal.value = data.total
  } finally {
    permissionLoading.value = false
  }
}

const open = async (row: NasVO) => {
  currentNas.value = row
  permissionQueryParams.pageNo = 1
  dialogVisible.value = true
  await getPermissionList()
}

const openPermissionForm = async (mode: FormMode, row?: NasPermissionVO) => {
  await ensurePermissionTargetOptions()
  permissionFormVisible.value = true
  permissionFormMode.value = mode
  resetPermissionForm()
  await nextTick()
  permissionFormRef.value?.clearValidate()

  if (mode === 'update' && row) {
    permissionFormModel.id = row.id
    permissionFormModel.filePath = normalizeNasFilePath(row.filePath)
    permissionFormModel.perTargetType = row.perTargetType
    permissionFormModel.perTargetId = row.perTargetId
    permissionFormModel.perTargetName = row.perTargetName
    permissionFormModel.folder = row.folder ?? true
    permissionFormModel.permissions = row.permissions || 1
    permissionFormModel.expireTime = row.expireTime !== undefined ? String(row.expireTime) : undefined
    permissionFormModel.mark = row.mark
    permissionFormModel.markType = row.markType
    permissionFormModel.attrs = row.attrs
    permissionFormBits.value = PERMISSION_BIT_OPTIONS.filter((item) => ((row.permissions || 0) & item.value) === item.value).map((item) => item.value)

    if (row.perTargetType === USER_TARGET_TYPE) {
      permissionTargetUserIds.value = row.perTargetId ? [row.perTargetId] : []
    } else if (row.perTargetType === DEPT_TARGET_TYPE) {
      permissionTargetDeptId.value = row.perTargetId
    }
  }

  syncPermissionTargetModel()
}

const handleFolderBrowserConfirm = async (path: string) => {
  permissionFormModel.filePath = normalizeNasFilePath(path)
  permissionFormModel.folder = true
  await nextTick()
  permissionFormRef.value?.clearValidate('filePath')
}

const openFileBrowser = async () => {
  if (!currentNas.value) {
    return
  }
  if (!currentNas.value.isMounted) {
    message.warning('请先挂载 NAS 后再选择文件夹')
    return
  }
  await folderBrowserDialogRef.value?.open({
    nasId: currentNas.value.nasId,
    initialPath: normalizeNasFilePath(permissionFormModel.filePath),
    initialFolder: permissionFormModel.folder !== false
  })
}

const buildPermissionPayloads = (): NasPermissionSaveReqVO[] => {
  const basePayload = {
    filePath: normalizeNasFilePath(permissionFormModel.filePath),
    perTargetType: permissionFormModel.perTargetType,
    perType: permissionFormModel.perType,
    folder: permissionFormModel.folder,
    permissions: permissionFormModel.permissions,
    expireTime: permissionFormModel.expireTime,
    mark: permissionFormModel.mark,
    markType: permissionFormModel.markType,
    attrs: permissionFormModel.attrs
  }

  if (permissionFormModel.perTargetType === USER_TARGET_TYPE) {
    return selectedPermissionUsers.value.map((item) => ({
      ...basePayload,
      perTargetId: item.id,
      perTargetName: item.nickname || item.username
    }))
  }

  if (permissionFormModel.perTargetType === DEPT_TARGET_TYPE) {
    return [
      {
        ...basePayload,
        perTargetId: permissionTargetDeptId.value || 0,
        perTargetName: selectedPermissionDept.value?.name || TARGET_TYPE_LABELS[DEPT_TARGET_TYPE]
      }
    ]
  }

  return [
    {
      ...basePayload,
      perTargetId: ENTERPRISE_TARGET_ID,
      perTargetName: TARGET_TYPE_LABELS[ENTERPRISE_TARGET_TYPE]
    }
  ]
}

const submitPermissionForm = async () => {
  if (!currentNas.value) {
    return
  }
  const nasId = currentNas.value.nasId
  syncPermissionTargetModel()
  permissionFormModel.filePath = normalizeNasFilePath(permissionFormModel.filePath)
  permissionFormModel.permissions = permissionBitsValue.value
  await permissionFormRef.value.validate()
  const payloads = buildPermissionPayloads()
  if (!payloads.length) {
    return
  }
  permissionFormSubmitting.value = true
  try {
    if (permissionFormMode.value === 'create') {
      await Promise.all(payloads.map((item) => NasApi.createPermission(nasId, item)))
      permissionQueryParams.pageNo = 1
      message.success(t('common.createSuccess'))
    } else if (permissionFormModel.id) {
      const [firstPayload, ...extraPayloads] = payloads
      await NasApi.updatePermission(nasId, permissionFormModel.id, firstPayload)
      if (extraPayloads.length) {
        await Promise.all(extraPayloads.map((item) => NasApi.createPermission(nasId, item)))
      }
      message.success(t('common.updateSuccess'))
    }
    permissionFormVisible.value = false
    await getPermissionList()
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
  if (permissionList.value.length === 1 && permissionQueryParams.pageNo > 1) {
    permissionQueryParams.pageNo -= 1
  }
  message.success(t('common.delSuccess'))
  await getPermissionList()
}

watch(
  () => permissionFormModel.perTargetType,
  (value, oldValue) => {
    if (value === USER_TARGET_TYPE) {
      if (oldValue !== undefined && oldValue !== USER_TARGET_TYPE) {
        permissionTargetDeptId.value = undefined
      }
    } else if (value === DEPT_TARGET_TYPE) {
      if (oldValue !== undefined && oldValue !== DEPT_TARGET_TYPE) {
        permissionTargetUserIds.value = []
      }
    } else {
      permissionTargetUserIds.value = []
      permissionTargetDeptId.value = undefined
    }
    syncPermissionTargetModel()
    nextTick(() => permissionFormRef.value?.clearValidate('perTargetId'))
  }
)

watch(
  permissionTargetUserIds,
  () => {
    if (!isPermissionUserTarget.value) {
      return
    }
    syncPermissionTargetModel()
    nextTick(() => permissionFormRef.value?.clearValidate('perTargetId'))
  },
  { deep: true }
)

watch(
  permissionFormBits,
  () => {
    permissionFormModel.permissions = permissionBitsValue.value
    nextTick(() => permissionFormRef.value?.clearValidate('permissions'))
  },
  { deep: true, immediate: true }
)

watch(permissionTargetDeptId, () => {
  if (!isPermissionDeptTarget.value) {
    return
  }
  syncPermissionTargetModel()
  nextTick(() => permissionFormRef.value?.clearValidate('perTargetId'))
})

defineExpose({ open })
</script>

<style scoped>
.permission-path-picker,
.permission-target-picker {
  width: 100%;
}

.permission-path-picker__meta,
.permission-target-preview {
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.permission-path-picker__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.permission-target-preview {
  min-height: 24px;
}
</style>
