<template>
  <section class="media-result">
    <div class="media-toolbar">
      <div>
        <strong>{{ title }}</strong>
        <span v-if="hint">{{ hint }}</span>
      </div>
      <div class="toolbar-meta">
        <span>结果数：{{ items.length }} 条</span>
        <span v-if="searchTime != null">耗时 {{ searchTime }}ms</span>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-empty v-else-if="!items.length" :description="emptyText" />
    <div v-else class="media-grid">
      <article v-for="item in items" :key="item.key" class="media-card">
        <div class="media-thumb">
          <img v-if="item.image" :src="item.image" />
          <el-icon v-else><Picture /></el-icon>
          <el-tag class="hit-tag" size="small" :type="item.hitType === 'face' ? 'success' : item.hitType === 'text' ? 'primary' : 'info'">
            {{ hitLabel(item.hitType) }}
          </el-tag>
        </div>
        <div class="media-body">
          <div class="media-title" :title="item.fileName || item.personName">{{ item.personName || item.fileName || '未命名资料' }}</div>
          <div v-if="item.personName && item.fileName" class="media-subtitle" :title="item.fileName">{{ item.fileName }}</div>
          <div v-else-if="item.filePath" class="media-subtitle" :title="item.filePath">{{ item.filePath }}</div>
          <div class="media-meta" v-if="item.source || item.score != null">
            <span v-if="item.source">{{ item.source }}</span>
            <span v-if="item.score != null" class="score-text">相似度 {{ scoreText(item.score) }}</span>
          </div>
          <div v-if="item.faceImage" class="face-line">
            <img :src="item.faceImage" />
            <span v-if="item.confidence != null">置信度 {{ scoreText(item.confidence) }}</span>
          </div>
        </div>
        <div class="media-actions">
          <el-button link type="primary" @click="$emit('preview', item.raw)">预览</el-button>
          <el-button link type="primary" @click="$emit('download', item.raw)">下载</el-button>
        </div>
      </article>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { Picture } from '@element-plus/icons-vue'

export interface MediaGridItem {
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

defineProps<{
  items: MediaGridItem[]
  loading: boolean
  title: string
  hint: string
  emptyText: string
  searchTime?: number
}>()

defineEmits<{
  preview: [item: any]
  download: [item: any]
}>()

const hitLabel = (type: string) => {
  if (type === 'face') return '人脸命中'
  if (type === 'text') return '文本搜图'
  return '相似图片'
}

const scoreText = (score: number) => {
  if (score <= 1) return `${Math.round(score * 100)}%`
  return score.toFixed(2)
}
</script>

<style scoped lang="scss">
.media-result {
  max-width: 1240px;
  margin: 18px auto 0;
}

.media-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding: 2px 2px 12px;
  background: transparent;
  border: 0;
  border-radius: 0;

  strong { color: #172033; font-size: 18px; }
  span { margin-left: 10px; color: #64748b; font-size: 13px; }
}

.toolbar-meta {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 8px 12px;
  background: rgb(255 255 255 / 64%);
  border: 1px solid rgb(221 231 249 / 82%);
  border-radius: 10px;

  span { margin-left: 0; color: #43536f; }
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(216px, 1fr));
  gap: 16px;
}

.media-card {
  overflow: hidden;
  background: rgb(255 255 255 / 78%);
  border: 1px solid rgb(217 228 246 / 88%);
  border-radius: 8px;
  box-shadow: 0 12px 28px rgb(31 70 132 / 8%);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.media-card:hover {
  box-shadow: 0 18px 38px rgb(31 70 132 / 14%);
  transform: translateY(-2px);
}

.media-thumb {
  position: relative;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef4ff;

  img { width: 100%; height: 100%; object-fit: cover; }
  .el-icon { font-size: 42px; color: #8aa1c5; }
}

.hit-tag { position: absolute; top: 8px; left: 8px; }
.media-body { padding: 10px 12px 8px; }
.media-title { font-weight: 800; color: #172033; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-subtitle { margin-top: 6px; min-height: 18px; color: #64748b; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-meta { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; color: #475569; font-size: 12px; }
.score-text { color: #1263ea; font-weight: 800; }
.face-line { display: flex; align-items: center; gap: 8px; margin-top: 10px; color: #475569; font-size: 12px; }
.face-line img { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; }
.media-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px 8px;
}

@media (max-width: 760px) {
  .media-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .toolbar-meta {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
