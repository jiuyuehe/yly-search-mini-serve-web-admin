<template>
  <div class="full-search-page">
    <div class="search-shell">
      <div
        class="search-layout"
        :style="{ gridTemplateColumns: `${filterPanelWidth} minmax(0, 1fr)` }"
      >
        <SearchFilterPanel
          v-model="filters"
          :collapsed="filterCollapsed"
          @reset="resetFilters"
          @toggle-collapse="filterCollapsed = !filterCollapsed"
          @search="handleFilterSearch"
        />

        <main class="search-main">
          <section class="search-card search-head">
            <div class="search-box">
              <el-input
                v-model="filters.keyword"
                size="large"
                placeholder="输入关键词后按回车或点击搜索"
                clearable
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button class="search-btn" size="large" type="primary" @click="handleSearch">
                <el-icon><Search /></el-icon>
              </el-button>
            </div>

            <el-button-group class="aggregation-group">
              <el-button
                v-for="item in aggregationTabs"
                :key="item.value"
                size="small"
                :type="activeAggregation === item.value ? 'primary' : 'default'"
                :plain="activeAggregation !== item.value"
                @click="selectAggregation(item.value)"
              >
                <el-icon><component :is="item.icon" /></el-icon>
                <span class="agg-label">{{ item.label }}</span>
                <span class="agg-count">{{ item.count }}</span>
              </el-button>
            </el-button-group>
          </section>
          <section class="search-card result-card">
            <SearchResultList
              v-model:selected-ids="selectedIds"
              :files="result.fileList"
              :total="currentResultTotal"
              :loading="loading"
              :keyword="filters.keyword"
              :show-score="hasSearchCondition"
              :page="page"
              :page-size="filters.limit || 20"
              :search-time="result.searchTime"
              @basemetas-preview="openBaseMetasPreview"
              @preview="openViewer"
              @download="downloadOne"
              @batch-download="downloadBatch"
              @page-change="changePage"
              @size-change="changeSize"
            />
          </section>
        </main>
      </div>
    </div>

    <SearchFileViewer ref="viewerRef" />
    <PreviewModal
      :open="previewVisible"
      :title="previewTitle"
      :url="previewUrl"
      @close="closePreview"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  Box,
  Document,
  Files,
  FolderOpened,
  Headset,
  Picture,
  Search,
  VideoPlay
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import SearchFileViewer from './SearchFileViewer.vue'
import SearchFilterPanel from './SearchFilterPanel.vue'
import SearchResultList from './SearchResultList.vue'
import {
  batchDownloadBlob,
  downloadFileBlob,
  downloadNasFileBlob,
  getDocumentAggregationStats,
  getBaseMetasPreview,
  getNasFilePermissions,
  getNasFileViewUrl,
  searchDocuments,
  type CommonFile,
  type SearchAggregationStatsResp,
  type SearchParam,
  type SearchResult
} from '@/api/rag/search'
import { getConfigKey } from '@/api/rag-aichat/system'
import { buildBaseMetasPreviewUrl } from '@/utils/basemetasPreview'
import { buildPreviewApiUrl } from '@/utils/previewApiUrl'
import { PreviewModal } from '@/components/PreviewModal'

defineOptions({ name: 'HomeFullSearchPage' })

const defaultFilters = (): SearchParam => ({
  keyword: '',
  searchType: 'keyword',
  searchMode: undefined,
  imageFile: null,
  precisionMode: 1,
  scoreThreshold: undefined,
  docType: '',
  extname: '',
  folder: false,
  hasHistory: false,
  timeDis: '',
  startDate: undefined,
  endDate: undefined,
  fileSize: '',
  minSize: undefined,
  maxSize: undefined,
  createrId: undefined,
  userId: undefined,
  groupId: undefined,
  shareId: undefined,
  includeEnrich: true,
  offset: 0,
  limit: 20,
  fileCategory: 'nas'
})

const filters = reactive<SearchParam>(defaultFilters())
const result = reactive<SearchResult>({ total: 0, fileList: [] })
const aggregations = ref<SearchAggregationStatsResp>({})
const selectedIds = ref<string[]>([])
const loading = ref(false)
const filterCollapsed = ref(false)
const viewerRef = ref<InstanceType<typeof SearchFileViewer>>()
const fileviewBaseUrl = ref('')
const previewVisible = ref(false)
const previewUrl = ref('')
const previewTitle = ref('文件预览')

const activeAggregation = computed(() => filters.docType || '')

