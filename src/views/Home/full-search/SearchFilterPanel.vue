<template>
  <aside class="search-filter-panel" :class="{ collapsed }">
    <div class="filter-head">
      <div v-if="!collapsed" class="filter-head-text">
        <p class="filter-kicker">筛选条件</p>
      </div>
      <div class="filter-actions">
        <el-button v-if="!collapsed" link type="primary" @click="handleReset">重置</el-button>
        <el-button link type="primary" class="collapse-btn" @click="$emit('toggle-collapse')">
          {{ collapsed ? '展开' : '收起' }}
        </el-button>
      </div>
    </div>

    <el-scrollbar v-if="!collapsed" class="filter-scroll">
      <el-collapse v-model="activeNames">
        <el-collapse-item title="范围" name="basic">
          <el-form label-position="top" class="filter-form" @submit.prevent>
            <div class="switch-line">
              <span>文件夹</span>
              <el-switch v-model="model.folder" @change="emitSearch" />
            </div>
            <el-form-item label="文件类型">
              <el-segmented
                v-model="model.docType"
                :options="docTypeOptions"
                block
                @change="emitSearch"
              />
            </el-form-item>
            <el-form-item label="扩展名">
              <div class="tag-input-wrap">
                <el-tag
                  v-for="tag in dynamicTags"
                  :key="tag"
                  closable
                  effect="dark"
                  :disable-transitions="false"
                  @close="handleClose(tag)"
                >
                  {{ tag }}
                </el-tag>
                <el-input
                  v-if="inputVisible"
                  ref="inputRef"
                  v-model="inputValue"
                  class="tag-input"
                  size="small"
                  @keydown.enter.prevent="handleInputConfirm"
                  @blur="handleInputConfirm"
                />
                <el-button v-else class="tag-add-btn" size="small" @click="showInput">
                  + 添加
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <el-collapse-item title="时间范围" name="time">
          <el-form label-position="top" class="filter-form" @submit.prevent>
            <el-form-item>
              <div class="slider-field">
                <div class="slider-value">{{ timeMarks[timeIndex] }}</div>
                <el-slider
                  v-model="timeIndex"
                  :min="0"
                  :max="5"
                  :step="1"
                  show-stops
                  :marks="timeSliderMarks"
                  @change="emitSearch"
                />
              </div>
            </el-form-item>
            <el-form-item label="自定义范围">
              <el-date-picker
                v-model="timeRange"
                class="time-range-picker"
                clearable
                end-placeholder="结束日期"
                start-placeholder="开始日期"
                type="daterange"
                value-format="YYYY-MM-DD HH:mm:ss"
                :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
                @change="handleTimeRangeChange"
              />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <el-collapse-item title="大小与精度" name="quality">
          <el-form label-position="top" class="filter-form" @submit.prevent>
            <el-form-item>
              <div class="slider-field">
                <div class="slider-value">{{ sizeRangeLabel }}</div>
                <el-slider
                  v-model="sizeRange"
                  range
                  show-stops
                  :min="0"
                  :max="6"
                  :marks="sizeSliderMarks"
                  @change="emitSearch"
                />
              </div>
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>
    </el-scrollbar>
  </aside>
</template>

<script lang="ts" setup>
import type { SearchParam } from '@/api/rag/search'
import type { InputInstance } from 'element-plus'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  reset: []
  'toggle-collapse': []
  search: []
}>()
defineOptions({ name: 'HomeSearchFilterPanel' })

const model = defineModel<SearchParam>({ required: true })
const activeNames = ref(['basic', 'time', 'quality'])
const inputValue = ref('')
const dynamicTags = ref<string[]>([])
const inputVisible = ref(false)
const inputRef = ref<InputInstance>()
const timeRange = ref<[string, string] | null>(null)
const timeIndex = ref(0)

const docTypeOptions = [
  { label: '全部', value: '' },
  { label: '文档', value: '2' },
  { label: '图片', value: '1' },
  { label: '音频', value: '3' },
  { label: '视频', value: '4' },
  { label: '压缩', value: '6' },
  { label: '其他', value: '5' }
]

const sizeStops = [
  { label: '0', value: 0 },
  { label: '1MB', value: 1024 * 1024 },
  { label: '10MB', value: 10 * 1024 * 1024 },
  { label: '50MB', value: 50 * 1024 * 1024 },
  { label: '200MB', value: 200 * 1024 * 1024 },
  { label: '1GB', value: 1024 * 1024 * 1024 },
  { label: '10GB+', value: 0 }
]

const sizeRange = ref<[number, number]>([0, 6])
const timeMarks = ['全部', '今天', '近 7 天', '近 30 天', '近半年', '今年']
const sizeSliderMarks = { 0: '0', 1: '1M', 2: '10M', 3: '50M', 4: '200M', 5: '1G', 6: '10G+' }
const timeSliderMarks = { 0: '全部', 1: '今天', 2: '7天', 3: '30天', 4: '半年', 5: '今年' }

const emitSearch = () => {
  emit('search')
}

const handleReset = () => {
  emit('reset')
}

