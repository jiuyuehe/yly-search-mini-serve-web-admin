<template>
  <div class="full-search-page" :class="`mode-${searchMode}`">
    <SearchFilterPanel v-if="searchMode === 'full'" v-model="filters" @reset="resetFilters" />

    <main class="search-main">
      <section class="search-head">
        <div class="mode-switch" role="tablist">
          <button
            v-for="item in modeOptions"
            :key="item.value"
            type="button"
            class="mode-tab"
            :class="{ active: searchMode === item.value }"
            @click="setSearchMode(item.value)"
          >
            {{ item.label }}
          </button>
        </div>

        <div v-if="searchMode === 'full'" class="search-box">
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

        <MediaSearchPanel
          v-else-if="searchMode === 'media'"
          v-model:keyword="mediaQuery.keyword"
          v-model:image-file="mediaQuery.imageFile"
          v-model:preview-url="mediaQuery.previewUrl"
          v-model:prefer-face="mediaQuery.preferFace"
          v-model:threshold="mediaQuery.threshold"
          v-model:top-k="mediaQuery.topK"
          @search="handleMediaSearch"
        />

        <AiSearchPanel
          v-else
          v-model:question="aiQuestion"
          :analysis="aiAnalysis"
          :loading="aiLoading"
          @search="handleAiSearch"
          @apply="applyAiSearch"
        />
      </section>

      <section v-if="searchMode !== 'media'" class="aggregation-row">
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
        v-if="searchMode !== 'media'"
        v-model:selected-ids="selectedIds"
        :files="result.fileList"
        :total="result.total"
        :loading="loading"
        :keyword="filters.keyword"
        :page="page"
        :page-size="filters.limit || 20"
        :search-time="result.searchTime"
        @kk-preview="openKkPreview"
        @preview="openViewer"
        @download="downloadOne"
        @batch-download="downloadBatch"
        @page-change="changePage"
        @size-change="changeSize"
      />

      <MediaResultGrid
        v-else
        :items="mediaItems"
        :loading="mediaLoading"
        title="多媒体检索结果"
        :hint="mediaHint"
        :empty-text="mediaEmptyText"
        :search-time="mediaSearchTime"
        @preview="openViewer"
        @download="downloadOne"
      />
    </main>

    <SearchFileViewer ref="viewerRef" />
  </div>
</template>

<script lang="ts" setup>
import { Box, Document, Files, FolderOpened, Headset, Picture, Search, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AiSearchPanel from './AiSearchPanel.vue'
import MediaResultGrid from './MediaResultGrid.vue'
import MediaSearchPanel from './MediaSearchPanel.vue'
import SearchFileViewer from './SearchFileViewer.vue'
import SearchFilterPanel from './SearchFilterPanel.vue'
import SearchResultList from './SearchResultList.vue'
import {
  aiSearchDocuments,
  batchDownloadBlob,
  downloadFileBlob,
  getKkPreviewUrl,
  getNasFilePermissions,
  searchDocuments,
  type CommonFile,
  type FilterResult,
  type SearchParam,
  type SearchResult
} from '@/api/rag/search'
import { ImageIndexApi } from '@/api/rag/image-index'

interface MediaGridItem {
  key: string
  hitType: 'face' | 'image' | 'text'
  image?: string
  faceImage?: string
  personName?: string
  fileName?: string
  filePath?: string
  source?: string
  score?: number
  confidence?: number
  raw: any
}

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
  fileCategory: ''
})

const filters = reactive<SearchParam>(defaultFilters())
const result = reactive<SearchResult>({ total: 0, fileList: [] })
const aggregations = ref<Record<string, FilterResult[]>>({})
const selectedIds = ref<string[]>([])
const loading = ref(false)
const currentAgg = ref('')
const viewerRef = ref<InstanceType<typeof SearchFileViewer>>()
const route = useRoute()
const router = useRouter()
const normalizeMode = (mode: unknown): 'full' | 'media' | 'ai' => {
  return mode === 'media' || mode === 'ai' || mode === 'full' ? mode : 'full'
}
const searchMode = ref<'full' | 'media' | 'ai'>(normalizeMode(route.query.mode))
const mediaLoading = ref(false)
const mediaItems = ref<MediaGridItem[]>([])
const mediaHint = ref('支持文字搜图片、图片搜图片和人脸优先搜索')
const mediaSearchTime = ref<number>()
const aiLoading = ref(false)
const aiQuestion = ref('')
const aiAnalysis = ref<any>()

