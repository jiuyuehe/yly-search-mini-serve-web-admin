<template>
  <div class="state-panel">
    <el-result v-if="error" icon="error" title="加载失败" :sub-title="error">
      <template #extra>
        <el-button type="primary" @click="emit('retry')">重试</el-button>
      </template>
    </el-result>
    <el-result v-else-if="isSearchEmpty" icon="info" title="没有找到匹配的文件">
      <template #extra>
        <el-button @click="emit('clear-query')">清空搜索</el-button>
      </template>
    </el-result>
    <el-empty v-else description="这里还没有文件">
      <el-button type="primary" plain @click="emit('upload')">上传文件</el-button>
      <el-button class="ml-8px" @click="emit('create-folder')">新建文件夹</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RagAiFileStatePanel' })

defineProps<{
  error: string | null
  isSearchEmpty: boolean
}>()

const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'clear-query'): void
  (e: 'upload'): void
  (e: 'create-folder'): void
}>()
</script>

<style scoped>
.state-panel {
  padding: 12px;
}
</style>
