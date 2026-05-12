<template>
  <div>
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据目录划分 / <span>分类分级看板</span></div>
          <div class="page-title">分类分级看板</div>
        </div>
        <el-button type="primary" :loading="loading" @click="loadDashboard">
          <Icon icon="ep:refresh" class="mr-5px" />刷新
        </el-button>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div v-for="item in kpis" :key="item.label" class="kpi-card">
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-value">{{ item.value }}</div>
        <div class="kpi-delta">{{ item.delta }}</div>
      </div>
    </div>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="7">
        <ContentWrap class="panel">
          <template #header>主题分类树</template>
          <el-input v-model="keyword" placeholder="搜索主题名称" clearable>
            <template #prefix><Icon icon="ep:search" /></template>
          </el-input>
          <div v-loading="loading" class="tree-list">
            <div
              v-for="item in filteredThemes"
              :key="item.id || item.name"
              class="tree-item"
              :class="{ active: item.id === activeThemeId }"
              @click="selectTheme(item)"
            >
              <Icon icon="ep:folder-opened" />
              <span>{{ item.name }}</span>
              <em>{{ formatNumber(item.fileCount) }}</em>
            </div>
          </div>
        </ContentWrap>
      </el-col>

      <el-col :xs="24" :lg="17">
        <ContentWrap class="panel">
          <template #header>{{ activeTheme?.name || '全部主题' }} - 文件列表</template>
          <div class="filter-bar">
            <el-radio-group v-model="activeTagId" @change="handleSecondLevelChange">
              <el-radio-button :label="undefined">全部二级主题</el-radio-button>
              <el-radio-button v-for="tag in activeThemeTags" :key="tag.id" :label="tag.id">
                {{ tag.keyword }}({{ formatNumber(tag.fileCount) }})
              </el-radio-button>
            </el-radio-group>
          </div>

          <el-table v-loading="filesLoading" :data="files" stripe class="dense-table">
            <el-table-column label="文件名称" prop="fileName" min-width="230" show-overflow-tooltip />
            <el-table-column label="文件类型" min-width="110">
              <template #default="{ row }">
                <el-tag size="small">{{ row.fileCategory || row.fileExt || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="相关度" prop="score" width="100" sortable>
              <template #default="{ row }">
                <span :class="Number(row.score || 0) < 0.82 ? 'warn' : 'ok'">
                  {{ formatScore(row.score) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="更新时间" prop="updateTime" width="170" show-overflow-tooltip />
            <el-table-column label="大小" width="110">
              <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
            </el-table-column>
            <el-table-column label="ES ID" prop="esId" min-width="150" show-overflow-tooltip />
          </el-table>

          <Pagination
            v-model:page="pageNo"
            v-model:limit="pageSize"
            :total="filesTotal"
            @pagination="loadFiles"
          />
        </ContentWrap>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="mt-12px">
      <el-col :xs="24" :lg="8">
        <ContentWrap>
          <template #header>二级主题统计</template>
          <div v-for="item in activeThemeTags" :key="item.id" class="bar-row">
            <span>{{ item.keyword }}</span>
            <el-progress :percentage="calcPercent(item.fileCount, maxSecondLevelFileCount)" />
          </div>
          <el-empty v-if="!activeThemeTags.length" :image-size="72" description="暂无二级主题" />
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="8">
        <ContentWrap>
          <template #header>文件类型分布</template>
          <div v-for="item in fileTypeDistribution" :key="item.name" class="tag-row">
            <span>{{ item.name }}</span><b>{{ item.count }}</b>
          </div>
          <el-empty v-if="!fileTypeDistribution.length" :image-size="72" description="暂无文件" />
        </ContentWrap>
      </el-col>
      <el-col :xs="24" :lg="8">
        <ContentWrap>
          <template #header>内容标签 TopN</template>
          <div v-for="item in topTags" :key="`${item.themeId}-${item.themeTagId}-${item.tagName}`" class="tag-row">
            <span>{{ item.tagName }}</span><b>{{ formatNumber(item.fileCount) }}</b>
          </div>
          <el-empty v-if="!topTags.length" :image-size="72" description="暂无内容标签" />
        </ContentWrap>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { GovernanceApi } from '@/api/rag/governance'
import { TagSystemApi } from '@/api/rag/tagsystem'

defineOptions({ name: 'RagGovernanceTaxonomyDashboard' })

const loading = ref(false)
const filesLoading = ref(false)
const keyword = ref('')
const dashboard = ref<any>({ overview: {}, themes: [], topTags: [] })
const activeThemeId = ref<number | undefined>()
const activeTagId = ref<number | undefined>()
const files = ref<any[]>([])
const filesTotal = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)

const overview = computed(() => dashboard.value.overview || {})
const themes = computed<any[]>(() => dashboard.value.themes || [])
const filteredThemes = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return themes.value
  return themes.value.filter((item) => (item.name || '').toLowerCase().includes(text))
})
const activeTheme = computed(() => themes.value.find((item) => item.id === activeThemeId.value) || themes.value[0])
const activeThemeTags = computed<any[]>(() => activeTheme.value?.tags || [])
const activeSecondLevel = computed(() => activeThemeTags.value.find((item) => item.id === activeTagId.value))
const maxSecondLevelFileCount = computed(() => Math.max(...activeThemeTags.value.map((item) => Number(item.fileCount || 0)), 1))

const kpis = computed(() => [
  { label: '一级主题数', value: formatNumber(overview.value.themeCount), delta: `二级 ${formatNumber(overview.value.secondLevelCount)}` },
  { label: '内容标签数', value: formatNumber(overview.value.contentTagCount), delta: `未归类 ${formatNumber(overview.value.unclassifiedTagCount)}` },
  { label: '已分类文件', value: formatNumber(overview.value.classifiedFileCount), delta: `覆盖率 ${formatPercent(overview.value.coverageRate)}` },
  { label: '未分类文件', value: formatNumber(overview.value.unclassifiedFileCount), delta: '等待治理任务处理' },
  { label: '平均权重', value: formatScore(overview.value.averageWeight), delta: '内容标签综合权重' }
])

const topTags = computed(() => {
  const tags = activeThemeTags.value.flatMap((item) => item.aiTags || [])
  return tags
    .slice()
    .sort((a, b) => Number(b.fileCount || 0) - Number(a.fileCount || 0))
    .slice(0, 8)
})

const fileTypeDistribution = computed(() => {
  const acc = new Map<string, number>()
  files.value.forEach((file) => {
    const key = file.fileCategory || file.formatGroup || file.fileExt || '未知'
    acc.set(key, (acc.get(key) || 0) + 1)
  })
  return Array.from(acc.entries()).map(([name, count]) => ({ name, count }))
})

const loadDashboard = async () => {
  loading.value = true
  try {
    dashboard.value = await GovernanceApi.dashboardTaxonomy()
    if (!activeThemeId.value && themes.value.length) {
      activeThemeId.value = themes.value[0].id
    }
    await loadFiles()
  } finally {
    loading.value = false
  }
}

const loadFiles = async () => {
  const tags = collectQueryTags()
  if (!tags.length) {
    files.value = []
    filesTotal.value = 0
    return
  }
  filesLoading.value = true
  try {
    const data = await TagSystemApi.getFilesByTags({
      tags,
      page: pageNo.value,
      pageSize: pageSize.value,
      matchMode: 'OR',
      weightMode: 'DEFAULT',
      minimumShouldMatch: 1
    })
    files.value = data.list || []
    filesTotal.value = Number(data.total || 0)
  } finally {
    filesLoading.value = false
  }
}

const collectQueryTags = () => {
  const source = activeSecondLevel.value ? [activeSecondLevel.value] : activeThemeTags.value
  const names = source.flatMap((item) => (item.aiTags || []).map((tag) => tag.tagName).filter(Boolean))
  if (names.length) {
    return Array.from(new Set(names)).slice(0, 20)
  }
  return source.map((item) => item.keyword).filter(Boolean)
}

const selectTheme = async (theme: any) => {
  activeThemeId.value = theme.id
  activeTagId.value = undefined
  pageNo.value = 1
  await loadFiles()
}

const handleSecondLevelChange = async () => {
  pageNo.value = 1
  await loadFiles()
}

const formatNumber = (value?: number | string) => Number(value || 0).toLocaleString()
const formatPercent = (value?: number | string) => `${Number(value || 0).toFixed(2)}%`
const formatScore = (value?: number | string) => Number(value || 0).toFixed(2)
const calcPercent = (value?: number | string, max = 1) => Math.round((Number(value || 0) / max) * 100)
const formatSize = (value?: number | string) => {
  const size = Number(value || 0)
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(loadDashboard)
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 28px; font-weight: 800; }
.kpi-delta { margin-top: 10px; color: #12a666; }
.panel { min-height: 430px; }
.filter-bar { margin-bottom: 12px; overflow-x: auto; }
.tree-list { margin-top: 12px; display: grid; gap: 6px; max-height: 488px; overflow: auto; }
.tree-item { display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; align-items: center; padding: 10px; border-radius: 6px; cursor: pointer; }
.tree-item.active { background: #eaf2ff; color: #1f6fff; }
.tree-item em { font-style: normal; color: #667085; }
.dense-table :deep(.el-table__cell) { padding: 8px 0; }
.ok { color: #12a666; font-weight: 700; }
.warn { color: #f04438; font-weight: 700; }
.bar-row { display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center; margin-bottom: 12px; }
.tag-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #edf0f5; }
.tag-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .page-head { align-items: flex-start; flex-direction: column; } .kpi-grid { grid-template-columns: 1fr; } }
</style>