const filterPanelWidth = computed(() => (filterCollapsed.value ? '56px' : '300px'))

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

const NAS_PERMISSION = {
  VIEW: 8,
  DOWN: 64,
  VIEW_ONLINE: 512
}

const aggregationTabs = computed(() => {
  const docStats = aggregations.value.docType || []
  const getCount = (keys: string[]) =>
    docStats
      .filter((item) => keys.includes(String(item.key)))
      .reduce((sum, item) => sum + Number(item.count || 0), 0)
  const classifiedCount = docTypeMap
    .filter((item) => item.value !== '' && item.value !== '5')
    .reduce((sum, item) => sum + getCount(item.keys), 0)
  return docTypeMap.map((item) => ({
    ...item,
    count:
      item.value === ''
        ? result.total
        : item.value === '5'
          ? Math.max(result.total - classifiedCount, 0)
          : getCount(item.keys)
  }))
})

const hasAggregationStats = computed(() => (aggregations.value.docType || []).length > 0)

const currentResultTotal = computed(() => {
  if (!hasAggregationStats.value) return result.total
  const activeTab = aggregationTabs.value.find((item) => item.value === activeAggregation.value)
  return activeTab?.count ?? result.total
})

const activeFilterCount = computed(() => {
  const entries: Array<[unknown, boolean]> = [
    [filters.keyword, Boolean(filters.keyword?.trim())],
    [filters.docType, Boolean(filters.docType)],
    [filters.extname, Boolean(filters.extname?.trim())],
    [filters.folder, Boolean(filters.folder)],
    [filters.hasHistory, Boolean(filters.hasHistory)],
    [filters.startDate, Boolean(filters.startDate)],
    [filters.endDate, Boolean(filters.endDate)],
    [filters.minSize, filters.minSize !== undefined],
    [filters.maxSize, filters.maxSize !== undefined]
  ]
  return entries.reduce((count, [, active]) => count + Number(active), 0)
})

const hasSearchCondition = computed(() => activeFilterCount.value > 0)

const buildSearchParams = (): SearchParam => ({
  ...filters,
  fileAiTag: undefined,
  fileSysTag: undefined,
  tag: undefined,
  searchType: 'keyword' as const,
  offset: filters.offset || 0,
  limit: filters.limit || 20,
  fileCategory: 'nas' as const
})

const buildAggregationParams = (): SearchParam => ({
  ...filters,
  docType: '',
  fileAiTag: undefined,
  fileSysTag: undefined,
  tag: undefined,
  searchType: 'keyword' as const,
  offset: 0,
  limit: 0,
  fileCategory: 'nas' as const
})

const handleSearch = async () => {
  loading.value = true
  selectedIds.value = []
  try {
    const [searchRes, aggregationRes] = await Promise.allSettled([
      searchDocuments(buildSearchParams()),
      getDocumentAggregationStats(buildAggregationParams())
    ])

    if (searchRes.status === 'fulfilled') {
      const data = searchRes.value
      Object.assign(result, {
        total: data?.total || 0,
        fileList: data?.fileList || [],
        types: data?.types,
        searchTime: data?.searchTime
      })
    } else {
      throw searchRes.reason
    }

    if (aggregationRes.status === 'fulfilled') {
      aggregations.value = aggregationRes.value || {}
    } else {
      console.error('获取全文搜索聚合统计失败:', aggregationRes.reason)
      aggregations.value = {}
    }
  } finally {
    loading.value = false
  }
}

const handleFilterSearch = () => {
  filters.offset = 0
  void handleSearch()
}

const resetFilters = () => {
  Object.assign(filters, defaultFilters())
  void handleSearch()
}

const selectAggregation = (docType: string) => {
  filters.docType = docType
  filters.offset = 0
  void handleSearch()
}

const changePage = (nextPage: number) => {
  filters.offset = (nextPage - 1) * (filters.limit || 20)
  void handleSearch()
}

const changeSize = (size: number) => {
  filters.limit = size
  filters.offset = 0
  void handleSearch()
}

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

type SearchFileRecord = CommonFile & Record<string, any>

const getStringValue = (source: SearchFileRecord, keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}

const getNestedStringValue = (source: any, keys: string[]) => {
  if (!source) return ''
  if (typeof source === 'string') return source.trim()
  if (typeof source !== 'object') return ''
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}

const getNasId = (file: CommonFile) =>
  getStringValue(file as SearchFileRecord, ['nasId', 'nas_id', 'nasID', 'storageId', 'storage_id'])

