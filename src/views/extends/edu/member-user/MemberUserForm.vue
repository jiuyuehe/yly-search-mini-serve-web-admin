<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="720px">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="手机号" prop="mobile">
        <el-input v-model="formData.mobile" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item v-if="formType === 'create'" label="登录密码" prop="password">
        <el-input v-model="formData.password" placeholder="请输入登录密码" show-password type="password" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio
            v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
            :key="dict.value"
            :value="dict.value"
          >
            {{ dict.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="用户昵称" prop="nickname">
        <el-input v-model="formData.nickname" placeholder="请输入用户昵称" />
      </el-form-item>
      <el-form-item label="头像" prop="avatar">
        <UploadImg v-model="formData.avatar" :limit="1" :is-show-tip="false" />
      </el-form-item>
      <el-form-item label="真实姓名" prop="name">
        <el-input v-model="formData.name" placeholder="请输入真实姓名" />
      </el-form-item>
      <el-form-item label="用户性别" prop="sex">
        <el-radio-group v-model="formData.sex">
          <el-radio
            v-for="dict in getIntDictOptions(DICT_TYPE.SYSTEM_USER_SEX)"
            :key="dict.value"
            :value="dict.value"
          >
            {{ dict.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="出生日期" prop="birthday">
        <el-date-picker
          v-model="formData.birthday"
          type="date"
          value-format="x"
          placeholder="请选择出生日期"
        />
      </el-form-item>
      <el-form-item label="所在地" prop="areaId">
        <el-tree-select
          v-model="formData.areaId"
          :data="areaList"
          :props="defaultProps"
          :render-after-expand="true"
          class="!w-100%"
        />
      </el-form-item>
      <el-form-item label="用户标签" prop="tagIds">
        <MemberTagSelect v-model="formData.tagIds" show-add />
      </el-form-item>
      <el-form-item label="用户分组" prop="groupId">
        <MemberGroupSelect v-model="formData.groupId" />
      </el-form-item>
      <el-form-item label="会员备注" prop="mark">
        <el-input v-model="formData.mark" type="textarea" placeholder="请输入会员备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" :disabled="formLoading" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import * as EduApi from '@/api/extends/edu'
import * as AreaApi from '@/api/system/area'
import { defaultProps } from '@/utils/tree'
import MemberTagSelect from '@/views/member/tag/components/MemberTagSelect.vue'
import MemberGroupSelect from '@/views/member/group/components/MemberGroupSelect.vue'
import type { FormRules } from 'element-plus'

defineOptions({ name: 'EduMemberUserForm' })

const { t } = useI18n()
const message = useMessage()

const MOBILE_REG = /^1\d{10}$/
const PASSWORD_REG = /^[^<>"'|\\]+$/

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const areaList = ref([])
const formData = ref<EduApi.EduMemberUserVO>({
  id: undefined,
  mobile: '',
  password: '',
  status: 0,
  nickname: '',
  avatar: '',
  name: '',
  sex: undefined,
  areaId: undefined,
  birthday: undefined,
  mark: '',
  tagIds: [],
  levelId: undefined,
  groupId: undefined
})

const validateMobile = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('手机号不能为空'))
    return
  }
  if (!MOBILE_REG.test(value)) {
    callback(new Error('手机号格式不正确'))
    return
  }
  callback()
}

const validatePassword = (_rule: any, value: string, callback: any) => {
  if (formType.value !== 'create') {
    callback()
    return
  }
  if (!value) {
    callback(new Error('密码不能为空'))
    return
  }
  if (value.length < 5 || value.length > 20) {
    callback(new Error('用户密码长度必须介于 5 和 20 之间'))
    return
  }
  if (!PASSWORD_REG.test(value)) {
    callback(new Error('密码不能包含非法字符'))
    return
  }
  callback()
}

const formRules = reactive<FormRules>({
  mobile: [{ validator: validateMobile, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }],
  nickname: [{ required: true, message: '用户昵称不能为空', trigger: 'blur' }]
})

const resetForm = () => {
  formData.value = {
    id: undefined,
    mobile: '',
    password: '',
    status: 0,
    nickname: '',
    avatar: '',
    name: '',
    sex: undefined,
    areaId: undefined,
    birthday: undefined,
    mark: '',
    tagIds: [],
    levelId: undefined,
    groupId: undefined
  }
  formRef.value?.resetFields()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  areaList.value = await AreaApi.getAreaTree()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EduApi.getMemberUser(id)
      formData.value.password = ''
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
    const payload = { ...formData.value }
    if (formType.value === 'create') {
      await EduApi.createMemberUser(payload)
      message.success(t('common.createSuccess'))
    } else {
      delete payload.password
      await EduApi.updateMemberUser(payload)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
