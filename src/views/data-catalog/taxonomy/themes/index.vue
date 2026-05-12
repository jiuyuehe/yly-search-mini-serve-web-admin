<template>
  <div class="theme-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据目录划分 / <span>定义顶级主题</span></div>
          <div class="page-title">定义顶级主题</div>
        </div>
        <div class="actions">
          <el-button @click="loadThemes"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
          <el-button type="primary" @click="openDialog('create')" v-hasPermi="['rag:taxonomy:create']">
            <Icon icon="ep:plus" class="mr-5px" />新增主题
          </el-button>
        </div>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">一级主题</div>
        <div class="kpi-value">{{ formatNumber(themes.length) }}</div>
        <div class="kpi-delta">启用 {{ formatNumber(enabledCount) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">二级主题</div>
        <div class="kpi-value">{{ formatNumber(secondLevelCount) }}</div>
        <div class="kpi-delta">平均 {{ averageSecondLevel }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">内容标签</div>
        <div class="kpi-value">{{ formatNumber(contentTagCount) }}</div>
        <div class="kpi-delta">来自分类聚合</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">关联文件</div>
        <div class="kpi-value">{{ formatNumber(fileCount) }}</div>
        <div class="kpi-delta">已归属主题</div>
      </div>
    </div>

    <ContentWrap class="panel">
      <template #header>主题列表</template>
      <el-table v-loading="loading" :data="themes" stripe class="dense-table">
        <el-table-column label="主题名称" prop="name" min-width="160" show-overflow-tooltip />
        <el-table-column label="编码" prop="code" min-width="140" show-overflow-tooltip />
        <el-table-column label="描述" prop="description" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="sort" width="90" sortable />
        <el-table-column label="二级主题" width="110">
          <template #default="{ row }">{{ formatNumber(row.tags?.length) }}</template>
        </el-table-column>
        <el-table-column label="内容标签" width="110">
          <template #default="{ row }">{{ formatNumber(row.aiTagCount) }}</template>
        </el-table-column>
        <el-table-column label="关联文件" width="110">
          <template #default="{ row }">{{ formatNumber(row.fileCount) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog('update', row)" v-hasPermi="['rag:taxonomy:update']">编辑</el-button>
            <el-button link type="danger" @click="deleteTheme(row)" v-hasPermi="['rag:taxonomy:update']">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </ContentWrap>

    <Dialog :title="dialogTitle" v-model="dialogVisible" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="主题名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入一级主题名称" />
        </el-form-item>
        <el-form-item label="唯一编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入唯一编码" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">保存</el-button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { TagSystemApi, ThemeVO } from '@/api/rag/tagsystem'

defineOptions({ name: 'DataCatalogTaxonomyThemes' })

const message = useMessage()
const loading = ref(false)
const submitLoading = ref(false)
const themes = ref<any[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref()
const form = reactive<ThemeVO>({ status: 1, sort: 0 })
const rules = {
  name: [{ required: true, message: '请输入主题名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入唯一编码', trigger: 'blur' }]
}

const enabledCount = computed(() => themes.value.filter((item) => item.status === 1).length)
const secondLevelCount = computed(() => themes.value.reduce((sum, item) => sum + (item.tags?.length || 0), 0))
const contentTagCount = computed(() => themes.value.reduce((sum, item) => sum + Number(item.aiTagCount || 0), 0))
const fileCount = computed(() => themes.value.reduce((sum, item) => sum + Number(item.fileCount || 0), 0))
const averageSecondLevel = computed(() => (themes.value.length ? (secondLevelCount.value / themes.value.length).toFixed(1) : '0.0'))

const loadThemes = async () => {
  loading.value = true
  try {
    const data = await TagSystemApi.getTagSystemTree()
    themes.value = data.themes || []
  } finally {
    loading.value = false
  }
}

const openDialog = (type: 'create' | 'update', row?: ThemeVO) => {
  dialogTitle.value = type === 'create' ? '新增一级主题' : '编辑一级主题'
  form.id = row?.id
  form.name = row?.name || ''
  form.code = row?.code || ''
  form.description = row?.description || ''
  form.status = row?.status ?? 1
  form.sort = row?.sort ?? 0
  dialogVisible.value = true
}

const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (form.id) {
      await TagSystemApi.updateTheme(form)
      message.success('主题已更新')
    } else {
      await TagSystemApi.createTheme(form)
      message.success('主题已创建')
    }
    dialogVisible.value = false
    await loadThemes()
  } finally {
    submitLoading.value = false
  }
}

const deleteTheme = async (row: ThemeVO) => {
  await message.delConfirm(`确定删除一级主题「${row.name}」吗？`)
  await TagSystemApi.deleteTheme(row.id as number)
  message.success('主题已删除')
  await loadThemes()
}

const formatNumber = (value?: number | string) => Number(value || 0).toLocaleString()

onMounted(loadThemes)
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.actions { display: flex; gap: 8px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 28px; font-weight: 800; }
.kpi-delta { margin-top: 10px; color: #12a666; }
.panel { min-height: 420px; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid { grid-template-columns: 1fr; } }
</style>