const modeOptions = [
  { label: '全文搜索', value: 'full' as const },
  { label: '多媒体资料', value: 'media' as const },
  { label: 'AI 搜索', value: 'ai' as const }
]

const mediaQuery = reactive({
  keyword: '',
  imageFile: null as File | null,
  previewUrl: '',
  preferFace: true,
  threshold: 0.62,
  topK: 20
})

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
  const getCount = (keys: string[]) => docStats.filter((item) => keys.includes(String(item.key))).reduce((sum, item) => sum + Number(item.count || 0), 0)
  return docTypeMap.map((item) => ({
    ...item,
    count: item.value === '' ? result.total : getCount(item.keys)
  }))
})

const buildQueryParams = () => ({
  ...filters,
  searchType: filters.searchType || 'keyword' as const,
  offset: filters.offset || 0,
  limit: filters.limit || 20
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

const mediaEmptyText = computed(() => {
  if (!mediaQuery.keyword && !mediaQuery.imageFile) return '输入文字或上传图片后开始检索'
  return mediaHint.value.includes('未检测到') ? '未检测到人脸，已为你切换到相似图片搜索，可尝试降低阈值' : '暂无多媒体搜索结果，可尝试降低相似度阈值'
})

const handleMediaSearch = async () => {
  if (!mediaQuery.keyword && !mediaQuery.imageFile) {
    ElMessage.warning('请输入文字或上传图片')
    return
  }
  mediaLoading.value = true
  mediaItems.value = []
  try {
    const formData = new FormData()
    if (mediaQuery.keyword) formData.append('keyword', mediaQuery.keyword)
    if (mediaQuery.imageFile) formData.append('imageFile', mediaQuery.imageFile)
    formData.append('preferFace', String(mediaQuery.preferFace))
    formData.append('similarity', String(mediaQuery.threshold))
    formData.append('limit', String(mediaQuery.topK))
    formData.append('offset', '0')
    const data = await ImageIndexApi.searchMedia(formData)
    const faceRows = data?.faceResults || []
    const imageRows = data?.imageResults?.fileList || []
    mediaSearchTime.value = data?.imageResults?.searchTime
    mediaHint.value = data?.fallbackReason || data?.message || '已完成多媒体检索'
    mediaItems.value = [
      ...faceRows.map(toFaceItem),
      ...imageRows.map((item: any) => toImageItem(item, mediaQuery.imageFile ? 'image' : 'text'))
    ]
  } finally {
    mediaLoading.value = false
  }
}

const handleAiSearch = async () => {
  if (!aiQuestion.value.trim()) {
    ElMessage.warning('请输入问题')
    return
  }
  aiLoading.value = true
  try {
    const data = await aiSearchDocuments({ question: aiQuestion.value })
    aiAnalysis.value = data
    Object.assign(result, {
      total: data?.topResults?.length || 0,
      fileList: data?.topResults || [],
      searchTime: data?.durationMs
    })
    filters.keyword = data?.rewrittenKeywords || aiQuestion.value
  } finally {
    aiLoading.value = false
  }
}

const applyAiSearch = () => {
  filters.keyword = aiAnalysis.value?.rewrittenKeywords || aiQuestion.value
  setSearchMode('full')
  handleSearch()
}

const setSearchMode = (mode: 'full' | 'media' | 'ai') => {
  if (searchMode.value === mode) return
  searchMode.value = mode
  if (mode === 'media') {
    mediaQuery.keyword = filters.keyword || mediaQuery.keyword || ''
    mediaItems.value = []
    mediaHint.value = '支持文字搜图片、图片搜图片和人脸优先搜索'
  }
  if (mode === 'ai') {
    aiQuestion.value = filters.keyword || aiQuestion.value || ''
  }
  router.replace({ query: { ...route.query, mode } })
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

const getNasPath = (file: CommonFile) => file.subPath || file.filePath || ''

const hasNasPermission = async (file: CommonFile, bits: number[]) => {
  if (!file.nasId || !getNasPath(file)) return true
  const data = await getNasFilePermissions(file.nasId, getNasPath(file))
  const permissions = data?.permissions || 0
  return bits.some((bit) => (permissions & bit) === bit)
}

const downloadOne = async (file: CommonFile) => {
  if (!file.esId) return
  if (!(await hasNasPermission(file, [NAS_PERMISSION.DOWN]))) {
    ElMessage.warning('无下载权限')
    return
  }
  const blob = await downloadFileBlob(file.esId)
  saveBlob(blob, file.fileName || 'download')
}

const downloadBatch = async () => {
  if (!selectedIds.value.length) return
  const blob = await batchDownloadBlob(selectedIds.value)
  saveBlob(blob, '全文搜索结果.zip')
  ElMessage.success('批量下载已开始')
}

const openKkPreview = async (file: CommonFile) => {
  if (!file.esId) {
    ElMessage.warning('文件缺少 esId，无法打开 KK 预览')
    return
  }
  if (!(await hasNasPermission(file, [NAS_PERMISSION.VIEW, NAS_PERMISSION.VIEW_ONLINE]))) {
    ElMessage.warning('无预览或在线查看权限')
    return
  }
  const url = await getKkPreviewUrl(file.esId)
  if (!url) {
    ElMessage.warning('未获取到 KK 预览地址')
    return
  }
  window.open(url, '_blank')
}

const openViewer = async (file: CommonFile) => {
  if (!file.folder && !(await hasNasPermission(file, [NAS_PERMISSION.VIEW, NAS_PERMISSION.VIEW_ONLINE]))) {
    ElMessage.warning('无预览或在线查看权限')
    return
  }
  viewerRef.value?.open(file)
}

onMounted(handleSearch)

watch(
  () => route.query.mode,
  (mode) => {
    if (mode === 'full' || mode === 'media' || mode === 'ai') {
      searchMode.value = mode
    }
  }
)

watch(
  () => mediaQuery.previewUrl,
  (_next, prev) => {
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
  }
)

const imageSrc = (item: any) => {
  const raw = item?.imageThumbnail || item?.thumbnail || item?.thumbnailBase64 || item?.coverThumbnail
  if (item?.thumbnailUrl || item?.coverImageUrl || item?.faceThumbnailUrl) return item.thumbnailUrl || item.coverImageUrl || item.faceThumbnailUrl
  return raw ? `data:image/jpeg;base64,${raw}` : ''
}

const toFaceItem = (item: any): MediaGridItem => ({
  key: `face-${item.id || item.sourceEsId || item.fileName}`,
  hitType: 'face',
  image: imageSrc(item),
  faceImage: imageSrc(item),
  personName: item.personName,
  fileName: item.fileName,
  filePath: item.filePath,
  source: item.sourceTaskId,
  score: Number(item.similarity || item.score || 0),
  confidence: item.confidence,
  raw: { ...item, esId: item.sourceEsId || item.esId }
})

const toImageItem = (item: any, hitType: 'image' | 'text'): MediaGridItem => ({
  key: `image-${item.esId || item.fileId || item.fileName}`,
  hitType,
  image: imageSrc(item),
  fileName: item.fileName,
  filePath: item.filePath,
  source: item.matchSource || item.fileCategory,
  score: Number(item.score || 0),
  raw: item
})
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

.mode-media .search-head,
.mode-ai .search-head,
.mode-media .media-result {
  max-width: 1240px;
}

.mode-switch {
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  margin-bottom: 14px;
  background: rgb(255 255 255 / 62%);
  border: 1px solid rgb(221 231 249 / 84%);
  border-radius: 9px;
  box-shadow: 0 12px 28px rgb(39 79 145 / 8%), inset 0 1px 0 rgb(255 255 255 / 84%);
}

.mode-tab {
  min-width: 116px;
  height: 38px;
  padding: 0 18px;
  font-weight: 700;
  color: #24324b;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 7px;
  transition: background 0.16s ease, box-shadow 0.16s ease, color 0.16s ease;
}

.mode-tab.active {
  color: #fff;
  background: linear-gradient(180deg, #2d7bff 0%, #1263ea 100%);
  box-shadow: 0 8px 16px rgb(20 100 235 / 26%);
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
