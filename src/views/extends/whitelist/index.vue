<template>
  <ContentWrap>
    <h2 class="mb-10px">系统白名单管理</h2>
    <p class="text-gray-500 text-13px mb-15px"> 本页为扩展中心的“系统白名单管理”。 </p>
  </ContentWrap>

  <!-- 搜索 -->
  <ContentWrap>
    <el-form
      ref="queryFormRef"
      :inline="true"
      :model="queryParams"
      class="-mb-15px"
      label-width="90px"
    >
      <el-form-item label="白名单类型" prop="whitelistType">
        <el-select
          v-model="queryParams.whitelistType"
          class="!w-200px"
          clearable
          placeholder="请选择类型"
        >
          <el-option
            v-for="item in WHITELIST_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="白名单值" prop="whitelistValue">
        <el-input
          v-model="queryParams.whitelistValue"
          class="!w-240px"
          clearable
          placeholder="支持模糊查询"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="白名单名称" prop="whitelistName">
        <el-input
          v-model="queryParams.whitelistName"
          class="!w-240px"
          clearable
          placeholder="支持模糊查询"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="状态" prop="whitelistStatus">
        <el-select
          v-model="queryParams.whitelistStatus"
          class="!w-200px"
          clearable
          placeholder="请选择状态"
        >
          <el-option :value="0" label="禁用" />
          <el-option :value="1" label="启用" />
        </el-select>
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
        <el-button
          type="primary"
          plain
          v-hasPermi="['extends:whitelist:create']"
          @click="handleCreate"
        >
          <Icon icon="ep:plus" class="mr-5px" />
          新增
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="ID" prop="id" width="80" />
      <el-table-column label="白名单类型" prop="whitelistType" width="120" />
      <el-table-column label="白名单值" prop="whitelistValue" min-width="220" />
      <el-table-column label="白名单名称" prop="whitelistName" min-width="200" />
      <el-table-column label="状态" prop="whitelistStatus" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.whitelistStatus === 1 ? 'success' : 'info'">
            {{ scope.row.whitelistStatus === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="scope">
          <el-button
            link
            type="primary"
            size="small"
            v-hasPermi="['extends:whitelist:update']"
            @click="openForm('update', scope.row)"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            size="small"
            v-hasPermi="['extends:whitelist:delete']"
            @click="handleDelete(scope.row)"
          >
            删除
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

  <!-- 新增 / 编辑白名单弹窗 -->
  <el-dialog
    v-model="formVisible"
    :title="formMode === 'create' ? '新增系统白名单' : '编辑系统白名单'"
    width="540px"
    destroy-on-close
  >
    <el-form ref="formRef" :model="formModel" label-width="110px">
      <el-form-item label="白名单类型" prop="whitelistType">
        <el-select v-model="formModel.whitelistType" class="!w-240px" placeholder="请选择类型">
          <el-option
            v-for="item in WHITELIST_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="白名单值" prop="whitelistValue">
        <el-input
          v-model="formModel.whitelistValue"
          class="!w-240px"
          :placeholder="whitelistValuePlaceholder"
        />
        <p class="whitelist-value-tip">
          <template v-if="formModel.whitelistType === 'DOMAIN'">
            支持域名或容器名称，例如：example.com、sub.company.cn、myservice-prod
          </template>
          <template v-else-if="formModel.whitelistType === 'IP'">
            支持 IPv4 / IPv6，例如：192.168.0.1、2409:8086::1
          </template>
          <template v-else>
            请输入合作方的应用密钥（APP_KEY）
          </template>
        </p>
      </el-form-item>
      <el-form-item label="白名单名称" prop="whitelistName">
        <el-input v-model="formModel.whitelistName" class="!w-240px" placeholder="描述信息，可选" />
      </el-form-item>
      <el-form-item label="状态" prop="whitelistStatus">
        <el-select v-model="formModel.whitelistStatus" class="!w-240px">
          <el-option :value="1" label="启用" />
          <el-option :value="0" label="禁用" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="formSubmitting" @click="submitForm"> 保存 </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { Icon } from '@/components/Icon'
import * as WhitelistApi from '@/api/extends/whitelist'
import { dateFormatter } from '@/utils/formatTime'

defineOptions({ name: 'ExtWhitelist' })

const message = useMessage()

const WHITELIST_TYPE_OPTIONS: Array<{
  label: string
  value: WhitelistApi.WhitelistType
}> = [
  { label: 'APP_KEY', value: 'APP_KEY' },
  { label: 'IP', value: 'IP' },
  { label: 'DOMAIN', value: 'DOMAIN' }
]
const WHITELIST_VALUE_PLACEHOLDER: Record<WhitelistApi.WhitelistType, string> = {
  APP_KEY: '请输入应用密钥',
  IP: '请输入 IP 地址（IPv4 / IPv6）',
  DOMAIN: '请输入域名或容器名称，例如 example.com'
}

const loading = ref(false)
const total = ref(0)
const list = ref<WhitelistApi.WhitelistVO[]>([])

const queryParams = reactive<WhitelistApi.WhitelistPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  whitelistType: undefined,
  whitelistValue: undefined,
  whitelistName: undefined,
  whitelistStatus: undefined
})
const queryFormRef = ref()

