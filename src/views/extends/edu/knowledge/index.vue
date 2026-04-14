<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="所属课程" prop="courseId">
        <el-select v-model="queryParams.courseId" class="!w-240px" clearable filterable placeholder="请选择课程">
          <el-option v-for="item in courseOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="知识点名称" prop="name">
        <el-input v-model="queryParams.name" class="!w-240px" clearable placeholder="请输入知识点名称" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="适用学段" prop="stage">
        <el-select v-model="queryParams.stage" class="!w-240px" clearable placeholder="请选择适用学段">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_COURSE_STAGE)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button type="primary" plain v-hasPermi="['edu:knowledge-point:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:knowledge-point:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="treeList" :show-overflow-tooltip="true" :stripe="true" row-key="id" default-expand-all>
      <el-table-column label="知识点名称" align="left" prop="name" min-width="220" />
      <el-table-column label="所属课程" align="center" prop="courseName" min-width="140" />
      <el-table-column label="知识点编码" align="center" prop="code" min-width="120" />
      <el-table-column label="适用学段" align="center" prop="stage" width="100">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_COURSE_STAGE" :value="scope.row.stage" />
        </template>
      </el-table-column>
      <el-table-column label="难度" align="center" prop="difficulty" width="100" />
      <el-table-column label="关键词" align="center" prop="keywords" min-width="180" />
      <el-table-column label="排序号" align="center" prop="sortOrder" width="80" />
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:knowledge-point:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:knowledge-point:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>

  <KnowledgeForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import { handleTree } from '@/utils/tree'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import KnowledgeForm from './KnowledgeForm.vue'

defineOptions({ name: 'EduKnowledge' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const list = ref<EduApi.EduKnowledgePointVO[]>([])
const courseOptions = ref<EduApi.EduCourseVO[]>([])
const treeList = computed(() => handleTree(list.value, 'id', 'parentId'))
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduKnowledgePointQuery>({
  courseId: undefined,
  name: undefined,
  stage: undefined
})

const loadCourses = async () => {
  courseOptions.value = await EduApi.getCourseSimpleList()
}

const getList = async () => {
  loading.value = true
  try {
    list.value = await EduApi.getKnowledgePointList(queryParams)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => getList()

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
    await EduApi.deleteKnowledgePoint(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportKnowledgePoint(queryParams)
    download.excel(data, '知识点数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  await loadCourses()
  await getList()
})
</script>
