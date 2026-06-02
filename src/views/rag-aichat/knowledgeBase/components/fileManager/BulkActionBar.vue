<template>
  <div v-if="selectedCount > 0" class="bulk-bar">
    <span>已选择 {{ selectedCount }} 项</span>
    <el-button size="small" @click="emit('download')">批量下载</el-button>
    <el-button size="small" @click="emit('parse')">批量解析</el-button>
    <el-button size="small" @click="emit('stop-parse')">批量停止解析</el-button>
    <el-button size="small" type="danger" plain @click="emit('delete')">批量删除</el-button>
    <el-button size="small" @click="emit('clear')">取消选择</el-button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RagAiBulkActionBar' })

defineProps<{ selectedCount: number }>()

const emit = defineEmits<{
  (e: 'download'): void
  (e: 'parse'): void
  (e: 'stop-parse'): void
  (e: 'delete'): void
  (e: 'clear'): void
}>()
</script>

<style scoped>
.bulk-bar {
  display: flex;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  align-items: center;
  gap: 8px;
}
</style>
