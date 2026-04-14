<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="章节" prop="chapterId">
        <el-select v-model="queryParams.chapterId" class="!w-240px" clearable filterable placeholder="请选择章节">
          <el-option v-for="item in chapterOptions" :key="item.id" :label="chapterLabel(item)" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="知识点" prop="knowledgePointId">
        <el-select v-model="queryParams.knowledgePointId" class="!w-240px" clearable filterable placeholder="请选择知识点">
          <el-option v-for="item in knowledgeOptions" :key="item.id" :label="knowledgeLabel(item)" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button type="primary" plain v-hasPermi="['edu:chapter-knowledge-point:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:chapter-knowledge-point:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
      <el-table-column label="编号" align="center" prop="id" width="90" />
      <el-table-column label="章节" align="center" prop="chapterName" min-width="180" />
      <el-table-column label="知识点" align="center" prop="knowledgePointName" min-width="180" />
      <el-table-column label="教学要求" align="center" prop="teachingRequirement" min-width="180" />
      <el-table-column label="排序号" align="center" prop="sortOrder" width="80" />
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:chapter-knowledge-point:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:chapter-knowledge-point:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <Pagination v-model:page="queryParams.pageNo" v-model:limit="queryParams.pageSize" :total="total" @pagination="getList" />
  </ContentWrap>

  <ChapterKnowledgePointForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import ChapterKnowledgePointForm from './ChapterKnowledgePointForm.vue'

defineOptions({ name: 'EduChapterKnowledgePoint' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const total = ref(0)
const list = ref<EduApi.EduChapterKnowledgePointVO[]>([])
const chapterOptions = ref<EduApi.EduChapterVO[]>([])
const knowledgeOptions = ref<EduApi.EduKnowledgePointVO[]>([])
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduChapterKnowledgePointQuery>({
  pageNo: 1,
  pageSize: 10,
  chapterId: undefined,
  knowledgePointId: undefined
})

const chapterLabel = (item: EduApi.EduChapterVO) => `${'　'.repeat(Math.max((item.levelNo || 1) - 1, 0))}${item.name}`
const knowledgeLabel = (item: EduApi.EduKnowledgePointVO) => item.name

const loadOptions = async () => {
  chapterOptions.value = await EduApi.getChapterList()
  knowledgeOptions.value = await EduApi.getKnowledgePointList()
}

const getList = async () => {
  loading.value = true
  try {
    const data = await EduApi.getChapterKnowledgePointPage(queryParams)
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
    await EduApi.deleteChapterKnowledgePoint(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportChapterKnowledgePoint(queryParams)
    download.excel(data, '章节知识点关联数据.xls')
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
