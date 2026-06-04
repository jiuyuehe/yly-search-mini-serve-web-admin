<template>
  <div class="file-toolbar">
    <div class="file-toolbar-title">{{ title }}</div>
    <div class="file-toolbar-actions">
      <el-input
        :model-value="query"
        clearable
        size="small"
        placeholder="请输入文件名称"
        class="file-search"
        aria-label="搜索文件"
        @update:model-value="emit('update:query', $event || '')"
        @keyup.enter="emit('refresh')"
      />
      <el-button size="small" @click="emit('refresh')">刷新</el-button>
      <el-button size="small" type="primary" plain aria-label="上传文件" @click="emit('upload')">
        上传
      </el-button>
      <el-button size="small" plain aria-label="新建文件夹" @click="emit('create-folder')">
        新建文件夹
      </el-button>
      <el-select
        :model-value="sortBy"
        size="small"
        class="w-130px"
        aria-label="排序字段"
        @change="emit('update:sortBy', $event)"
      >
        <el-option v-for="item in sortOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select
        :model-value="sortDirection"
        size="small"
        class="w-110px"
        aria-label="排序方向"
        @change="emit('update:sortDirection', $event)"
      >
        <el-option label="升序" value="asc" />
        <el-option label="降序" value="desc" />
      </el-select>
      <el-select
        :model-value="typeFilter"
        size="small"
        class="w-130px"
        aria-label="文件类型筛选"
        @change="emit('update:typeFilter', $event)"
      >
        <el-option v-for="item in fileTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-segmented
        :model-value="viewMode"
        :options="[
          { label: '网格', value: 'grid' },
          { label: '列表', value: 'list' }
        ]"
        size="small"
        aria-label="视图切换"
        @change="emit('update:viewMode', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FILE_TYPE_OPTIONS, SORT_OPTIONS } from './helpers'
import type { FileType, SortBy, SortDirection, ViewMode } from './types'

defineOptions({ name: 'RagAiFileToolbar' })

defineProps<{
  title: string
  query: string
  viewMode: ViewMode
  sortBy: SortBy
  sortDirection: SortDirection
  typeFilter: FileType | 'all'
}>()

const emit = defineEmits<{
  (e: 'update:query', value: string): void
  (e: 'update:viewMode', value: ViewMode): void
  (e: 'update:sortBy', value: SortBy): void
  (e: 'update:sortDirection', value: SortDirection): void
  (e: 'update:typeFilter', value: FileType | 'all'): void
  (e: 'refresh'): void
  (e: 'upload'): void
  (e: 'create-folder'): void
}>()

const sortOptions = SORT_OPTIONS
const fileTypeOptions = FILE_TYPE_OPTIONS
</script>

<style scoped>
.file-toolbar {
  display: flex;
  padding: 10px 12px;
  background: var(--app-bg-card);
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.file-toolbar-title {
  font-size: 18px;
  font-weight: 600;
}

.file-toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.file-search {
  width: 200px;
}
</style>
