<template>
  <section class="ai-search-panel">
    <div class="ai-input">
      <el-input
        :model-value="question"
        size="large"
        clearable
        placeholder="用一句话描述你要找的资料"
        @update:model-value="$emit('update:question', $event)"
        @keyup.enter="$emit('search')"
      >
        <template #prefix>
          <el-icon><MagicStick /></el-icon>
        </template>
      </el-input>
      <el-button size="large" type="primary" :loading="loading" @click="$emit('search')">
        <el-icon><Search /></el-icon>
        AI 搜索
      </el-button>
    </div>

    <div v-if="analysis" class="ai-answer">
      <div class="answer-title">你可能要找的是：</div>
      <div class="keywords">{{ analysis.rewrittenKeywords || question }}</div>
      <div class="condition-row">
        <el-tag v-for="item in conditionTags" :key="item" size="small" effect="plain">{{ item }}</el-tag>
      </div>
      <p>{{ analysis.answerHint || '已按 AI 解析后的关键词推荐前 5 个结果' }}</p>
      <el-button type="primary" plain @click="$emit('apply')">按该条件重新搜索</el-button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { MagicStick, Search } from '@element-plus/icons-vue'

const props = defineProps<{
  question: string
  analysis?: any
  loading: boolean
}>()

defineEmits<{
  'update:question': [value: string]
  search: []
  apply: []
}>()

const conditionTags = computed(() => {
  const filters = props.analysis?.filters || {}
  return Object.entries(filters)
    .filter(([key, value]) => !['keyword', 'answerHint'].includes(key) && value)
    .map(([key, value]) => `${key}: ${value}`)
})
</script>

<style scoped lang="scss">
.ai-search-panel { display: grid; gap: 14px; }

.ai-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 12px;
}

.ai-answer {
  padding: 16px;
  background: linear-gradient(180deg, rgb(255 255 255 / 68%), rgb(255 255 255 / 42%));
  border: 1px solid rgb(255 255 255 / 66%);
  border-radius: 16px;
  box-shadow: 0 16px 42px rgb(15 23 42 / 8%);

  p { margin: 10px 0 12px; color: #475569; }
}

.answer-title { color: #64748b; font-size: 13px; }
.keywords { margin-top: 6px; font-size: 20px; font-weight: 800; color: #172033; }
.condition-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }

@media (max-width: 720px) {
  .ai-input { grid-template-columns: 1fr; }
}
</style>