const getNasPath = (file: CommonFile) =>
  getStringValue(file as SearchFileRecord, [
    'subPath',
    'filePath',
    'nasFilePath',
    'nas_file_path',
    'path',
    'relativePath',
    'relative_path',
    'fullPath',
    'full_path'
  ])

const getFileDisplayName = (file: CommonFile) => {
  return (
    getStringValue(file as SearchFileRecord, [
      'fileName',
      'name',
      'documentName',
      'document_name'
    ]) ||
    getNasPath(file) ||
    '文件预览'
  )
}

const normalizeFileUrl = (url: string) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return buildPreviewApiUrl(url)
  return url
}

const getDirectPreviewFileUrl = (file: CommonFile) => {
  const url = getStringValue(file as SearchFileRecord, [
    'baseMetasUrl',
    'basemetasUrl',
    'previewUrl',
    'preview_url',
    'viewUrl',
    'view_url',
    'fileUrl',
    'file_url',
    'downloadViewUrl',
    'download_view_url'
  ])
  return normalizeFileUrl(url)
}

const getFileViewResponseUrl = (response: unknown) => {
  const url = getNestedStringValue(response, [
    'sourceUrl',
    'source_url',
    'rawUrl',
    'raw_url',
    'url',
    'fileUrl',
    'file_url',
    'viewUrl',
    'view_url'
  ])
  if (url) return normalizeFileUrl(url)
  const dataUrl = getNestedStringValue((response as any)?.data, [
    'sourceUrl',
    'source_url',
    'rawUrl',
    'raw_url',
    'url',
    'fileUrl',
    'file_url',
    'viewUrl',
    'view_url'
  ])
  return normalizeFileUrl(dataUrl)
}

const hasNasPermission = async (file: CommonFile, bits: number[]) => {
  const nasId = getNasId(file)
  const nasPath = getNasPath(file)
  if (!nasId || !nasPath) return true
  const data = await getNasFilePermissions(nasId, nasPath)
  const permissions = data?.permissions || 0
  return bits.some((bit) => (permissions & bit) === bit)
}

const downloadOne = async (file: CommonFile) => {
  if (file.esId) {
    const blob = await downloadFileBlob(file.esId)
    saveBlob(blob, getFileDisplayName(file) || 'download')
    ElMessage.success('已开始下载')
    return
  }

  const nasId = getNasId(file)
  const nasPath = getNasPath(file)
  if (!nasId || !nasPath) {
    ElMessage.warning('未获取到 NAS 文件地址，无法下载')
    return
  }
  if (!(await hasNasPermission(file, [NAS_PERMISSION.DOWN]))) {
    ElMessage.warning('无下载权限')
    return
  }
  const blob = await downloadNasFileBlob(nasId, nasPath)
  saveBlob(blob, getFileDisplayName(file) || 'download')
  ElMessage.success('已开始下载')
}

const downloadBatch = async () => {
  if (!selectedIds.value.length) return
  const blob = await batchDownloadBlob(selectedIds.value)
  saveBlob(blob, '全文搜索结果.zip')
  ElMessage.success('批量下载已开始')
}

const openBaseMetasPreview = async (file: CommonFile) => {
  if (!(await hasNasPermission(file, [NAS_PERMISSION.VIEW, NAS_PERMISSION.VIEW_ONLINE]))) {
    ElMessage.warning('无预览或在线查看权限')
    return
  }

  let responseFileName = ''
  let fileUrl = ''
  if (file.esId) {
    try {
      const response = await getBaseMetasPreview(file.esId)
      fileUrl = getFileViewResponseUrl(response)
      responseFileName = getNestedStringValue(response, ['fileName', 'file_name'])
    } catch (error) {
      console.error('获取 BaseMetas 预览源地址失败:', error)
    }
  }

  if (!fileUrl) {
    fileUrl = getDirectPreviewFileUrl(file)
  }
  const nasPath = getNasPath(file)
  const nasId = getNasId(file)
  if (!fileUrl && nasId && nasPath) {
    const response = await getNasFileViewUrl(nasId, nasPath)
    fileUrl = getFileViewResponseUrl(response)
  }
  if (!fileUrl) {
    ElMessage.warning('未获取到 NAS 在线查看地址，无法进行 BaseMetas 预览')
    return
  }

  const displayName = responseFileName || getFileDisplayName(file)
  const baseMetasUrl = buildBaseMetasPreviewUrl(
    fileviewBaseUrl.value,
    fileUrl,
    displayName,
    displayName
  )
  if (!baseMetasUrl) {
    ElMessage.warning('文件预览服务未配置')
    return
  }

  previewTitle.value = displayName || '文件预览'
  previewUrl.value = baseMetasUrl
  previewVisible.value = true
}

