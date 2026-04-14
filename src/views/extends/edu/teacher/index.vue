<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="教师工号" prop="teacherNo">
        <el-input v-model="queryParams.teacherNo" class="!w-240px" clearable placeholder="请输入教师工号" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="教师姓名" prop="nickname">
        <el-input v-model="queryParams.nickname" class="!w-240px" clearable placeholder="请输入教师姓名" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="手机号" prop="mobile">
        <el-input v-model="queryParams.mobile" class="!w-240px" clearable placeholder="请输入手机号" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="任职状态" prop="employmentStatus">
        <el-select v-model="queryParams.employmentStatus" class="!w-240px" clearable placeholder="请选择任职状态">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_TEACHER_EMPLOYMENT_STATUS)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属组织" prop="deptId">
        <DeptExtTreeSelect v-model="queryParams.deptId" placeholder="请选择组织" class="!w-240px" />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button type="primary" plain v-hasPermi="['edu:teacher:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:teacher:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="用户名" align="center" prop="username" min-width="120" />
      <el-table-column label="教师姓名" align="center" prop="nickname" min-width="120" />
      <el-table-column label="手机号" align="center" prop="mobile" width="140" />
      <el-table-column label="教师工号" align="center" prop="teacherNo" width="120" />
      <el-table-column label="职称" align="center" prop="title" width="120" />
      <el-table-column label="入职日期" align="center" prop="hireDate" width="120" />
      <el-table-column label="任职状态" align="center" prop="employmentStatus" width="110">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_TEACHER_EMPLOYMENT_STATUS" :value="scope.row.employmentStatus" />
        </template>
      </el-table-column>
      <el-table-column label="所属组织" align="center" prop="deptNames" min-width="200" />
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:teacher:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:teacher:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
  </ContentWrap>

  <TeacherForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import TeacherForm from './TeacherForm.vue'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduTeacher' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const total = ref(0)
const list = ref<EduApi.EduTeacherVO[]>([])
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduTeacherQuery>({
  pageNo: 1,
  pageSize: 10,
  teacherNo: undefined,
  nickname: undefined,
  mobile: undefined,
  employmentStatus: undefined,
  deptId: undefined
})

const getList = async () => {
  loading.value = true
  try {
    const data = await EduApi.getTeacherPage(queryParams)
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
    await EduApi.deleteTeacher(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportTeacher(queryParams)
    download.excel(data, '教师扩展数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  getList()
})
</script>
