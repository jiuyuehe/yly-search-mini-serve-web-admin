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

  <NasFormDialog ref="nasFormDialogRef" @success="getList" />
  <NasPermissionDialog ref="nasPermissionDialogRef" />
</template>

<script lang="ts" setup>
import { Icon } from '@/components/Icon'
import { NasApi, type NasPageReqVO, type NasVO } from '@/api/nas/nas'
import { dateFormatter } from '@/utils/formatTime'
import NasFormDialog from './components/NasFormDialog.vue'
import NasPermissionDialog from './components/NasPermissionDialog.vue'
import { ADMIN_NAS_TYPE, type FormMode } from './components/constants'

defineOptions({ name: 'NasAdmin' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const total = ref(0)
const list = ref<NasVO[]>([])
const queryFormRef = ref()
const nasFormDialogRef = ref<InstanceType<typeof NasFormDialog>>()
const nasPermissionDialogRef = ref<InstanceType<typeof NasPermissionDialog>>()

const queryParams = reactive<NasPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  keyword: undefined,
  type: ADMIN_NAS_TYPE
})

const getList = async () => {
  loading.value = true
  try {
    queryParams.type = ADMIN_NAS_TYPE
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
  queryParams.type = ADMIN_NAS_TYPE
  handleQuery()
}

const handleCreate = () => {
  nasFormDialogRef.value?.open('create')
}

const openForm = (mode: FormMode, row?: NasVO) => {
  nasFormDialogRef.value?.open(mode, row)
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
}

const openPermissionDialog = (row: NasVO) => {
  nasPermissionDialogRef.value?.open(row)
}

onMounted(() => {
  getList()
})
</script>
