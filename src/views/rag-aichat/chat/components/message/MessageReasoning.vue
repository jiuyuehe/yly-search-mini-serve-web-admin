<template>
  <div v-if="shouldShowComponent" class="message-reasoning">
    <div class="message-reasoning-header" @click="toggleExpanded">
      <div class="message-reasoning-title">
        <el-icon :size="16">
          <Loading v-if="streaming" class="is-loading" />
          <ChatDotSquare v-else />
        </el-icon>
        <span>{{ titleText }}</span>
      </div>
      <el-icon
        :size="14"
        class="message-reasoning-arrow"
        :class="{ expanded: isExpanded }"
      >
        <ArrowDown />
      </el-icon>
    </div>

    <div v-show="isExpanded" class="message-reasoning-content">
      <MarkdownView :content="reasoningContent || ''" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ChatDotSquare, Loading } from '@element-plus/icons-vue'
import MarkdownView from '@/components/MarkdownView/index.vue'

defineOptions({ name: 'RagAiChatMessageReasoning' })

const props = defineProps<{
  reasoningContent?: string
  content?: string
  streaming?: boolean
}>()

const isExpanded = ref(true)

const shouldShowComponent = computed(() => {
  return Boolean(props.reasoningContent && props.reasoningContent.trim())
})

const titleText = computed(() => {
  if (props.streaming && !props.content?.trim()) return '思考中...'
  return '已完成思考'
})

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.message-reasoning {
  margin-bottom: 8px;
}

.message-reasoning-header {
  display: flex;
  padding: 8px;
  cursor: pointer;
  background: linear-gradient(90deg, rgb(239 246 255), rgb(245 243 255));
  border: 1px solid rgb(229 231 235 / 70%);
  border-bottom: 0;
  border-radius: 8px 8px 0 0;
  align-items: center;
  justify-content: space-between;
}

.message-reasoning-title {
  display: flex;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  align-items: center;
  gap: 6px;
}

.message-reasoning-arrow {
  color: #6b7280;
  transition: transform 0.2s ease;
}

.message-reasoning-arrow.expanded {
  transform: rotate(180deg);
}

.message-reasoning-content {
  max-height: 300px;
  padding: 12px;
  overflow-y: auto;
  background: rgb(255 255 255 / 70%);
  border: 1px solid rgb(229 231 235 / 70%);
  border-radius: 0 0 8px 8px;
}
</style>
