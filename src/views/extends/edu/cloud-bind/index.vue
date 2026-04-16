<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="用户名称" prop="username">
        <el-input
          v-model="queryParams.username"
          class="!w-240px"
          clearable
          placeholder="请输入用户名"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="手机号" prop="mobile">
        <el-input
          v-model="queryParams.mobile"
          class="!w-240px"
          clearable
          placeholder="请输入手机号"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" class="!w-240px" clearable placeholder="请选择用户状态">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="所属部门" prop="deptId">
        <el-tree-select
          v-model="queryParams.deptId"
          :data="deptTree"
          :props="defaultProps"
          check-strictly
          clearable
          class="!w-240px"
          node-key="id"
          placeholder="请选择所属部门"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-alert
      :closable="false"
      type="info"
      show-icon
      class="mb-12px"
      :title="`当前页共 ${list.length} 个校园后台用户，已绑定 ${boundCount} 个，未绑定 ${list.length - boundCount} 个`"
    />

    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
      <el-table-column label="用户编号" align="center" prop="id" width="90" />
      <el-table-column label="头像" width="80" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.avatar"
            :src="row.avatar"
            fit="cover"
            style="width: 36px; height: 36px; border-radius: 50%"
            :preview-src-list="[row.avatar]"
            preview-teleported
          />
          <span v-else>--</span>
        </template>
      </el-table-column>
      <el-table-column label="用户名" align="center" prop="username" min-width="130">
        <template #default="{ row }">
          <el-button link type="primary" @click="goToOrgStructure(row)">
            {{ row.username }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="用户昵称" align="center" prop="nickname" min-width="130">
        <template #default="{ row }">
          <el-button link type="primary" @click="goToOrgStructure(row)">
            {{ row.nickname || '-' }}
          </el-button>
        </template>
      </el-table-column>
<!--      <el-table-column label="所属部门" align="center" prop="deptName" min-width="160" />-->
      <el-table-column label="手机号" align="center" prop="mobile" width="130" />
      <el-table-column label="用户状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="绑定状态" align="center" min-width="100">
        <template #default="scope">
          <el-tag :type="scope.row.cloudBind?.bindStatus === 1 ? 'success' : 'info'">
            {{ scope.row.cloudBind?.bindStatus === 1 ? '已绑定' : '未绑定' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="云盘用户名" align="center" min-width="150">
        <template #default="scope">
          {{ scope.row.cloudBind?.cloudUserName || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="云盘账号" align="center" min-width="150">
        <template #default="scope">
          {{ scope.row.cloudBind?.cloudAccount || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="云盘部门" align="center" min-width="160">
        <template #default="scope">
          {{ scope.row.cloudBind?.cloudDeptName || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="绑定时间" align="center" min-width="180">
        <template #default="scope">
          {{ formatBindTime(scope.row.cloudBind?.bindTime) }}
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" min-width="180">
        <template #default="scope">
          {{ scope.row.cloudBind?.remark || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button
            v-if="scope.row.cloudBind?.bindStatus !== 1"
            link
            type="primary"
            v-hasPermi="['edu:cloud-bind:update']"
            @click="openBindDialog(scope.row)"
          >
            绑定
          </el-button>
          <el-button
            v-else
            link
            type="danger"
            v-hasPermi="['edu:cloud-bind:update']"
            @click="handleUnbind(scope.row)"
          >
            解绑
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <Pagination
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      :total="total"
      @pagination="getList"
    />
  </ContentWrap>

  <CloudBindDialog ref="bindDialogRef" @success="getList" />
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { formatDate } from '@/utils/formatTime'
import { defaultProps, handleTree } from '@/utils/tree'
import * as DeptApi from '@/api/system/dept'
import * as UserApi from '@/api/system/user'
import * as EduApi from '@/api/extends/edu'
import * as OrgStructureApi from '@/api/extends/orgStructure'
import CloudBindDialog from './CloudBindDialog.vue'

defineOptions({ name: 'EduCloudBind' })

type CampusUserRow = UserApi.UserVO & {
  deptName?: string
  cloudBind?: EduApi.EduCloudBindVO | null
}

const message = useMessage()
const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref<CampusUserRow[]>([])
const deptTree = ref<any[]>([])
const queryFormRef = ref()
const bindDialogRef = ref()

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  username: undefined,
  mobile: undefined,
  status: undefined,
  deptId: undefined as number | undefined
})

const boundCount = computed(
  () => list.value.filter((item) => item.cloudBind?.bindStatus === 1).length
)

const formatBindTime = (value?: string) => {
  return value ? formatDate(new Date(value)) : '-'
}

const getDeptTree = async () => {
  const data = await DeptApi.getSimpleDeptList()
  deptTree.value = handleTree(data)
}

const getList = async () => {
  loading.value = true
  try {
    const data = await UserApi.getUserPage(queryParams)
    const rows = (data.list || []) as CampusUserRow[]
    const bindList = await Promise.all(
      rows.map((row) =>
        EduApi.getCloudBind(row.id).catch(() => null)
      )
    )
    list.value = rows.map((row, index) => ({
      ...row,
      cloudBind: bindList[index]
    }))
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

const openBindDialog = (row: CampusUserRow) => {
  bindDialogRef.value.open(row)
}

const goToOrgStructure = async (row: CampusUserRow) => {
  await router.push({
    path: '/edu-base/extends/org-structure',
    query: {
      username: row.username,
      deptId: String(row.deptId || OrgStructureApi.UNASSIGNED_DEPT_ID)
    }
  })
}

const handleUnbind = async (row: CampusUserRow) => {
  await message.confirm(`确认解绑用户「${row.nickname || row.username}」当前绑定的云盘账号吗？`)
  await EduApi.unbindCloudUser(row.id)
  message.success('解绑成功')
  await getList()
}

onMounted(async () => {
  await Promise.all([getDeptTree(), getList()])
})
</script>
