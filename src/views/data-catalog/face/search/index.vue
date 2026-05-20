<template>
  <div class="face-search-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="eyebrow">Face & Media Retrieval</div>
          <div class="title">人脸搜索</div>
          <div class="subtitle">上传图片时优先按人脸检索；未检测到人脸或无命中时，自动展示相似图片。</div>
        </div>
      </div>
    </ContentWrap>

    <div class="stats-grid">
      <div v-for="item in statCards" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="8">
        <ContentWrap>
          <template #header>检索面板</template>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="图片搜索" name="image">
              <el-upload class="upload-panel" drag :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="handleFileChange">
                <Icon icon="ep:upload-filled" class="upload-icon" />
                <div class="upload-title">上传图片</div>
                <div class="upload-hint">支持 jpg、png、webp，多人脸默认检索最清晰人脸</div>
              </el-upload>
              <div v-if="imagePreview" class="preview">
                <img :src="imagePreview" />
                <span>{{ uploadFile?.name }}</span>
                <el-button link type="danger" @click="clearUpload">清除</el-button>
              </div>
              <el-form class="mt-16px" label-width="92px">
                <el-form-item label="关键词">
                  <el-input v-model="imageQuery.keyword" clearable placeholder="可选，姓名/文件名过滤" />
                </el-form-item>
                <el-form-item label="优先人脸">
                  <el-switch v-model="imageQuery.preferFace" />
                </el-form-item>
                <el-form-item label="相似阈值">
                  <el-slider v-model="imageQuery.threshold" :min="0.3" :max="0.95" :step="0.01" />
                </el-form-item>
                <el-form-item label="返回数量">
                  <el-input-number v-model="imageQuery.topK" :min="1" :max="100" />
                </el-form-item>
              </el-form>
              <el-button type="primary" class="!w-full" :loading="imageLoading" @click="searchImage">
                <Icon icon="ep:camera" class="mr-5px" />
                开始搜索
              </el-button>
            </el-tab-pane>

            <el-tab-pane label="姓名/备注搜索" name="text">
              <el-form label-width="80px">
                <el-form-item label="关键词">
                  <el-input v-model="textQuery.keyword" clearable placeholder="姓名、别名、备注、来源文件" />
                </el-form-item>
                <el-form-item label="已命名">
                  <el-switch v-model="textQuery.namedOnly" />
                </el-form-item>
              </el-form>
              <el-button type="primary" class="!w-full" :loading="textLoading" @click="searchText">
                <Icon icon="ep:search" class="mr-5px" />
                搜索
              </el-button>
            </el-tab-pane>
          </el-tabs>
        </ContentWrap>
      </el-col>

      <el-col :xs="24" :lg="16">
        <ContentWrap>
          <template #header>
            <div class="result-head">
              <span>搜索结果</span>
              <el-tag v-if="fallbackReason" type="warning" effect="plain">{{ fallbackReason }}</el-tag>
            </div>
          </template>
          <el-skeleton v-if="imageLoading || textLoading" :rows="8" animated />
          <el-empty v-else-if="resultList.length === 0" description="暂无结果" />
          <div v-else class="result-grid">
            <article v-for="item in resultList" :key="item.key" class="result-card">
              <div class="thumb-wrap">
                <img v-if="item.image" :src="item.image" />
                <div v-else class="thumb-empty">FACE</div>
                <el-tag class="hit-tag" size="small" :type="item.type === 'face' ? 'success' : 'info'">
                  {{ item.type === 'face' ? '人脸命中' : '相似图片' }}
                </el-tag>
              </div>
              <div class="card-body">
                <div class="card-title">{{ item.personName || item.fileName || '未命名人脸' }}</div>
                <div class="card-meta">{{ item.fileName || '-' }}</div>
                <div class="card-meta">{{ item.filePath || '-' }}</div>
                <div class="score-line">
                  <span>相似度 {{ item.similarity == null ? '-' : `${Math.round(item.similarity * 100)}%` }}</span>
                  <span v-if="item.confidence != null">置信度 {{ Math.round(item.confidence * 100) }}%</span>
                </div>
              </div>
              <div class="card-actions">
                <el-button link type="primary" @click="openSource(item)">查看来源</el-button>
                <el-button v-if="item.type === 'face'" link type="primary" @click="openEdit(item.raw)">编辑姓名</el-button>
              </div>
            </article>
          </div>
          <Pagination v-if="mode === 'text'" :total="total" v-model:page="textQuery.pageNo" v-model:limit="textQuery.pageSize" @pagination="searchText" />
        </ContentWrap>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { FaceApi } from '@/api/rag/face'
import { ImageIndexApi } from '@/api/rag/image-index'

defineOptions({ name: 'DataCatalogFaceSearch' })

const message = useMessage()
const router = useRouter()
const imageLoading = ref(false)
const textLoading = ref(false)
const uploadFile = ref<File>()
const imagePreview = ref('')
const activeTab = ref<'image' | 'text'>('image')
const mode = ref<'text' | 'image'>('text')
const resultList = ref<any[]>([])
const total = ref(0)
const stats = ref<any>({})
const fallbackReason = ref('')

