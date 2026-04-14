<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="学号" prop="studentNo">
        <el-input v-model="queryParams.studentNo" class="!w-240px" clearable placeholder="请输入学号" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="学生姓名" prop="nickname">
        <el-input v-model="queryParams.nickname" class="!w-240px" clearable placeholder="请输入学生姓名" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="手机号" prop="mobile">
        <el-input v-model="queryParams.mobile" class="!w-240px" clearable placeholder="请输入手机号" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="所属班级" prop="classDeptId">
        <DeptExtTreeSelect v-model="queryParams.classDeptId" :biz-types="['class']" placeholder="请选择班级" class="!w-240px" />
      </el-form-item>
      <el-form-item label="学籍状态" prop="studentStatus">
        <el-select v-model="queryParams.studentStatus" class="!w-240px" clearable placeholder="请选择学籍状态">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_STUDENT_STATUS)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button type="primary" plain v-hasPermi="['edu:student:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:student:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="学生姓名" align="center" prop="nickname" min-width="120" />
      <el-table-column label="真实姓名" align="center" prop="name" min-width="120" />
      <el-table-column label="手机号" align="center" prop="mobile" width="140" />
      <el-table-column label="学号" align="center" prop="studentNo" width="120" />
      <el-table-column label="所属班级" align="center" prop="classDeptName" min-width="180" />
      <el-table-column label="学籍状态" align="center" prop="studentStatus" width="110">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_STUDENT_STATUS" :value="scope.row.studentStatus" />
        </template>
      </el-table-column>
      <el-table-column label="入学日期" align="center" prop="enrollmentDate" width="120" />
      <el-table-column label="监护人" align="center" prop="guardianName" min-width="120" />
      <el-table-column label="监护人手机" align="center" prop="guardianPhone" width="140" />
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:student:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:student:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
  </ContentWrap>

  <StudentForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import StudentForm from './StudentForm.vue'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduStudent' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const total = ref(0)
const list = ref<EduApi.EduStudentVO[]>([])
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduStudentQuery>({
  pageNo: 1,
  pageSize: 10,
  studentNo: undefined,
  nickname: undefined,
  mobile: undefined,
  classDeptId: undefined,
  studentStatus: undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await EduApi.getStudentPage(queryParams)
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
    await EduApi.deleteStudent(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportStudent(queryParams)
    download.excel(data, '学生扩展数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  getList()
})
</script>
