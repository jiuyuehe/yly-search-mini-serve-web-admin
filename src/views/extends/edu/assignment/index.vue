<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="所属学年" prop="academicYearId">
        <el-select v-model="queryParams.academicYearId" class="!w-240px" clearable filterable placeholder="请选择学年">
          <el-option v-for="item in academicYearOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="所属学期" prop="semesterId">
        <el-select v-model="queryParams.semesterId" class="!w-240px" clearable filterable placeholder="请选择学期">
          <el-option v-for="item in semesterOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="教师" prop="teacherUserId">
        <el-select v-model="queryParams.teacherUserId" class="!w-240px" clearable filterable placeholder="请选择教师">
          <el-option v-for="item in teacherOptions" :key="item.userId" :label="item.nickname || item.username" :value="item.userId" />
        </el-select>
      </el-form-item>
      <el-form-item label="班级" prop="classDeptId">
        <DeptExtTreeSelect v-model="queryParams.classDeptId" :biz-types="['class']" placeholder="请选择班级" class="!w-240px" />
      </el-form-item>
      <el-form-item label="课程" prop="courseId">
        <el-select v-model="queryParams.courseId" class="!w-240px" clearable filterable placeholder="请选择课程">
          <el-option v-for="item in courseOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button type="primary" plain v-hasPermi="['edu:teacher-assignment:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:teacher-assignment:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="所属学年" align="center" prop="academicYearName" min-width="120" />
      <el-table-column label="所属学期" align="center" prop="semesterName" min-width="120" />
      <el-table-column label="任课教师" align="center" prop="teacherName" min-width="120" />
      <el-table-column label="授课班级" align="center" prop="classDeptName" min-width="160" />
      <el-table-column label="授课课程" align="center" prop="courseName" min-width="120" />
      <el-table-column label="班主任" align="center" width="90">
        <template #default="scope">
          <el-tag :type="scope.row.isMainTeacher ? 'success' : 'info'" effect="plain">
            {{ scope.row.isMainTeacher ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:teacher-assignment:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:teacher-assignment:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
  </ContentWrap>

  <AssignmentForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import AssignmentForm from './AssignmentForm.vue'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduAssignment' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const total = ref(0)
const list = ref<EduApi.EduTeacherAssignmentVO[]>([])
const academicYearOptions = ref<EduApi.EduAcademicYearVO[]>([])
const semesterOptions = ref<EduApi.EduSemesterVO[]>([])
const teacherOptions = ref<EduApi.EduTeacherVO[]>([])
const courseOptions = ref<EduApi.EduCourseVO[]>([])
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduTeacherAssignmentQuery>({
  pageNo: 1,
  pageSize: 10,
  academicYearId: undefined,
  semesterId: undefined,
  teacherUserId: undefined,
  classDeptId: undefined,
  courseId: undefined
})

watch(
  () => queryParams.academicYearId,
  async (value) => {
    if (!value) {
      semesterOptions.value = []
      queryParams.semesterId = undefined
      return
    }
    semesterOptions.value = await EduApi.getSemesterSimpleList(value)
    if (!semesterOptions.value.find((item) => item.id === queryParams.semesterId)) {
      queryParams.semesterId = undefined
    }
  }
)

const loadOptions = async () => {
  academicYearOptions.value = await EduApi.getAcademicYearSimpleList()
  teacherOptions.value = await EduApi.getTeacherSimpleList()
  courseOptions.value = await EduApi.getCourseSimpleList()
}

const getList = async () => {
  loading.value = true
  try {
    const data = await EduApi.getTeacherAssignmentPage(queryParams)
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
    await EduApi.deleteTeacherAssignment(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportTeacherAssignment(queryParams)
    download.excel(data, '任课数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  await loadOptions()
  await getList()
})
</script>