const closePreview = () => {
  previewVisible.value = false
}

const loadPreviewServiceConfig = async () => {
  try {
    const data = await getConfigKey('ragflow_basemetas')
    fileviewBaseUrl.value = String(data || '').trim()
  } catch (error) {
    console.error('获取 BaseMetas 预览服务配置失败:', error)
    fileviewBaseUrl.value = ''
  }
}

const openViewer = async (file: CommonFile) => {
  if (
    !file.folder &&
    !(await hasNasPermission(file, [NAS_PERMISSION.VIEW, NAS_PERMISSION.VIEW_ONLINE]))
  ) {
    ElMessage.warning('无预览或在线查看权限')
    return
  }
  viewerRef.value?.open(file)
}

onMounted(() => {
  void handleSearch()
  void loadPreviewServiceConfig()
})
</script>

<style scoped lang="scss">
.full-search-page {
  width: 100%;
  min-height: calc(100vh - 84px);
  margin: 0;
  overflow: hidden;
}

.search-shell {
  width: 100%;
  height: calc(100vh - 84px);
  min-height: 0;
  padding: 0;
  margin: 0;
}

.search-hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 5px;
  padding: 22px 24px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  box-shadow: var(--app-shadow-xs);
  backdrop-filter: blur(10px);
}

.hero-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.hero-kicker,
.search-label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.08em;
  color: var(--el-color-primary);
  text-transform: uppercase;
}

.hero-copy h1,
.search-head h2,
.aggregation-head h3 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.hero-copy h1 {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.hero-desc {
  max-width: 760px;
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--el-text-color-secondary);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(110px, 1fr));
  gap: 12px;
  align-self: center;
  min-width: 360px;
}

.hero-stat {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 18px;

  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  strong {
    font-size: 18px;
    font-weight: 700;
    color: var(--el-text-color-primary);
  }
}

.search-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 0;
  height: 100%;
  align-items: stretch;
}

.search-main {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  gap: 0;
}

.search-card {
  padding: 0 10px;
  background: var(--el-bg-color);
  backdrop-filter: blur(8px);
}

.search-head {
  display: grid;
  gap: 14px;
}

.search-head-top,
.aggregation-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.search-head h2 {
  font-size: 18px;
  font-weight: 600;
}

.search-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px;
  gap: 8px;
  align-items: center;
}

.search-box :deep(.el-button) {
  min-width: 52px;
  padding: 0;
}

.search-btn {
  width: 52px;
  min-width: 52px;
  padding: 0;
}

.search-meta {
  display: grid;
  justify-items: end;
  gap: 6px;
  white-space: nowrap;

  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  strong {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.aggregation-card {
  display: grid;
  gap: 14px;
}

.aggregation-head h3 {
  font-size: 16px;
  font-weight: 600;
}

.aggregation-note {
  padding: 6px 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 999px;
}

.aggregation-group {
  width: fit-content;
}

.aggregation-group :deep(.el-button) {
  gap: 4px;
  padding: 0 10px;
}

.agg-label {
  margin-right: 3px;
  font-size: 13px;
}

.agg-count {
  min-width: 20px;
  padding: 0 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  text-align: center;
  background: var(--el-fill-color-light);
  border-radius: 999px;
}

.aggregation-group :deep(.el-button.is-plain:not(.is-disabled)) .agg-count {
  background: var(--el-fill-color);
}

.aggregation-group :deep(.el-button--primary .agg-count) {
  color: var(--el-color-primary);
  background: var(--el-color-white);
}

.search-main > :deep(.result-list) {
  min-height: 0;
}

.result-card {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.result-card > :deep(.result-list) {
  width: 100%;
}

@media (width <= 980px) {
  .search-shell {
    padding: 16px;
  }

  .search-hero {
    flex-direction: column;
  }

  .hero-stats {
    width: 100%;
    min-width: 0;
  }

  .search-layout {
    grid-template-columns: 1fr !important;
  }

  .search-filter-panel {
    width: 100%;
    height: auto;
    min-width: 0;
  }

  .search-box {
    grid-template-columns: 1fr;
  }

  .search-box :deep(.el-button) {
    width: 100%;
  }

  .search-btn {
    width: 100%;
    min-width: 0;
  }
}
</style>
