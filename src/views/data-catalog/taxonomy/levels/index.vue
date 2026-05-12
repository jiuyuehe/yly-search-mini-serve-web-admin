<template>
  <div class="level-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据目录划分 / <span>定义二级主题</span></div>
          <div class="page-title">定义二级主题</div>
        </div>
        <div class="actions">
          <el-button @click="loadTree"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
          <el-button type="primary" :disabled="!activeTheme" @click="openDialog('create')" v-hasPermi="['rag:taxonomy:create']">
            <Icon icon="ep:plus" class="mr-5px" />新增二级主题
          </el-button>
        </div>
      </div>
    </ContentWrap>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="7">
        <ContentWrap class="panel">
          <template #header>一级主题</template>
          <el-input v-model="keyword" placeholder="搜索一级主题" clearable>
            <template #prefix><Icon icon="ep:search" /></template>
          </el-input>
          <div v-loading="loading" class="theme-list">
            <div
              v-for="theme in filteredThemes"
              :key="theme.id"
              class="theme-item"
              :class="{ active: theme.id === activeThemeId }"
              @click="selectTheme(theme)"
            >
              <div>
                <b>{{ theme.name }}</b>
                <span>{{ theme.code || '-' }}</span>
              </div>
              <em>{{ formatNumber(theme.tags?.length) }}</em>
            </div>
          </div>
        </ContentWrap>
      </el-col>

      <el-col :xs="24" :lg="17">
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">当前一级主题</div>
            <div class="kpi-value title-value">{{ activeTheme?.name || '-' }}</div>
            <div class="kpi-delta">{{ activeTheme?.status === 1 ? '启用' : '停用' }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">二级主题</div>
            <div class="kpi-value">{{ formatNumber(activeTags.length) }}</div>
            <div class="kpi-delta">可维护</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">内容标签</div>
            <div class="kpi-value">{{ formatNumber(activeContentTagCount) }}</div>
            <div class="kpi-delta">自动聚合</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">关联文件</div>
            <div class="kpi-value">{{ formatNumber(activeFileCount) }}</div>
            <div class="kpi-delta">主题命中</div>
          </div>
        </div>

        <ContentWrap class="panel">
          <template #header>{{ activeTheme?.name || '未选择主题' }} - 二级主题列表</template>
          <el-table v-loading="loading" :data="activeTags" stripe class="dense-table">
            <el-table-column label="二级主题" prop="keyword" min-width="160" show-overflow-tooltip />
            <el-table-column label="权重" width="100">
              <template #default="{ row }">{{ Number(row.weight || 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="同义词" prop="synonyms" min-width="220" show-overflow-tooltip />
            <el-table-column label="内容标签" width="110">
              <template #default="{ row }">{{ formatNumber(row.aiTagCount) }}</template>
            </el-table-column>
            <el-table-column label="关联文件" width="110">
              <template #default="{ row }">{{ formatNumber(row.fileCount) }}</template>
            </el-table-column>
            <el-table-column label="Top 内容标签" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tag v-for="tag in (row.aiTags || []).slice(0, 3)" :key="tag.tagName" size="small" class="mr-5px">
                  {{ tag.tagName }}
                </el-tag>
                <span v-if="!(row.aiTags || []).length">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDialog('update', row)" v-hasPermi="['rag:taxonomy:update']">编辑</el-button>
                <el-button link type="danger" @click="deleteTag(row)" v-hasPermi="['rag:taxonomy:update']">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </ContentWrap>
      </el-col>
    </el-row>

    <Dialog :title="dialogTitle" v-model="dialogVisible" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="一级主题">
          <el-input :model-value="activeTheme?.name || '-'" disabled />
        </el-form-item>
        <el-form-item label="二级主题" prop="keyword">
          <el-input v-model="form.keyword" placeholder="请输入二级主题名称" />
        </el-form-item>
        <el-form-item label="权重">
          <el-input-number v-model="form.weight" :min="0" :max="10" :step="0.1" />
        </el-form-item>
        <el-form-item label="同义词">
          <el-input v-model="form.synonyms" type="textarea" :rows="3" placeholder="多个同义词使用逗号分隔" />
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
import { TagSystemApi, ThemeTagVO } from '@/api/rag/tagsystem'

defineOptions({ name: 'DataCatalogTaxonomyLevels' })

const message = useMessage()
const loading = ref(false)
const submitLoading = ref(false)
const keyword = ref('')
const themes = ref<any[]>([])
const activeThemeId = ref<number | undefined>()
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref()
const form = reactive<ThemeTagVO>({ weight: 1 })
const rules = {
  keyword: [{ required: true, message: '请输入二级主题名称', trigger: 'blur' }]
}

const filteredThemes = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return themes.value
  return themes.value.filter((item) => (item.name || '').toLowerCase().includes(text))
})
const activeTheme = computed(() => themes.value.find((item) => item.id === activeThemeId.value) || themes.value[0])
const activeTags = computed<any[]>(() => activeTheme.value?.tags || [])
const activeContentTagCount = computed(() => activeTags.value.reduce((sum, item) => sum + Number(item.aiTagCount || 0), 0))
const activeFileCount = computed(() => activeTags.value.reduce((sum, item) => sum + Number(item.fileCount || 0), 0))

const loadTree = async () => {
  loading.value = true
  try {
    const data = await TagSystemApi.getTagSystemTree()
    themes.value = data.themes || []
    if (!activeThemeId.value && themes.value.length) {
      activeThemeId.value = themes.value[0].id
    }
  } finally {
    loading.value = false
  }
}

const selectTheme = (theme: any) => {
  activeThemeId.value = theme.id
}

const openDialog = (type: 'create' | 'update', row?: ThemeTagVO) => {
  if (!activeTheme.value) return
  dialogTitle.value = type === 'create' ? '新增二级主题' : '编辑二级主题'
  form.id = row?.id
  form.themeId = activeTheme.value.id
  form.keyword = row?.keyword || ''
  form.weight = row?.weight ?? 1
  form.synonyms = row?.synonyms || ''
  dialogVisible.value = true
}

const submitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !activeTheme.value) return
  submitLoading.value = true
  try {
    form.themeId = activeTheme.value.id
    if (form.id) {
      await TagSystemApi.updateThemeTag(form)
      message.success('二级主题已更新')
    } else {
      await TagSystemApi.createThemeTag(form)
      message.success('二级主题已创建')
    }
    dialogVisible.value = false
    await loadTree()
  } finally {
    submitLoading.value = false
  }
}

const deleteTag = async (row: ThemeTagVO) => {
  await message.delConfirm(`确定删除二级主题「${row.keyword}」吗？`)
  await TagSystemApi.deleteThemeTag(row.id as number)
  message.success('二级主题已删除')
  await loadTree()
}

const formatNumber = (value?: number | string) => Number(value || 0).toLocaleString()

onMounted(loadTree)
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.actions { display: flex; gap: 8px; }
.panel { min-height: 430px; }
.theme-list { margin-top: 12px; display: grid; gap: 6px; max-height: 580px; overflow: auto; }
.theme-item { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; padding: 12px; border-radius: 6px; cursor: pointer; }
.theme-item.active { background: #eaf2ff; color: #1f6fff; }
.theme-item b { display: block; font-weight: 700; }
.theme-item span { display: block; margin-top: 4px; color: #667085; }
.theme-item em { font-style: normal; color: #667085; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
.kpi-card { min-width: 0; padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 28px; font-weight: 800; }
.title-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 22px; }
.kpi-delta { margin-top: 10px; color: #12a666; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid { grid-template-columns: 1fr; } }
</style>
