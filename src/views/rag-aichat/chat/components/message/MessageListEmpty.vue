<template>
  <div class="message-empty">
    <div class="message-empty-title">{{ title }}</div>
    <div class="message-empty-desc">请选择一个问题开始提问，或直接在下方输入你的问题</div>
    <div class="message-empty-prompts">
      <button
        v-for="prompt in promptList"
        :key="prompt"
        class="message-empty-prompt"
        type="button"
        @click="$emit('prompt', prompt)"
      >
        {{ prompt }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'RagAiChatMessageListEmpty' })

defineProps({
  title: { type: String, default: 'AI问答' }
})

defineEmits(['prompt'])

const promptList = ['请帮我总结这个知识库的核心内容', '请列出相关资料中的关键结论']
</script>

<style scoped>
.message-empty {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 300px;
  text-align: center;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.message-empty-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--app-text-primary);
}

.message-empty-desc {
  margin-top: 10px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.message-empty-prompts {
  display: flex;
  width: min(520px, 100%);
  margin-top: 20px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.message-empty-prompt {
  height: 42px;
  min-width: 180px;
  padding: 0 16px;
  color: var(--app-text-primary);
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-md);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.message-empty-prompt:hover {
  color: var(--app-color-brand);
  background: var(--app-bg-subtle);
  border-color: rgb(0 82 217 / 24%);
}
</style>
