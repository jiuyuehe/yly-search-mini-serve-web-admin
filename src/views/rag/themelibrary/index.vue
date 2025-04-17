<template>
  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="名称" prop="themeName">
        <el-input
          v-model="queryParams.themeName"
          placeholder="请输入名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="状态" prop="platform">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-240px">
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.COMMON_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-220px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['rag:theme-library:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['rag:theme-library:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="序号" align="center" width="60">
        <template #default="scope">
          {{ (queryParams.pageNo - 1) * queryParams.pageSize + scope.$index + 1 }}
        </template>
      </el-table-column>
      <el-table-column label="名称" align="center" prop="themeName" />
      <el-table-column label="描述" align="center" prop="themeDesc" />
      <el-table-column label="知识库" align="center" prop="datasetId">
        <template #default="scope">
          <span>{{ getDatasetName(scope.row.datasetId) }}</span>
        </template>
      </el-table-column>  
      <!-- <el-table-column label="文件数" align="center" prop="fileCount" /> -->
      <el-table-column label="文件数" align="center" prop="fileCount">
        <template #default="scope">
          <el-button type="text" @click="openFilesDialog(scope.row)">{{ scope.row.fileCount }}</el-button>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column
        label="更新时间"
        align="center"
        prop="updateTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" min-width="120px">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['rag:theme-library:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['rag:theme-library:delete']"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 表单弹窗：添加/修改 -->
  <ThemeLibraryForm ref="formRef" @success="getList" />
  <ThemeLibraryFiles ref="filesDialogRef" :themeLibraryId="selectedThemeLibraryId || 0" />
</template>

<script setup lang="ts">
import { ThemeLibraryApi, ThemeLibraryVO } from '@/api/rag/themelibrary'
import { useDataSetsCache } from '@/hooks/web/useDataSetsCache'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import download from '@/utils/download'
import { dateFormatter } from '@/utils/formatTime'
import ThemeLibraryFiles from './ThemeLibraryFiles.vue'
import ThemeLibraryForm from './ThemeLibraryForm.vue'

/** 主题库 列表 */
defineOptions({ name: 'ThemeLibrary' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化
const { getDatasetName } = useDataSetsCache()
const loading = ref(true) // 列表的加载中
const list = ref<ThemeLibraryVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  themeName: undefined,
  themeDesc: undefined,
  datasetId: undefined,
  fileCount: undefined,
  status: undefined,
  createTime: [],
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中
const filesDialogRef = ref()
const selectedThemeLibraryId = ref(null)

// 修改 openFilesDialog 方法
const openFilesDialog = (row) => {
  selectedThemeLibraryId.value = row.id
  filesDialogRef.value.open(row)
}

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ThemeLibraryApi.getThemeLibraryPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await ThemeLibraryApi.deleteThemeLibrary(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await ThemeLibraryApi.exportThemeLibrary(queryParams)
    download.excel(data, '主题库.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>