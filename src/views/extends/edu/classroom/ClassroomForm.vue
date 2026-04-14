<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="所属建筑" prop="buildingId">
        <el-select v-model="formData.buildingId" class="!w-100%" clearable filterable placeholder="请选择建筑">
          <el-option v-for="item in buildingOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="教室名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入教室名称" />
      </el-form-item>
      <el-form-item label="房间号" prop="roomNo">
        <el-input v-model="formData.roomNo" placeholder="请输入房间号" />
      </el-form-item>
      <el-form-item label="教室类型" prop="classroomType">
        <el-select v-model="formData.classroomType" class="!w-100%" clearable placeholder="请选择教室类型">
          <el-option v-for="dict in getStrDictOptions(DICT_TYPE.EDU_CLASSROOM_TYPE)" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="容量" prop="capacity">
        <el-input-number v-model="formData.capacity" :min="0" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="所在楼层" prop="floorNo">
        <el-input-number v-model="formData.floorNo" controls-position="right" class="!w-100%" />
      </el-form-item>
      <el-form-item label="设施 JSON" prop="facilitiesJson">
        <el-input v-model="formData.facilitiesJson" type="textarea" placeholder="请输入设施 JSON" />
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

defineOptions({ name: 'EduClassroomForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const buildingOptions = ref<EduApi.EduBuildingVO[]>([])
const formData = ref<EduApi.EduClassroomVO>({
  buildingId: undefined as unknown as number,
  name: '',
  roomNo: '',
  classroomType: undefined,
  capacity: undefined,
  floorNo: undefined,
  facilitiesJson: '',
  status: CommonStatusEnum.ENABLE,
  remark: ''
})
const formRules = reactive<FormRules>({
  buildingId: [{ required: true, message: '所属建筑不能为空', trigger: 'change' }],
  name: [{ required: true, message: '教室名称不能为空', trigger: 'blur' }],
  roomNo: [{ required: true, message: '房间号不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const resetForm = () => {
  formData.value = {
    buildingId: undefined as unknown as number,
    name: '',
    roomNo: '',
    classroomType: undefined,
    capacity: undefined,
    floorNo: undefined,
    facilitiesJson: '',
    status: CommonStatusEnum.ENABLE,
    remark: ''
  }
  formRef.value?.resetFields()
}

const loadBuildingOptions = async () => {
  buildingOptions.value = await EduApi.getBuildingSimpleList()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadBuildingOptions()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getClassroom(id)
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
      await EduApi.createClassroom(formData.value)
      message.success(t('common.createSuccess'))
    } else {
      await EduApi.updateClassroom(formData.value)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