const imageQuery = reactive({
  keyword: '',
  threshold: 0.62,
  topK: 20,
  preferFace: true
})

const textQuery = reactive({
  pageNo: 1,
  pageSize: 12,
  keyword: '',
  namedOnly: false
})

const statCards = computed(() => [
  { label: '人脸主体', value: stats.value.totalPersons || 0 },
  { label: '已命名', value: stats.value.namedPersons || 0 },
  { label: '未命名', value: stats.value.unnamedPersons || 0 },
  { label: '关联图片', value: stats.value.totalInstances || 0 }
])

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
  imagePreview.value = URL.createObjectURL(file.raw)
}

const clearUpload = () => {
  uploadFile.value = undefined
  imagePreview.value = ''
}

const searchImage = async () => {
  if (!uploadFile.value) {
    message.warning('请先上传图片')
    return
  }
  imageLoading.value = true
  fallbackReason.value = ''
  try {
    const formData = new FormData()
    formData.append('imageFile', uploadFile.value)
    if (imageQuery.keyword) formData.append('keyword', imageQuery.keyword)
    formData.append('preferFace', String(imageQuery.preferFace))
    formData.append('similarity', String(imageQuery.threshold))
    formData.append('limit', String(imageQuery.topK))
    const data = await ImageIndexApi.searchMedia(formData)
    fallbackReason.value = data?.fallbackReason || ''
    const faceRows = (data?.faceResults || []).map(toFaceItem)
    const imageRows = (data?.imageResults?.fileList || []).map(toImageItem)
    resultList.value = [...faceRows, ...imageRows]
    total.value = resultList.value.length
    mode.value = 'image'
  } finally {
    imageLoading.value = false
  }
}

const searchText = async () => {
  textLoading.value = true
  fallbackReason.value = ''
  try {
    const data = await FaceApi.search(textQuery)
    resultList.value = (data.list || []).map(toFaceItem)
    total.value = data.total || 0
    mode.value = 'text'
  } finally {
    textLoading.value = false
  }
}

const toFaceItem = (item: any) => ({
  key: `face-${item.id || item.sourceEsId || item.fileName}`,
  type: 'face',
  image: faceImageSrc(item),
  personName: item.personName,
  fileName: item.fileName,
  filePath: item.filePath,
  similarity: Number(item.similarity || item.score || 0),
  confidence: item.confidence,
  raw: item
})

const toImageItem = (item: any) => ({
  key: `image-${item.esId || item.fileName}`,
  type: 'image',
  image: faceImageSrc(item),
  fileName: item.fileName,
  filePath: item.filePath,
  similarity: Number(item.score || 0),
  raw: item
})

const faceImageSrc = (item: any) => {
  const url = item?.thumbnailUrl || item?.coverImageUrl
  const raw = item?.thumbnail || item?.imageThumbnail || item?.coverThumbnail
  return url || (raw ? `data:image/jpeg;base64,${raw}` : '')
}

const openSource = (item: any) => {
  const esId = item.raw?.sourceEsId || item.raw?.esId
  if (!esId) return
  router.push({ path: '/', query: { esId } })
}

const openEdit = (item: any) => {
  router.push({ path: '/data-catalog/face-library', query: { keyword: item.personName || item.fileName } })
}

onMounted(async () => {
  stats.value = await FaceApi.getStats()
  await searchText()
})
</script>

<style scoped>
.face-search-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; justify-content: space-between; align-items: center; }
.eyebrow { color: #1f6fff; font-weight: 700; }
.title { margin-top: 8px; font-size: 24px; font-weight: 800; color: #101828; }
.subtitle { margin-top: 6px; color: #667085; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.stat-card { padding: 16px; background: #fff; border: 1px solid #e6ebf2; border-radius: 8px; }
.stat-card span { color: #667085; }
.stat-card strong { display: block; margin-top: 8px; font-size: 24px; color: #101828; }
.upload-panel :deep(.el-upload-dragger) { border-radius: 6px; background: #f8fbff; }
.upload-icon { font-size: 42px; color: #1f6fff; }
.upload-title { margin-top: 10px; font-weight: 800; color: #101828; }
.upload-hint { margin-top: 6px; color: #667085; }
.preview { margin-top: 12px; display: grid; grid-template-columns: 72px 1fr 42px; gap: 10px; align-items: center; padding: 10px; border: 1px solid #e6ebf2; border-radius: 6px; }
.preview img { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; }
.result-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.result-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.result-card { overflow: hidden; border: 1px solid #e6ebf2; border-radius: 8px; background: #fff; }
.thumb-wrap { position: relative; aspect-ratio: 4 / 3; background: #f3f6fb; }
.thumb-wrap img, .thumb-empty { width: 100%; height: 100%; object-fit: cover; display: flex; align-items: center; justify-content: center; color: #8a98ad; font-weight: 700; }
.hit-tag { position: absolute; top: 10px; left: 10px; }
.card-body { padding: 12px; }
.card-title { font-weight: 800; color: #101828; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-meta { margin-top: 6px; color: #667085; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.score-line { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; color: #475467; font-size: 12px; }
.card-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 0 12px 12px; }
@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
