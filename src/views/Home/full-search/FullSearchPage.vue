<template>
  <div class="full-search-page">
    <SearchFilterPanel v-model="filters" @reset="resetFilters" />

    <main class="search-main">
      <section class="search-head">
        <div class="search-box">
          <el-input
            v-model="filters.keyword"
            size="large"
            placeholder="搜索文件名、正文、标签或路径"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button size="large" type="primary" circle @click="handleSearch">
            <el-icon><Search /></el-icon>
          </el-button>
        </div>
      </section>

      <section class="aggregation-row">
        <button
          v-for="item in aggregationTabs"
          :key="item.value"
          type="button"
          class="agg-tab"
          :class="{ active: currentAgg === item.value }"
          @click="selectAggregation(item.value)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          {{ item.label }} <span>{{ item.count }}</span>
        </button>
      </section>

      <SearchResultList
        v-model:selected-ids="selectedIds"
        :files="result.fileList"
        :total="result.total"
        :loading="loading"
        :keyword="filters.keyword"
        :page="page"
        :page-size="filters.limit || 20"
        :search-time="result.searchTime"
        @preview="openViewer"
        @download="downloadOne"
        @batch-download="downloadBatch"
        @page-change="changePage"
        @size-change="changeSize"
      />
    </main>

    <SearchFileViewer ref="viewerRef" />
  </div>
</template>

<script lang="ts" setup>
import { Box, Document, Files, FolderOpened, Headset, Picture, Search, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import SearchFileViewer from './SearchFileViewer.vue'
import SearchFilterPanel from './SearchFilterPanel.vue'
import SearchResultList from './SearchResultList.vue'
import {
  batchDownloadBlob,
  downloadFileBlob,
  searchDocuments,
  type CommonFile,
  type FilterResult,
  type SearchParam,
  type SearchResult
} from '@/api/rag/search'

const defaultFilters = (): SearchParam => ({
  keyword: '',
  searchType: 'keyword',
  precisionMode: 1,
  docType: '',
  extname: '',
  folder: false,
  hasHistory: false,
  timeDis: '',
  fileSize: '',
  offset: 0,
  limit: 20,
  fileCategory: 'nas'
})

const filters = reactive<SearchParam>(defaultFilters())
const result = reactive<SearchResult>({ total: 0, fileList: [] })
const aggregations = ref<Record<string, FilterResult[]>>({})
const selectedIds = ref<string[]>([])
const loading = ref(false)
const currentAgg = ref('')
const viewerRef = ref<InstanceType<typeof SearchFileViewer>>()

const page = computed(() => Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1)

const docTypeMap = [
  { label: '全部', value: '', keys: [], icon: Files },
  { label: '文档', value: '2', keys: ['2', 'doc', 'document'], icon: Document },
  { label: '图片', value: '1', keys: ['1', 'pic', 'image'], icon: Picture },
  { label: '音频', value: '3', keys: ['3', 'audio'], icon: Headset },
  { label: '视频', value: '4', keys: ['4', 'video'], icon: VideoPlay },
  { label: '压缩包', value: '6', keys: ['6', 'zip', 'archive'], icon: Box },
  { label: '其他', value: '5', keys: ['5', 'app', 'other'], icon: FolderOpened }
]

const aggregationTabs = computed(() => {
  const docStats = aggregations.value.docType || []
  const getCount = (keys: string[]) => docStats.filter((item) => keys.includes(String(item.key))).reduce((sum, item) => sum + Number(item.count || 0), 0)
  return docTypeMap.map((item) => ({
    ...item,
    count: item.value === '' ? result.total : getCount(item.keys)
  }))
})

const buildQueryParams = () => ({
  ...filters,
  searchType: 'keyword' as const,
  offset: filters.offset || 0,
  limit: filters.limit || 20,
  fileCategory: 'nas' as const
})

const handleSearch = async () => {
  loading.value = true
  selectedIds.value = []
  try {
    const params = buildQueryParams()
    const searchRes = await searchDocuments(params)
    Object.assign(result, {
      total: searchRes?.total || 0,
      fileList: searchRes?.fileList || [],
      types: searchRes?.types,
      searchTime: searchRes?.searchTime
    })
    aggregations.value = searchRes?.filters || {}
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  Object.assign(filters, defaultFilters())
  currentAgg.value = ''
  handleSearch()
}

const selectAggregation = (docType: string) => {
  currentAgg.value = docType
  filters.docType = docType
  filters.offset = 0
  handleSearch()
}

const changePage = (nextPage: number) => {
  filters.offset = (nextPage - 1) * (filters.limit || 20)
  handleSearch()
}

const changeSize = (size: number) => {
  filters.limit = size
  filters.offset = 0
  handleSearch()
}

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const downloadOne = async (file: CommonFile) => {
  if (!file.esId) return
  const blob = await downloadFileBlob(file.esId)
  saveBlob(blob, file.fileName || 'download')
}

const downloadBatch = async () => {
  if (!selectedIds.value.length) return
  const blob = await batchDownloadBlob(selectedIds.value)
  saveBlob(blob, '全文搜索结果.zip')
  ElMessage.success('批量下载已开始')
}

const openViewer = (file: CommonFile) => {
  viewerRef.value?.open(file)
}

onMounted(handleSearch)
</script>

<style scoped lang="scss">
.full-search-page {
  --glass-bg: rgb(255 255 255 / 50%);
  --glass-bg-strong: rgb(255 255 255 / 68%);
  --glass-border: rgb(255 255 255 / 72%);
  --glass-shadow: 0 24px 70px rgb(15 23 42 / 14%);
  --glass-inner: inset 0 1px 0 rgb(255 255 255 / 78%), inset 0 -1px 0 rgb(148 163 184 / 12%);
  --glass-blue: #2f6fed;
  display: flex;
  position: relative;
  min-height: calc(100vh - 84px);
  margin: -20px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(247 250 255 / 96%) 0%, rgb(231 239 253 / 86%) 38%, rgb(245 247 252 / 94%) 100%),
    linear-gradient(160deg, rgb(255 255 255 / 75%), rgb(199 214 243 / 28%) 48%, rgb(255 255 255 / 55%));
}

.full-search-page::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background:
    linear-gradient(115deg, rgb(255 255 255 / 56%) 0%, transparent 34%, rgb(255 255 255 / 32%) 68%, transparent 100%),
    repeating-linear-gradient(90deg, rgb(255 255 255 / 16%) 0 1px, transparent 1px 120px);
  mask-image: linear-gradient(180deg, rgb(0 0 0 / 80%), rgb(0 0 0 / 10%));
}

