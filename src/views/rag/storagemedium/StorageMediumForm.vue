<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="名称" prop="mediumName">
        <el-input v-model="formData.mediumName" placeholder="请输入" />
      </el-form-item>
      <el-form-item label="类型" prop="mediumType">
        <el-select v-model="formData.mediumType" placeholder="请选择类型" clearable class="!w-240px">
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.STORAGE_MEDIUM_TYPE)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="formData.status" placeholder="请选择状态" clearable class="!w-240px">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { StorageMediumApi, StorageMediumVO } from '@/api/rag/storagemedium'
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
/** 存储介质 表单 */
defineOptions({ name: 'StorageMediumForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  mediumName: undefined,
  mediumType: undefined,
  mediumDesc: undefined,
  configJson: undefined,
  status: undefined,
})
const formRules = reactive({
  mediumName: [{ required: true, message: '存储介质名称不能为空', trigger: 'blur' }],
  mediumType: [{ required: true, message: '存储介质类型：MYSQL/NAS不能为空', trigger: 'change' }],
  configJson: [{ required: true, message: '配置JSON，不同类型的介质会有不同的配置内容不能为空', trigger: 'blur' }],
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await StorageMediumApi.getStorageMedium(id)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as StorageMediumVO
    if (formType.value === 'create') {
      await StorageMediumApi.createStorageMedium(data)
      message.success(t('common.createSuccess'))
    } else {
      await StorageMediumApi.updateStorageMedium(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: undefined,
    mediumName: undefined,
    mediumType: undefined,
    mediumDesc: undefined,
    configJson: undefined,
    status: undefined,
  }
  formRef.value?.resetFields()
}
</script>