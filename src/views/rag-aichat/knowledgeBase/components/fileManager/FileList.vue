<template>
  <el-table
    ref="tableRef"
    :data="items"
    row-key="id"
    class="file-list"
    @selection-change="(rows) => emit('selection-change', rows)"
    @row-dblclick="(row) => emit('open', row)"
  >
    <el-table-column type="selection" width="52" />
    <el-table-column label="名称" min-width="340" show-overflow-tooltip>
      <template #default="{ row }">
        <div class="name-cell" @click="emit('select', row, $event)">
          <img class="name-icon" :src="iconGetter(row)" :alt="row.type" />
          <span>{{ row.name }}</span>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="类型" width="120">
      <template #default="{ row }">{{ typeLabelGetter(row.type) }}</template>
    </el-table-column>
    <el-table-column label="更新时间" width="180">
      <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
    </el-table-column>
    <el-table-column label="大小" width="120">
      <template #default="{ row }">{{ formatSize(row.size) }}</template>
    </el-table-column>
    <el-table-column label="操作" width="240" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" @click="emit('open', row)">打开</el-button>
        <el-button link type="primary" @click="emit('parse', row)">解析</el-button>
        <el-button link @click="emit('download', row)">下载</el-button>
        <el-button link type="danger" @click="emit('delete', row)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { formatDateTime, formatFileSize, getFileTypeLabel } from './helpers'
import type { FileItem } from './types'

defineOptions({ name: 'RagAiFileList' })

const props = defineProps<{
  items: FileItem[]
  selectedIds: string[]
  iconGetter: (item: FileItem) => string
}>()

const emit = defineEmits<{
  (e: 'selection-change', rows: FileItem[]): void
  (e: 'select', item: FileItem, event: MouseEvent): void
  (e: 'open', item: FileItem): void
  (e: 'parse', item: FileItem): void
  (e: 'chunk', item: FileItem): void
  (e: 'download', item: FileItem): void
  (e: 'delete', item: FileItem): void
}>()

const tableRef = ref<any>()
const formatDate = formatDateTime
const formatSize = formatFileSize
const typeLabelGetter = getFileTypeLabel

watch(
  () => [props.items, props.selectedIds],
  async () => {
    await nextTick()
    tableRef.value?.clearSelection?.()
    props.items.forEach((row) => {
      if (props.selectedIds.includes(row.id)) {
        tableRef.value?.toggleRowSelection?.(row, true)
      }
    })
  },
  { deep: true }
)
</script>

<style scoped>
.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name-icon {
  width: 20px;
  height: 20px;
}
</style>