const normalizeTags = (value?: string | null) => {
  return (value || '')
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const syncExtname = () => {
  model.value.extname = dynamicTags.value.join(',')
}

const emitSearchAfterSync = () => {
  syncExtname()
  emitSearch()
}

const syncTimeRange = () => {
  if (!timeRange.value) {
    model.value.timeDis = ''
    model.value.startDate = undefined
    model.value.endDate = undefined
    return
  }

  const [startDate, endDate] = timeRange.value
  model.value.timeDis = ''
  model.value.startDate = startDate
  model.value.endDate = endDate
}

const handleTimeRangeChange = () => {
  timeIndex.value = 0
  syncTimeRange()
  emitSearch()
}

const formatDateTime = (date: Date) => {
  const pad = (value: number) => `${value}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const handleClose = (tag: string) => {
  dynamicTags.value = dynamicTags.value.filter((item) => item !== tag)
  emitSearchAfterSync()
}

const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const handleInputConfirm = () => {
  const value = inputValue.value.trim()
  let changed = false
  if (value && !dynamicTags.value.includes(value)) {
    dynamicTags.value.push(value)
    changed = true
  }
  inputVisible.value = false
  inputValue.value = ''
  if (changed) {
    emitSearchAfterSync()
  }
}

const sizeRangeLabel = computed(() => {
  if (sizeRange.value[0] === 0 && sizeRange.value[1] === 6) return '不限大小'
  const start = sizeStops[sizeRange.value[0]]
  const end = sizeStops[sizeRange.value[1]]
  return `${start.label} - ${end.label}`
})

watch(
  sizeRange,
  ([start, end]) => {
    model.value.fileSize = ''
    if (start === 0 && end === 6) {
      model.value.minSize = undefined
      model.value.maxSize = undefined
      return
    }
    model.value.minSize = sizeStops[start].value
    model.value.maxSize = end === 6 ? 0 : sizeStops[end].value
  },
  { immediate: true }
)

watch(
  timeIndex,
  (value) => {
    if (value === 0) {
      model.value.timeDis = ''
      model.value.startDate = undefined
      model.value.endDate = undefined
      return
    }
    const now = new Date()
    let start = startOfToday()
    if (value === 2) start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (value === 3) start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    if (value === 4) start = new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000)
    if (value === 5) start = new Date(now.getFullYear(), 0, 1)
    model.value.timeDis = ''
    model.value.startDate = formatDateTime(start)
    model.value.endDate = formatDateTime(now)
    timeRange.value = null
  },
  { immediate: true }
)

watch(
  () => [model.value.minSize, model.value.maxSize, model.value.startDate, model.value.endDate],
  ([minSize, maxSize, startDate, endDate]) => {
    if (minSize === undefined && maxSize === undefined) sizeRange.value = [0, 6]
    if (!startDate && !endDate) {
      timeRange.value = null
      timeIndex.value = 0
      return
    }
  }
)

watch(
  () => model.value.extname,
  (value) => {
    const nextTags = normalizeTags(value)
    if (nextTags.join(',') === dynamicTags.value.join(',')) {
      return
    }
    dynamicTags.value = nextTags
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.search-filter-panel {
  width: 300px;
  height: calc(100vh - 84px);
  min-width: 300px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  backdrop-filter: blur(8px);
}

.search-filter-panel.collapsed {
  width: 56px;
  min-width: 56px;
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--el-border-color-light);

  .filter-head-text {
    min-width: 0;
  }
}

.search-filter-panel.collapsed .filter-head {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px 8px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collapse-btn {
  padding: 0;
}

.filter-scroll {
  height: calc(100% - 73px);
}

.filter-form {
  padding: 10px 18px 4px;
}

.tag-input-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 32px;
}

.tag-input {
  width: 120px;
}

.tag-add-btn {
  height: 28px;
  padding: 0 10px;
}

.switch-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  padding: 0 12px;
  margin-bottom: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;

  span {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }
}

.slider-field {
  width: 100%;
  padding: 0 8px 24px;
}

.slider-value {
  margin-bottom: 2px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.time-range-picker {
  width: 100%;
}

:deep(.el-collapse) {
  border-top: 0;
  border-bottom: 0;
}

:deep(.el-collapse-item__header) {
  padding: 0 18px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  background: transparent;
  border-bottom: 1px solid var(--el-border-color-light);
}

:deep(.el-collapse-item__wrap) {
  background: transparent;
  border-bottom: 1px solid var(--el-border-color-light);
}

:deep(.el-collapse-item__content) {
  padding-bottom: 10px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

:deep(.el-segmented) {
  --el-segmented-item-selected-color: var(--el-color-primary);
  --el-segmented-bg-color: var(--el-fill-color-lighter);
  --el-segmented-item-selected-bg-color: var(--el-color-primary-light-9);

  width: 100%;
}

:deep(.el-slider__marks-text) {
  margin-top: 10px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

@media (width <= 980px) {
  .search-filter-panel {
    width: 100%;
    height: auto;
    min-width: 0;
  }

  .search-filter-panel.collapsed {
    width: 100%;
    min-width: 0;
  }

  .filter-scroll {
    height: auto;
    max-height: 420px;
  }

  .search-filter-panel.collapsed .filter-scroll {
    display: none;
  }
}
</style>
