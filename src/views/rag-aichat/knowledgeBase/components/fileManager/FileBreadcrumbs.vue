<template>
  <div class="file-breadcrumbs">
    <span
      v-for="(item, index) in fullPath"
      :key="`${item}_${index}`"
      class="crumb"
      :class="{ active: index === fullPath.length - 1 }"
      @click="index < fullPath.length - 1 && emit('navigate', fullPath.slice(1, index + 1))"
    >
      {{ item }}
      <span v-if="index < fullPath.length - 1" class="sep">/</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'RagAiFileBreadcrumbs' })

const props = defineProps<{ currentPath: string[] }>()
const emit = defineEmits<{ (e: 'navigate', path: string[]): void }>()

const fullPath = computed(() => ['全部文件', ...props.currentPath])
</script>

<style scoped>
.file-breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  color: var(--app-text-secondary);
}

.crumb {
  cursor: pointer;
}

.crumb.active {
  color: var(--app-text-primary);
  cursor: default;
}

.sep {
  margin: 0 6px;
  color: var(--app-text-placeholder);
}
</style>
