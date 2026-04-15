<template>
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="组织名称" prop="name">
        <el-input v-model="queryParams.name" class="!w-240px" clearable placeholder="请输入组织名称" @keyup.enter="handleQuery" />
      </el-form-item>
<!--      <el-form-item label="业务类型" prop="bizType">-->
<!--        <el-select v-model="queryParams.bizType" class="!w-240px" clearable placeholder="请选择业务类型">-->
<!--          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_DEPT_BIZ_TYPE)" :key="dict.value" :label="dict.label" :value="dict.value" />-->
<!--        </el-select>-->
<!--      </el-form-item>-->
      <el-form-item label="业务类型" prop="bizType">
        <el-radio-group v-model="queryParams.bizType" text-color="#fff" fill="#6c6cff" @change="handleQuery">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button
            v-for="dict in getStrDictOptions(DICT_TYPE.EDU_DEPT_BIZ_TYPE)"
            :key="dict.value"
            :label="dict.value"
          >
            {{ dict.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" class="!w-240px" clearable placeholder="请选择状态">
          <el-option v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button type="primary" plain v-hasPermi="['edu:dept-ext:create']" @click="openForm('create')">
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button type="success" plain :loading="exportLoading" v-hasPermi="['edu:dept-ext:export']" @click="handleExport">
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <ContentWrap>
    <el-table
      v-loading="loading"
      :data="treeList"
      :show-overflow-tooltip="true"
      :stripe="true"
      row-key="id"
      default-expand-all
    >
      <el-table-column label="组织名称" align="left" prop="name" min-width="220" />
      <el-table-column label="业务类型" align="center" prop="bizType" width="110">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_DEPT_BIZ_TYPE" :value="scope.row.bizType" />
        </template>
      </el-table-column>
      <el-table-column label="层级" align="center" prop="levelNo" width="70" />
      <el-table-column label="年级编码" align="center" prop="gradeCode" width="120" />
      <el-table-column label="学段" align="center" prop="gradeStage" width="100">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_GRADE_STAGE" :value="scope.row.gradeStage" />
        </template>
      </el-table-column>
      <el-table-column label="班级编码" align="center" prop="classCode" width="120" />
      <el-table-column label="人数上限" align="center" prop="studentLimit" width="90" />
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="联系电话" align="center" prop="phone" width="140" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" :formatter="dateFormatter" />
      <el-table-column label="操作" align="center" width="220" fixed="right">
        <template #default="scope">
          <el-button link type="primary" v-hasPermi="['edu:dept-ext:update']" @click="openForm('update', scope.row.id)">
            编辑
          </el-button>
          <el-button
            link
            type="primary"
            v-hasPermi="['edu:dept-ext:create']"
            @click="openForm('create', undefined, { parentId: scope.row.id })"
          >
            新增下级
          </el-button>
          <el-button link type="danger" v-hasPermi="['edu:dept-ext:delete']" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>

  <DeptExtForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import { handleTree } from '@/utils/tree'
import download from '@/utils/download'
import * as EduApi from '@/api/extends/edu'
import DeptExtForm from './DeptExtForm.vue'

defineOptions({ name: 'EduDeptExt' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const exportLoading = ref(false)
const list = ref<EduApi.EduDeptExtVO[]>([])
const treeList = computed(() => handleTree(list.value, 'id', 'parentId'))
const queryFormRef = ref()
const formRef = ref()
const queryParams = reactive<EduApi.EduDeptExtQuery>({
  name: undefined,
  status: undefined,
  bizType: undefined
})

const getList = async () => {
  loading.value = true
  try {
    list.value = await EduApi.getDeptExtList(queryParams)
  } finally {
    loading.value = false
  }
}

const handleQuery = () => getList()

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  handleQuery()
}

const openForm = (type: string, id?: number, defaults?: Partial<EduApi.EduDeptExtVO>) => {
  formRef.value.open(type, id, defaults)
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await EduApi.deleteDeptExt(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {}
}

const handleExport = async () => {
  try {
    await message.exportConfirm()
    exportLoading.value = true
    const data = await EduApi.exportDeptExt(queryParams)
    download.excel(data, '组织扩展数据.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  getList()
})
</script>
