<template>
  <el-tree-select
    v-model="currentValue"
    :data="treeData"
    :props="defaultProps"
    :check-strictly="checkStrictly"
    :clearable="clearable"
    :default-expand-all="defaultExpandAll"
    :disabled="disabled"
    :multiple="multiple"
    :render-after-expand="false"
    :show-checkbox="multiple"
    node-key="id"
    :placeholder="placeholder"
  />
</template>

<script setup lang="ts">
import { defaultProps, handleTree } from '@/utils/tree'
import { getDeptExtSimpleList, type EduDeptExtVO } from '@/api/extends/edu'

defineOptions({ name: 'EduDeptTreeSelect' })

const props = withDefaults(
  defineProps<{
    modelValue?: number | number[] | null
    bizTypes?: string[]
    placeholder?: string
    multiple?: boolean
    clearable?: boolean
    checkStrictly?: boolean
    defaultExpandAll?: boolean
    disabled?: boolean
  }>(),
  {
    bizTypes: () => [],
    placeholder: '请选择',
    multiple: false,
    clearable: true,
    checkStrictly: true,
    defaultExpandAll: true,
    disabled: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | number[] | null | undefined): void
}>()

const treeData = ref<EduDeptExtVO[]>([])

const currentValue = computed({
  get: () => {
    if (props.multiple) {
      return Array.isArray(props.modelValue)
        ? props.modelValue.filter((item): item is number => item !== null && item !== undefined)
        : []
    }
    return props.modelValue
  },
  set: (value) => {
    if (props.multiple) {
      const values = Array.isArray(value)
        ? value.filter((item): item is number => item !== null && item !== undefined)
        : []
      emit('update:modelValue', values)
      return
    }
    emit('update:modelValue', value)
  }
})

const loadData = async () => {
  const data = await getDeptExtSimpleList(props.bizTypes)
  treeData.value = handleTree(data, 'id', 'parentId')
}

watch(
  () => props.bizTypes.join(','),
  () => {
    loadData()
  },
  { immediate: true }
)

defineExpose({ reload: loadData })
</script>
