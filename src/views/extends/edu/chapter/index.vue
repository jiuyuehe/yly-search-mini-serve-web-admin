<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="所属教材" prop="textbookId">
        <el-select v-model="queryParams.textbookId" class="!w-240px" clearable filterable placeholder="请选择教材">
          <el-option v-for="item in textbookOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="章节名称" prop="name">
        <el-input v-model="queryParams.name" class="!w-240px" clearable placeholder="请输入章节名称" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button type="primary" plain v-hasPermi="['edu:chapter:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:chapter:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table v-loading="loading" :data="treeList" :show-overflow-tooltip="true" :stripe="true" row-key="id" default-expand-all>
      <el-table-column label="章节名称" align="left" prop="name" min-width="220" />
      <el-table-column label="所属教材" align="center" prop="textbookName" min-width="160" />
      <el-table-column label="章节编码" align="center" prop="code" min-width="120" />
      <el-table-column label="层级" align="center" prop="levelNo" width="70" />
      <el-table-column label="排序号" align="center" prop="sortOrder" width="80" />
      <el-table-column label="起始页码" align="center" prop="pageStart" width="90" />
      <el-table-column label="结束页码" align="center" prop="pageEnd" width="90" />
      <el-table-column label="备注" align="center" prop="remark" min-width="180" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="140" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:chapter:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:chapter:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>

  <ChapterForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import { handleTree } from '@/utils/tree'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import ChapterForm from './ChapterForm.vue'

defineOptions({ name: 'EduChapter' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const list = ref<EduApi.EduChapterVO[]>([])
const textbookOptions = ref<EduApi.EduTextbookVO[]>([])
const treeList = computed(() => handleTree(list.value, 'id', 'parentId'))
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduChapterQuery>({
  textbookId: undefined,
  name: undefined
})

const loadTextbooks = async () => {
  textbookOptions.value = await EduApi.getTextbookSimpleList()
}

const getList = async () => {
  loading.value = true
  try {
    list.value = await EduApi.getChapterList(queryParams)
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
    await EduApi.deleteChapter(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportChapter(queryParams)
    download.excel(data, '章节数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(async () => {
  await loadTextbooks()
  await getList()
})
</script>
