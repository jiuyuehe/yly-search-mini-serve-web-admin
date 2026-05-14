<template>
  <div class="face-search-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="eyebrow">Face Retrieval Console</div>
          <div class="title">人脸搜索</div>
          <div class="subtitle">支持上传图片以人脸特征检索，也可以按已命名人脸和来源图片名称搜索。</div>
        </div>
      </div>
    </ContentWrap>

    <el-row :gutter="16">
      <el-col :xs="24" :md="9">
        <ContentWrap>
          <template #header>图片检索</template>
          <el-upload
            class="upload-panel"
            drag
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleFileChange"
          >
            <Icon icon="ep:upload-filled" class="upload-icon" />
            <div class="upload-title">上传包含人脸的图片</div>
            <div class="upload-hint">支持 jpg、png、webp，默认检索最清晰的人脸</div>
          </el-upload>
          <div v-if="imagePreview" class="preview">
            <img :src="imagePreview" />
            <span>{{ uploadFile?.name }}</span>
          </div>
          <el-form class="mt-16px" label-width="86px">
            <el-form-item label="姓名过滤">
              <el-input v-model="imageQuery.keyword" clearable placeholder="可选，缩小到指定姓名/文件" />
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
            开始人脸搜索
          </el-button>
        </ContentWrap>
      </el-col>

      <el-col :xs="24" :md="15">
        <ContentWrap>
          <template #header>姓名 / 备注搜索</template>
          <el-form :inline="true" :model="textQuery" class="-mb-15px" label-width="72px">
            <el-form-item label="关键词">
              <el-input v-model="textQuery.keyword" class="!w-280px" clearable placeholder="姓名、别名、文件名" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="searchText">
                <Icon icon="ep:search" class="mr-5px" />
                搜索
              </el-button>
              <el-button @click="resetText">重置</el-button>
            </el-form-item>
          </el-form>
        </ContentWrap>

        <ContentWrap>
          <template #header>搜索结果</template>
          <el-table v-loading="textLoading || imageLoading" :data="resultList" stripe>
            <el-table-column label="人脸" width="92">
              <template #default="{ row }">
                <img v-if="faceImageSrc(row)" class="thumb" :src="faceImageSrc(row)" />
                <div v-else class="thumb thumb-empty">FACE</div>
              </template>
            </el-table-column>
            <el-table-column label="姓名" prop="personName" width="150" />
            <el-table-column label="来源图片" prop="fileName" min-width="220" show-overflow-tooltip />
            <el-table-column label="相似度" width="110">
              <template #default="{ row }">{{ row.similarity == null ? '-' : `${Math.round(row.similarity * 100)}%` }}</template>
            </el-table-column>
            <el-table-column label="模型" prop="modelVersion" min-width="170" show-overflow-tooltip />
            <el-table-column label="来源路径" prop="filePath" min-width="240" show-overflow-tooltip />
          </el-table>
          <Pagination
            v-if="mode === 'text'"
            :total="total"
            v-model:page="textQuery.pageNo"
            v-model:limit="textQuery.pageSize"
            @pagination="searchText"
          />
        </ContentWrap>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { FaceApi } from '@/api/rag/face'

defineOptions({ name: 'DataCatalogFaceSearch' })

const message = useMessage()
const imageLoading = ref(false)
const textLoading = ref(false)
const uploadFile = ref<File>()
const imagePreview = ref('')
const mode = ref<'text' | 'image'>('text')
const resultList = ref<any[]>([])
const total = ref(0)

const imageQuery = reactive({
  keyword: '',
  threshold: 0.62,
  topK: 20
})

const textQuery = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: ''
})

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
  imagePreview.value = URL.createObjectURL(file.raw)
}

const searchImage = async () => {
  if (!uploadFile.value) {
    message.warning('请先上传图片')
    return
  }
  imageLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadFile.value)
    resultList.value = await FaceApi.searchByImage(formData, imageQuery)
    total.value = resultList.value.length
    mode.value = 'image'
  } finally {
    imageLoading.value = false
  }
}

const searchText = async () => {
  textLoading.value = true
  try {
    const data = await FaceApi.search(textQuery)
    resultList.value = data.list || []
    total.value = data.total || 0
    mode.value = 'text'
  } finally {
    textLoading.value = false
  }
}

const resetText = () => {
  textQuery.keyword = ''
  textQuery.pageNo = 1
  searchText()
}

const faceImageSrc = (item: any) => item?.thumbnailUrl || (item?.thumbnail ? `data:image/jpeg;base64,${item.thumbnail}` : '')

onMounted(searchText)
</script>

<style scoped>
.face-search-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; justify-content: space-between; align-items: center; }
.eyebrow { color: #1f6fff; font-weight: 700; }
.title { margin-top: 8px; font-size: 24px; font-weight: 800; color: #101828; }
.subtitle { margin-top: 6px; color: #667085; }
.upload-panel :deep(.el-upload-dragger) { border-radius: 6px; background: #f8fbff; }
.upload-icon { font-size: 42px; color: #1f6fff; }
.upload-title { margin-top: 10px; font-weight: 800; color: #101828; }
.upload-hint { margin-top: 6px; color: #667085; }
.preview { margin-top: 12px; display: grid; grid-template-columns: 86px 1fr; gap: 10px; align-items: center; padding: 10px; border: 1px solid #e6ebf2; border-radius: 6px; }
.preview img { width: 86px; height: 86px; object-fit: cover; border-radius: 6px; }
.thumb, .thumb-empty { width: 64px; height: 64px; border-radius: 6px; object-fit: cover; background: #f3f6fb; display: flex; align-items: center; justify-content: center; color: #8a98ad; font-weight: 700; }
</style>