.search-main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  height: calc(100vh - 84px);
  padding: 30px 38px;
  overflow: auto;
}

.search-head {
  max-width: 1180px;
  margin: 0 auto 20px;
}

.search-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 50px;
  gap: 14px;
  align-items: center;
}

.search-box :deep(.el-input__wrapper) {
  height: 58px;
  padding: 0 20px;
  background: linear-gradient(180deg, rgb(255 255 255 / 76%), rgb(255 255 255 / 46%));
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow), var(--glass-inner);
  backdrop-filter: blur(26px) saturate(160%);
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.search-box :deep(.el-input__wrapper:hover),
.search-box :deep(.el-input__wrapper.is-focus) {
  background: linear-gradient(180deg, rgb(255 255 255 / 86%), rgb(255 255 255 / 56%));
  border-color: rgb(147 197 253 / 90%);
  box-shadow: 0 26px 78px rgb(37 99 235 / 16%), var(--glass-inner);
  transform: translateY(-1px);
}

.search-box :deep(.el-input__inner) {
  color: #0f172a;
  font-size: 15px;
}

.search-box :deep(.el-input__prefix) {
  color: #2563eb;
}

.search-box :deep(.el-button) {
  width: 50px;
  height: 50px;
  color: #fff;
  background: linear-gradient(145deg, rgb(96 165 250), rgb(37 99 235) 62%, rgb(29 78 216));
  border: 1px solid rgb(255 255 255 / 62%);
  border-radius: 15px;
  box-shadow: 0 18px 34px rgb(37 99 235 / 28%), inset 0 1px 0 rgb(255 255 255 / 45%);
  transition: opacity 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.search-box :deep(.el-button:hover) {
  opacity: 0.92;
  box-shadow: 0 24px 44px rgb(37 99 235 / 36%), inset 0 1px 0 rgb(255 255 255 / 55%);
  transform: translateY(-1px);
}

.aggregation-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 1180px;
  padding: 10px;
  margin: 0 auto 20px;
  background: rgb(255 255 255 / 32%);
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 18px;
  box-shadow: 0 16px 42px rgb(15 23 42 / 8%), inset 0 1px 0 rgb(255 255 255 / 68%);
  backdrop-filter: blur(22px) saturate(150%);
}

.agg-tab {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 38px;
  padding: 0 14px;
  font-weight: 650;
  color: #475569;
  cursor: pointer;
  background: linear-gradient(180deg, rgb(255 255 255 / 56%), rgb(255 255 255 / 28%));
  border: 1px solid rgb(255 255 255 / 56%);
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 58%);
  backdrop-filter: blur(18px) saturate(150%);
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
}

.agg-tab:hover {
  opacity: 0.9;
  background: linear-gradient(180deg, rgb(255 255 255 / 74%), rgb(255 255 255 / 42%));
  transform: translateY(-1px);
}

.agg-tab span {
  color: #8b95a7;
}

.agg-tab.active {
  color: #1d4ed8;
  background: linear-gradient(180deg, rgb(255 255 255 / 86%), rgb(219 234 254 / 62%));
  border-color: rgb(147 197 253 / 88%);
  box-shadow: 0 14px 30px rgb(37 99 235 / 14%), inset 0 1px 0 rgb(255 255 255 / 82%);
}

.search-main > :deep(.result-list) {
  max-width: 1180px;
  margin: 0 auto;
}

@media (max-width: 980px) {
  .full-search-page {
    flex-direction: column;
  }

  .search-main {
    height: auto;
    padding: 20px;
  }

  :deep(.search-filter-panel) {
    width: 100%;
    min-width: 0;
    height: auto;
  }
}
</style>