// 表单
type FormMode = 'create' | 'update'
const formVisible = ref(false)
const formMode = ref<FormMode>('create')
const formSubmitting = ref(false)
const formRef = ref()
const whitelistValuePlaceholder = computed(
  () => WHITELIST_VALUE_PLACEHOLDER[formModel.whitelistType]
)

const formModel = reactive<WhitelistApi.WhitelistVO>({
  id: 0,
  whitelistType: 'APP_KEY',
  whitelistValue: '',
  whitelistName: '',
  whitelistStatus: 1,
  createTime: '',
  updateTime: ''
})

const getList = async () => {
  loading.value = true
  try {
    const data = await WhitelistApi.getWhitelistPage(queryParams)
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
  handleQuery()
}

const resetFormModel = () => {
  formModel.id = 0
  formModel.whitelistType = 'APP_KEY'
  formModel.whitelistValue = ''
  formModel.whitelistName = ''
  formModel.whitelistStatus = 1
}

const openForm = (mode: FormMode, row?: WhitelistApi.WhitelistVO) => {
  formMode.value = mode
  resetFormModel()
  if (mode === 'update' && row) {
    Object.assign(formModel, row)
  }
  formVisible.value = true
}

const validateWhitelistValue = (): boolean => {
  if (!formModel.whitelistValue) {
    message.warning('白名单值不能为空')
    return false
  }
  if (formModel.whitelistType === 'IP') {
    // 简单 IPv4/IPv6 校验
    const ipv4 = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/
    const ipv6 =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::1)|(::)|([0-9a-fA-F]{1,4}::[0-9a-fA-F]{1,4}))$/
    if (!ipv4.test(formModel.whitelistValue) && !ipv6.test(formModel.whitelistValue)) {
      message.warning('请输入合法的 IP 地址（IPv4 或 IPv6）')
      return false
    }
  } else if (formModel.whitelistType === 'DOMAIN') {
    const domainOrContainerPattern =
      /^(?!-)(?:[A-Za-z0-9-]{1,63}(?<!-))(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/u
    if (!domainOrContainerPattern.test(formModel.whitelistValue)) {
      message.warning('请输入合法的域名或容器名称（字母、数字、短横线，可包含点）')
      return false
    }
  }
  return true
}

const submitForm = async () => {
  if (!validateWhitelistValue()) return
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      await WhitelistApi.createWhitelist({
        whitelistType: formModel.whitelistType,
        whitelistValue: formModel.whitelistValue,
        whitelistName: formModel.whitelistName,
        whitelistStatus: formModel.whitelistStatus,
        id: 0,
        createTime: '',
        updateTime: ''
      } as any)
    } else {
      await WhitelistApi.updateWhitelist(formModel)
    }
    message.success('保存成功')
    formVisible.value = false
    await getList()
  } finally {
    formSubmitting.value = false
  }
}

const handleCreate = () => {
  openForm('create')
}

const handleDelete = async (row: WhitelistApi.WhitelistVO) => {
  try {
    await message.delConfirm()
    await WhitelistApi.deleteWhitelist(row.id)
    message.success('删除成功')
    await getList()
  } catch {
    // ignore
  }
}

onMounted(() => {
  getList()
})
</script>

<style scoped lang="scss">
.whitelist-value-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
</style>
