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
        @basemetas-preview="openBaseMetasPreview"
        @preview="openViewer"
        @download="downloadOne"
        @batch-download="downloadBatch"
        @page-change="changePage"
        @size-change="changeSize"
      />
    </main>

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
  getBaseMetasPreview,
  getNasFilePermissions,
  getNasFileViewUrl,
  searchDocuments,
  type CommonFile,
  type FilterResult,
  type SearchParam,
  type SearchResult
} from '@/api/rag/search'
import { getConfigKey } from '@/api/rag-aichat/system'
import { config } from '@/config/axios/config'
import { buildBaseMetasPreviewUrl } from '@/utils/basemetasPreview'
import { PreviewModal } from '@/components/PreviewModal'

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
  fileAiTag: '',
  fileSysTag: '',
  tag: '',
  includeEnrich: true,
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
const fileviewBaseUrl = ref('')
const previewVisible = ref(false)
const previewUrl = ref('')
const previewTitle = ref('文件预览')

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

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const buildApiUrl = (path: string) => {
  const baseUrl = trimTrailingSlash(String(config.base_url || ''))
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (!baseUrl) return normalizedPath
  return `${baseUrl}${normalizedPath}`
}

const getFileDisplayName = (file: CommonFile) => {
  return (
    getStringValue(file as SearchFileRecord, ['fileName', 'name', 'documentName', 'document_name']) ||
    getNasPath(file) ||
    '文件预览'
  )
}

const normalizeFileUrl = (url: string) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return buildApiUrl(url)
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
  const baseMetasUrl = buildBaseMetasPreviewUrl(fileviewBaseUrl.value, fileUrl, displayName, displayName)
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
  display: flex;
  min-height: calc(100vh - 84px);
  margin: -20px;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.search-main {
  height: calc(100vh - 84px);
  min-width: 0;
  padding: 24px 32px;
  overflow: auto;
  flex: 1;
}

.search-head {
  max-width: 1180px;
  margin: 0 auto 16px;
}

.search-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px;
  gap: 12px;
  align-items: center;
}

.search-box :deep(.el-input__wrapper) {
  height: 48px;
  padding: 0 16px;
  border-radius: var(--el-border-radius-base);
}

.search-box :deep(.el-input__inner) {
  font-size: 14px;
}

.search-box :deep(.el-input__prefix) {
  color: var(--el-text-color-secondary);
}

.search-box :deep(.el-button) {
  width: 48px;
  height: 48px;
  border-radius: var(--el-border-radius-base);
}

.aggregation-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 1180px;
  padding: 12px 0;
  margin: 0 auto 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.agg-tab {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.agg-tab:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.agg-tab span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.agg-tab.active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.agg-tab.active span {
  color: var(--el-color-primary);
}

.search-main > :deep(.result-list) {
  max-width: 1180px;
  margin: 0 auto;
}

@media (width <= 980px) {
  .full-search-page {
    flex-direction: column;
  }

  .search-main {
    height: auto;
    padding: 20px;
  }

  :deep(.search-filter-panel) {
    width: 100%;
    height: auto;
    min-width: 0;
  }
}
</style>
