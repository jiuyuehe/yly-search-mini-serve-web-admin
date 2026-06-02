<template>
  <div class="file-grid">
    <div
      v-for="item in items"
      :key="item.id"
      class="file-card"
      :class="{ selected: selectedSet.has(item.id) }"
      tabindex="0"
      @click="emit('select', item, $event)"
      @dblclick="emit('open', item)"
    >
      <el-checkbox
        :model-value="selectedSet.has(item.id)"
        class="file-card-checkbox"
        @change="emit('toggle', item.id, $event)"
        @click.stop
      />
      <img class="file-icon" :src="iconGetter(item)" :alt="item.type" />
      <div class="file-name" :title="item.name">{{ item.name }}</div>
      <div class="file-meta">{{ typeLabelGetter(item.type) }} · {{ formatSize(item.size) }}</div>
      <div class="file-meta">{{ formatDate(item.updatedAt) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime, formatFileSize, getFileTypeLabel } from './helpers'
import type { FileItem } from './types'

defineOptions({ name: 'RagAiFileGrid' })

defineProps<{
  items: FileItem[]
  selectedSet: Set<string>
  iconGetter: (item: FileItem) => string
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string, checked: boolean | string | number): void
  (e: 'select', item: FileItem, event: MouseEvent): void
  (e: 'open', item: FileItem): void
}>()

const formatSize = formatFileSize
const formatDate = formatDateTime
const typeLabelGetter = getFileTypeLabel
</script>

<style scoped>
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.file-card {
  position: relative;
  display: flex;
  min-height: 190px;
  padding: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  flex-direction: column;
  gap: 6px;
}

.file-card:hover {
  border-color: #6da4ff;
  box-shadow: 0 2px 8px rgb(59 130 246 / 16%);
}

.file-card.selected {
  background: #f5f9ff;
  border-color: #4a93ff;
}

.file-card:focus-visible {
  outline: 2px solid #4a93ff;
  outline-offset: 2px;
}

.file-card-checkbox {
  position: absolute;
  top: 8px;
  right: 8px;
}

.file-icon {
  width: 72px;
  height: 72px;
  margin-top: 18px;
  object-fit: contain;
  align-self: center;
}

.file-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
