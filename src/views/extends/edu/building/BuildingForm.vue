<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="所属组织" prop="deptId">
        <DeptExtTreeSelect v-model="formData.deptId" :biz-types="['school', 'campus']" placeholder="请选择学校或校区" class="!w-100%" />
      </el-form-item>
      <el-form-item label="建筑名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入建筑名称" />
      </el-form-item>
      <el-form-item label="建筑编码" prop="code">
        <el-input v-model="formData.code" placeholder="请输入建筑编码" />
      </el-form-item>
      <el-form-item label="建筑类型" prop="buildingType">
        <el-select v-model="formData.buildingType" class="!w-100%" clearable placeholder="请选择建筑类型">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_BUILDING_TYPE)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="楼层数" prop="floorCount">
        <el-input-number v-model="formData.floorCount" :min="0" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="地址" prop="address">
        <el-input v-model="formData.address" placeholder="请输入地址" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)" :key="dict.value" :value="dict.value">
            {{ dict.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="formData.remark" type="textarea" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" :disabled="formLoading" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import { CommonStatusEnum } from '@/utils/constants'
import * as EduApi from '@/api/extends/edu'
import { FormRules } from 'element-plus'
import DeptExtTreeSelect from '../components/DeptExtTreeSelect.vue'

defineOptions({ name: 'EduBuildingForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const formData = ref<EduApi.EduBuildingVO>({
  deptId: undefined as unknown as number,
  name: '',
  code: '',
  buildingType: undefined,
  floorCount: undefined,
  address: '',
  status: CommonStatusEnum.ENABLE,
  remark: ''
})
const formRules = reactive<FormRules>({
  deptId: [{ required: true, message: '所属组织不能为空', trigger: 'change' }],
  name: [{ required: true, message: '建筑名称不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const resetForm = () => {
  formData.value = {
    deptId: undefined as unknown as number,
    name: '',
    code: '',
    buildingType: undefined,
    floorCount: undefined,
    address: '',
    status: CommonStatusEnum.ENABLE,
    remark: ''
  }
  formRef.value?.resetFields()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getBuilding(id)
    } finally {
      formLoading.value = false
    }
  }
}

defineExpose({ open })

const emit = defineEmits(['success'])

const submitForm = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return
  formLoading.value = true
  try {
    if (formType.value === 'create') {
      await EduApi.createBuilding(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateBuilding(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
