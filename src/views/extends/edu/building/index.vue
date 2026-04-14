<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="所属组织" prop="deptId">
        <DeptExtTreeSelect v-model="queryParams.deptId" :biz-types="['school', 'campus']" placeholder="请选择学校或校区" class="!w-240px" />
      </el-form-item>
      <el-form-item label="建筑名称" prop="name">
        <el-input v-model="queryParams.name" class="!w-240px" clearable placeholder="请输入建筑名称" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="建筑编码" prop="code">
        <el-input v-model="queryParams.code" class="!w-240px" clearable placeholder="请输入建筑编码" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="建筑类型" prop="buildingType">
        <el-select v-model="queryParams.buildingType" class="!w-240px" clearable placeholder="请选择建筑类型">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_BUILDING_TYPE)" :key="dict.value" :label="dict.label" :value="dict.value" />
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
        <el-button type="primary" plain v-hasPermi="['edu:building:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:building:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="所属组织" align="center" prop="deptName" min-width="160" />
      <el-table-column label="建筑名称" align="center" prop="name" min-width="150" />
      <el-table-column label="建筑编码" align="center" prop="code" min-width="120" />
      <el-table-column label="建筑类型" align="center" prop="buildingType" width="110">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_BUILDING_TYPE" :value="scope.row.buildingType" />
        </template>
      </el-table-column>
      <el-table-column label="楼层数" align="center" prop="floorCount" width="90" />
      <el-table-column label="地址" align="center" prop="address" min-width="180" />
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:building:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:building:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
  </ContentWrap>

  <BuildingForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import BuildingForm from './BuildingForm.vue'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduBuilding' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const total = ref(0)
const list = ref<EduApi.EduBuildingVO[]>([])
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduBuildingQuery>({
  pageNo: 1,
  pageSize: 10,
  deptId: undefined,
  name: undefined,
  code: undefined,
  buildingType: undefined,
  status: undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await EduApi.getBuildingPage(queryParams)
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

const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await EduApi.deleteBuilding(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportBuilding(queryParams)
    download.excel(data, '建筑数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  getList()
})
</script>
