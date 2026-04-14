<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="所属建筑" prop="buildingId">
        <el-select v-model="queryParams.buildingId" class="!w-240px" clearable filterable placeholder="请选择建筑">
          <el-option v-for="item in buildingOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="教室名称" prop="name">
        <el-input v-model="queryParams.name" class="!w-240px" clearable placeholder="请输入教室名称" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="房间号" prop="roomNo">
        <el-input v-model="queryParams.roomNo" class="!w-240px" clearable placeholder="请输入房间号" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="教室类型" prop="classroomType">
        <el-select v-model="queryParams.classroomType" class="!w-240px" clearable placeholder="请选择教室类型">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_CLASSROOM_TYPE)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" class="!w-240px" clearable placeholder="请选择状态">
          <el-option v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button type="primary" plain v-hasPermi="['edu:classroom:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:classroom:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="所属建筑" align="center" prop="buildingName" min-width="140" />
      <el-table-column label="教室名称" align="center" prop="name" min-width="140" />
      <el-table-column label="房间号" align="center" prop="roomNo" min-width="100" />
      <el-table-column label="教室类型" align="center" prop="classroomType" width="110">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_CLASSROOM_TYPE" :value="scope.row.classroomType" />
        </template>
      </el-table-column>
      <el-table-column label="容量" align="center" prop="capacity" width="80" />
      <el-table-column label="所在楼层" align="center" prop="floorNo" width="90" />
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:classroom:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:classroom:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
  </ContentWrap>

  <ClassroomForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import ClassroomForm from './ClassroomForm.vue'

defineOptions({ name: 'EduClassroom' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const total = ref(0)
const list = ref<EduApi.EduClassroomVO[]>([])
const buildingOptions = ref<EduApi.EduBuildingVO[]>([])
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduClassroomQuery>({
  pageNo: 1,
  pageSize: 10,
  buildingId: undefined,
  name: undefined,
  roomNo: undefined,
  classroomType: undefined,
  status: undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await EduApi.getClassroomPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const loadBuildingOptions = async () => {
  buildingOptions.value = await EduApi.getBuildingSimpleList()
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  handleQuery()
}

const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await EduApi.deleteClassroom(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportClassroom(queryParams)
    download.excel(data, '教室数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  await loadBuildingOptions()
  await getList()
})
</script>
