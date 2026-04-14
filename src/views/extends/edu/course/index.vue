<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="课程名称" prop="name">
        <el-input v-model="queryParams.name" class="!w-240px" clearable placeholder="请输入课程名称" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="课程编码" prop="code">
        <el-input v-model="queryParams.code" class="!w-240px" clearable placeholder="请输入课程编码" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="适用学段" prop="stage">
        <el-select v-model="queryParams.stage" class="!w-240px" clearable placeholder="请选择适用学段">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_COURSE_STAGE)" :key="dict.value" :label="dict.label" :value="dict.value" />
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
        <el-button type="primary" plain v-hasPermi="['edu:course:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:course:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="课程名称" align="center" prop="name" min-width="150" />
      <el-table-column label="课程编码" align="center" prop="code" min-width="120" />
      <el-table-column label="课程分类" align="center" prop="category" min-width="120" />
      <el-table-column label="适用学段" align="center" prop="stage" width="100">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_COURSE_STAGE" :value="scope.row.stage" />
        </template>
      </el-table-column>
      <el-table-column label="学分" align="center" prop="credit" width="80" />
      <el-table-column label="总课时" align="center" prop="totalHours" width="90" />
      <el-table-column label="周课时" align="center" prop="hoursPerWeek" width="90" />
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:course:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:course:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
  </ContentWrap>

  <CourseForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import CourseForm from './CourseForm.vue'

defineOptions({ name: 'EduCourse' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const total = ref(0)
const list = ref<EduApi.EduCourseVO[]>([])
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduCourseQuery>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  code: undefined,
  category: undefined,
  stage: undefined,
  status: undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await EduApi.getCoursePage(queryParams)
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
    await EduApi.deleteCourse(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportCourse(queryParams)
    download.excel(data, '课程数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  getList()
})
</script>
