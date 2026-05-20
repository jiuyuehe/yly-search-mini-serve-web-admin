<template>
  <section class="media-search-panel">
    <div class="media-top">
      <div class="media-input">
        <el-input
          :model-value="keyword"
          size="large"
          clearable
          placeholder="输入描述搜索图片，例如：会议现场、合同截图、设备照片"
          @update:model-value="$emit('update:keyword', $event)"
          @keyup.enter="$emit('search')"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button size="large" type="primary" class="search-btn" @click="$emit('search')">
          <el-icon><Search /></el-icon>
        </el-button>
      </div>

      <div class="media-upload" :class="{ 'has-preview': previewUrl }">
        <div v-if="previewUrl" class="preview-card">
          <img :src="previewUrl" />
          <div class="preview-info">
            <strong>{{ imageFile?.name }}</strong>
            <span>{{ formatSize(imageFile?.size) }}</span>
          </div>
          <el-button class="preview-close" circle size="small" @click="clearFile">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <el-upload v-else drag :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="handleFileChange">
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="upload-title">上传图片搜索</div>
          <div class="upload-hint">优先做人脸搜索，无命中时自动切换相似图片</div>
        </el-upload>
      </div>
    </div>

    <div class="media-options">
      <div class="option-line">
        <span>优先人脸搜索</span>
        <el-switch :model-value="preferFace" @update:model-value="$emit('update:preferFace', Boolean($event))" />
      </div>
      <div class="option-slider">
        <span>相似度 {{ Math.round(threshold * 100) }}%</span>
        <el-slider :model-value="threshold" :min="0.3" :max="0.95" :step="0.01" @update:model-value="$emit('update:threshold', Number($event))" />
      </div>
      <div class="option-count">
        <span>返回数量</span>
        <el-input-number :model-value="topK" :min="1" :max="100" @update:model-value="$emit('update:topK', Number($event || 20))" />
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { Close, Search, UploadFilled } from '@element-plus/icons-vue'

defineProps<{
  keyword: string
  imageFile?: File | null
  previewUrl?: string
  preferFace: boolean
  threshold: number
  topK: number
}>()

const emit = defineEmits<{
  'update:keyword': [value: string]
  'update:imageFile': [value: File | null]
  'update:previewUrl': [value: string]
  'update:preferFace': [value: boolean]
  'update:threshold': [value: number]
  'update:topK': [value: number]
  search: []
}>()

const handleFileChange = (file: any) => {
  emit('update:imageFile', file.raw)
  emit('update:previewUrl', URL.createObjectURL(file.raw))
}

const clearFile = () => {
  emit('update:imageFile', null)
  emit('update:previewUrl', '')
}

const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped lang="scss">
.media-search-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.media-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 394px;
  gap: 30px;
  align-items: stretch;
}

.media-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 58px;
  gap: 0;
  height: 58px;
  overflow: hidden;
  background: rgb(255 255 255 / 76%);
  border: 1px solid rgb(213 226 250 / 92%);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgb(28 72 140 / 8%), inset 0 1px 0 rgb(255 255 255 / 84%);
}

.media-input :deep(.el-input__wrapper) {
  height: 56px;
  padding: 0 18px;
  background: transparent;
  box-shadow: none;
}

.media-input :deep(.el-input__inner) {
  font-size: 15px;
}

.search-btn {
  width: 58px;
  height: 58px;
  border-radius: 0 11px 11px 0;
  box-shadow: none;
}

.media-upload :deep(.el-upload-dragger) {
  height: 118px;
  padding: 18px 12px;
  background: rgb(255 255 255 / 70%);
  border: 1px dashed rgb(153 185 243 / 92%);
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 88%);
}

.upload-icon { font-size: 34px; color: #1f6fff; }
.upload-title { margin-top: 8px; font-weight: 800; color: #172033; }
.upload-hint { margin-top: 4px; color: #64748b; font-size: 12px; }

.preview-card {
  position: relative;
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  height: 118px;
  padding: 10px 44px 10px 10px;
  background: rgb(255 255 255 / 78%);
  border: 1px solid rgb(180 204 244 / 80%);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgb(28 72 140 / 8%);

  img { width: 118px; height: 96px; object-fit: cover; border-radius: 9px; }
  strong, span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  span { margin-top: 4px; color: #64748b; font-size: 12px; }
}

.preview-close {
  position: absolute;
  top: 10px;
  right: 10px;
}

.media-options {
  display: grid;
  grid-template-columns: 180px minmax(260px, 1fr) 210px;
  gap: 22px;
  align-items: center;
  min-height: 54px;
  padding: 10px 16px;
  background: rgb(255 255 255 / 64%);
  border: 1px solid rgb(221 231 249 / 82%);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgb(28 72 140 / 7%);
}

.option-line, .option-slider, .option-count {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #334155;
  font-size: 13px;
}

.option-slider :deep(.el-slider) { flex: 1; }
.option-count { justify-content: flex-end; }
.option-count :deep(.el-input-number) { width: 112px; }

@media (max-width: 900px) {
  .media-top, .media-options { grid-template-columns: 1fr; }
  .media-top { gap: 14px; }
  .option-count { justify-content: flex-start; }
}
</style>
