<template>
  <ContentWrap>
    <h2 class="mb-10px">第三方集成配置</h2>
    <p class="text-gray-500 text-13px mb-15px"> 本页为扩展中心的“第三方集成配置”。 </p>
  </ContentWrap>

  <!-- 搜索区域 -->
  <ContentWrap>
    <el-form
      ref="queryFormRef"
      :inline="true"
      :model="queryParams"
      class="-mb-15px"
      label-width="90px"
    >
      <el-form-item label="配置代码" prop="configCode">
        <el-input
          v-model="queryParams.configCode"
          class="!w-240px"
          clearable
          placeholder="支持模糊查询"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="配置名称" prop="configName">
        <el-input
          v-model="queryParams.configName"
          class="!w-240px"
          clearable
          placeholder="支持模糊查询"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="配置分组" prop="configGroup">
        <el-input
          v-model="queryParams.configGroup"
          class="!w-240px"
          clearable
          placeholder="请输入配置分组"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="配置状态" prop="configStatus">
        <el-select
          v-model="queryParams.configStatus"
          clearable
          placeholder="请选择状态"
          class="!w-240px"
        >
          <el-option :value="0" label="正常 / 启用" />
          <el-option :value="1" label="停用" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px" />
          搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-5px" />
          重置
        </el-button>
        <el-button
          type="primary"
          plain
          v-hasPermi="['extends:integration-config:create']"
          @click="handleCreate"
        >
          <Icon icon="ep:plus" class="mr-5px" />
          新增配置
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表区域 -->
  <ContentWrap>
    <template v-if="list.length">
      <el-table v-loading="loading" :data="list">
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="配置代码" prop="configCode" min-width="220" />
        <el-table-column label="配置名称" prop="configName" min-width="200" />
        <el-table-column label="配置分组" prop="configGroup" width="140">
          <template #default="{ row }">
            {{ row.configGroup || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="配置类型" prop="configType" width="100">
          <template #default="scope">
            <span v-if="scope.row.configType === 0">系统配置</span>
            <span v-else>个人配置</span>
          </template>
        </el-table-column>
        <el-table-column label="配置状态" prop="configStatus" width="110">
          <template #default="scope">
            <el-tag :type="scope.row.configStatus === 0 ? 'success' : 'info'">
              {{ scope.row.configStatus === 0 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          prop="createTime"
          width="180"
          :formatter="dateFormatter"
        />
        <el-table-column label="操作" fixed="right" width="180">
          <template #default="scope">
            <el-button
              link
              type="primary"
              size="small"
              v-hasPermi="['extends:integration-config:update']"
              @click="openForm('update', scope.row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              v-hasPermi="['extends:integration-config:delete']"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <Pagination
        :total="total"
        v-model:page="queryParams.pageNo"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />
    </template>
    <template v-else>
      <el-empty description="暂无第三方集成配置">
        <el-button
          type="primary"
          v-hasPermi="['extends:integration-config:create']"
          @click="handleCreate"
        >
          新增配置
        </el-button>
      </el-empty>
    </template>
  </ContentWrap>

  <!-- 新增 / 编辑配置弹窗 -->
  <el-dialog
    v-model="formVisible"
    :title="formMode === 'create' ? '新增第三方集成配置' : '编辑第三方集成配置'"
    width="720px"
    destroy-on-close
  >
    <el-form ref="formRef" :model="formModel" label-width="110px">
      <!-- 创建时需要选择模板；编辑时仅展示模板代码 -->
      <el-form-item label="配置模板" v-if="formMode === 'create'">
        <el-select
          v-model="formModel.templateCode"
          class="!w-360px"
          placeholder="请选择配置模板"
          filterable
          @change="handleTemplateChange"
        >
          <el-option
            v-for="tpl in templates"
            :key="tpl.code"
            :label="`${tpl.name}（${tpl.code}）`"
            :value="tpl.code"
            :disabled="tpl.allowed === false"
          >
            <span>{{ tpl.name }}</span>
            <span class="text-12px text-gray-500 ml-6px">{{ tpl.code }}</span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="配置代码">
        <el-input v-model="formModel.configCode" :disabled="true" />
      </el-form-item>
      <el-form-item label="配置名称">
        <el-input v-model="formModel.configName" />
      </el-form-item>
      <el-form-item label="配置分组">
        <el-input v-model="formModel.configGroup" placeholder="请输入配置分组" />
      </el-form-item>
      <el-form-item label="排序号">
        <el-input-number v-model="formModel.sortNumber" :min="0" class="!w-180px" />
      </el-form-item>
      <el-form-item label="配置状态">
        <el-switch
          v-model="formModel.configStatus"
          :active-value="0"
          :inactive-value="1"
          active-text="启用"
          inactive-text="停用"
        />
      </el-form-item>

      <el-form-item label="配置内容（JSON）" class="json-form-item">
        <div class="json-form-item__toolbar">
          <el-button type="default" size="small" @click="formatJsonContent">格式化</el-button>
        </div>
        <el-input
          v-model="configContentJson"
          type="textarea"
          :rows="10"
          class="json-form-item__textarea"
          placeholder="请填写合法的 JSON 对象，例如：{ host: 'https://...', apiKey: 'xxx' }"
        />
        <div class="json-form-item__tips">
          <template v-if="fieldHintItems.length">
            <div
              v-for="hint in fieldHintItems"
              :key="hint.key"
              class="field-hint"
              :style="{ marginLeft: `${hint.depth * 16}px` }"
            >
              <div class="field-hint__header">
                <span class="field-hint__name">{{ hint.displayName }}</span>
                <span class="field-hint__type">{{ hint.type }}</span>
                <span class="field-hint__required">[{{ hint.required ? '必填' : '选填' }}]</span>
              </div>
              <ul class="field-hint__list">
                <li>描述：{{ hint.description || '-' }}</li>
                <li>示例：{{ formatFieldExample(hint.example) }}</li>
              </ul>
            </div>
          </template>
          <span v-else class="text-12px text-gray-500">
            当前模板未定义字段结构，请直接在上方 JSON 中根据后端约定填写配置内容。
          </span>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="formSubmitting" @click="submitForm"> 保存 </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { Icon } from '@/components/Icon'
import * as IntegrationConfigApi from '@/api/extends/integrationConfig'
import { dateFormatter } from '@/utils/formatTime'

defineOptions({ name: 'ExtIntegrationConfig' })

const message = useMessage()

const loading = ref(false)
const total = ref(0)
const list = ref<IntegrationConfigApi.IntegrationConfigVO[]>([])

const queryParams = reactive<IntegrationConfigApi.IntegrationConfigPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  configCode: undefined,
  configName: undefined,
  configGroup: undefined,
  configType: undefined,
  configStatus: undefined
})
const queryFormRef = ref()

// 表单相关
type FormMode = 'create' | 'update'
const formVisible = ref(false)
const formMode = ref<FormMode>('create')
const formSubmitting = ref(false)
const formRef = ref()
const templates = ref<IntegrationConfigApi.IntegrationConfigTemplate[]>([])
const dynamicFields = ref<IntegrationConfigApi.IntegrationConfigTemplateField[]>([])
interface FieldHintItem {
  key: string
  displayName: string
  type: IntegrationConfigApi.IntegrationConfigTemplateField['type']
  required: boolean
  description?: string
  example?: any
  depth: number
}
const buildFieldHintItems = (
  fields: IntegrationConfigApi.IntegrationConfigTemplateField[],
  prefix = '',
  depth = 0
): FieldHintItem[] => {
  if (!fields || !fields.length) {
    return []
  }
  const result: FieldHintItem[] = []
  fields.forEach((field) => {
    const name = prefix ? `${prefix}.${field.name}` : field.name
    result.push({
      key: name,
      displayName: name,
      type: field.type,
      required: field.required,
      description: field.description,
      example: field.example,
      depth
    })
    if (field.children && field.children.length) {
      result.push(...buildFieldHintItems(field.children, name, depth + 1))
    }
  })
  return result
}
const fieldHintItems = computed<FieldHintItem[]>(() =>
  buildFieldHintItems(dynamicFields.value || [])
)
const configContentJson = ref('')

const formModel = reactive<any>({
  id: undefined,
  templateCode: undefined,
  configCode: '',
  configName: '',
  configGroup: '',
  sortNumber: 100,
  configContent: {},
  configType: 0,
  configStatus: 0
})

const getList = async () => {
  loading.value = true
  try {
    const data = await IntegrationConfigApi.getIntegrationConfigPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  handleQuery()
}

const loadTemplates = async () => {
  if (templates.value.length) return
  // 第三方集成配置使用扩展模块下所有可用模板（如 workflow_integration、file_station 等）
  const all = await IntegrationConfigApi.getIntegrationConfigTemplateList({})
  templates.value = all
  if (!templates.value.length) {
    message.warning('未找到可用的系统配置模板，请先在后端配置模板')
  }
}

const resetFormModel = () => {
  formModel.id = undefined
  formModel.templateCode = undefined
  formModel.configCode = ''
  formModel.configName = ''
  formModel.configGroup = ''
  formModel.sortNumber = 100
  formModel.configContent = {}
  formModel.configType = 0
  formModel.configStatus = 0
  dynamicFields.value = []
  configContentJson.value = ''
}

const buildChildrenFromObject = (obj: Record<string, any>) => {
  if (!obj || typeof obj !== 'object') return []
  return Object.keys(obj).map<IntegrationConfigApi.IntegrationConfigTemplateField>((key) => {
    const value = obj[key]
    let childType: IntegrationConfigApi.IntegrationConfigTemplateField['type'] = 'string'
    if (Array.isArray(value)) {
      childType = 'array'
    } else if (typeof value === 'number') {
      childType = 'number'
    } else if (typeof value === 'boolean') {
      childType = 'boolean'
    } else if (typeof value === 'object') {
      childType = 'object'
    } else {
      childType = 'string'
    }
    return {
      name: key,
      type: childType,
      required: false,
      description: '',
      defaultValue: value,
      children:
        childType === 'object' && value && typeof value === 'object' && !Array.isArray(value)
          ? buildChildrenFromObject(value)
          : []
    }
  })
}

const formatFieldsWithChildren = (
  fields: IntegrationConfigApi.IntegrationConfigTemplateField[]
) => {
  // 允许字段自带 children，用于描述 object/array 内部子字段；如果没有，则根据默认值推断
  return fields.map((field) => {
    let children: IntegrationConfigApi.IntegrationConfigTemplateField[] = []
    const explicitChildren =
      // 兼容后端字段可能使用 fields 表示嵌套字段
      (field.children && field.children.length
        ? field.children
        : (field as any).fields && (field as any).fields.length
          ? (field as any).fields
          : undefined) || []
    if (explicitChildren.length) {
      children = formatFieldsWithChildren(explicitChildren)
    } else if (
      field.type === 'object' &&
      field.defaultValue &&
      typeof field.defaultValue === 'object' &&
      !Array.isArray(field.defaultValue)
    ) {
      children = buildChildrenFromObject(field.defaultValue)
    }
    return {
      ...field,
      children
    }
  })
}

const buildDefaultContent = (fields: IntegrationConfigApi.IntegrationConfigTemplateField[]) => {
  const result: Record<string, any> = {}
  fields.forEach((field) => {
    if (field.type === 'object') {
      if (field.children && field.children.length) {
        result[field.name] = buildDefaultContent(field.children)
      } else if (
        field.defaultValue &&
        typeof field.defaultValue === 'object' &&
        !Array.isArray(field.defaultValue)
      ) {
        // 从默认值中推断子字段
        const inferredChildren = buildChildrenFromObject(field.defaultValue)
        result[field.name] = buildDefaultContent(inferredChildren)
      } else {
        result[field.name] = {}
      }
    } else if (field.type === 'array') {
      result[field.name] = Array.isArray(field.defaultValue) ? field.defaultValue : []
    } else {
      if (field.defaultValue !== undefined) {
        result[field.name] = field.defaultValue
      } else if (field.type === 'boolean') {
        result[field.name] = false
      } else if (field.type === 'number') {
        result[field.name] = 0
      } else {
        result[field.name] = ''
      }
    }
  })
  return result
}

const mergeContent = (base: any, source: any) => {
  if (!source) return base
  const result = Array.isArray(base) ? [...base] : { ...base }
  Object.keys(source).forEach((key) => {
    const baseVal = base ? base[key] : undefined
    const srcVal = source[key]
    if (
      baseVal &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal) &&
      srcVal &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal)
    ) {
      result[key] = mergeContent(baseVal, srcVal)
    } else {
      result[key] = srcVal
    }
  })
  return result
}

const handleTemplateChange = async (code: string) => {
  const tpl = templates.value.find((t) => t.code === code)
  if (!tpl) return
  formModel.configCode = tpl.code
  formModel.configName = tpl.name
  formModel.configGroup = tpl.group || ''
  dynamicFields.value = formatFieldsWithChildren(tpl.fields || [])
  // 根据字段默认值初始化内容，确保对象类型不是 null
  const content = buildDefaultContent(dynamicFields.value)
  formModel.configContent = content
  configContentJson.value = JSON.stringify(content, null, 2)
}

const openForm = async (mode: FormMode, row?: IntegrationConfigApi.IntegrationConfigVO) => {
  formMode.value = mode
  resetFormModel()
  if (mode === 'create') {
    await loadTemplates()
    // 如果只有一个模板，可自动选中，减少一次点击
    if (templates.value.length === 1) {
      formModel.templateCode = templates.value[0].code
      await handleTemplateChange(templates.value[0].code)
    }
  } else if (row) {
    // 编辑：加载配置详情 & 对应模板
    const data = await IntegrationConfigApi.getIntegrationConfig(row.id)
    Object.assign(formModel, data)
    // 尝试用配置代码查找模板
    await loadTemplates()
    const tpl = templates.value.find((t) => t.code === data.configCode)
    if (tpl) {
      formModel.templateCode = tpl.code
      dynamicFields.value = formatFieldsWithChildren(tpl.fields || [])
      const baseContent = buildDefaultContent(dynamicFields.value)
      const merged = mergeContent(baseContent, data.configContent || {})
      formModel.configContent = merged
      configContentJson.value = JSON.stringify(merged, null, 2)
    } else {
      dynamicFields.value = []
    }
  }
  formVisible.value = true
}

const formatFieldExample = (val: any) => {
  if (val === undefined || val === null || val === '') return '-'
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return '-'
    }
  }
  return String(val)
}

const formatJsonContent = () => {
  if (!configContentJson.value) {
    message.warning('请先填写 JSON 内容')
    return
  }
  try {
    const obj = JSON.parse(configContentJson.value)
    configContentJson.value = JSON.stringify(obj, null, 2)
    message.success('JSON 格式正确，已自动格式化')
  } catch (e: any) {
    message.error(`JSON 格式错误：${e?.message || e}`)
  }
}

const submitForm = async () => {
  if (!formModel.configCode) {
    message.warning('请先选择配置模板')
    return
  }
  // 解析 JSON 内容
  try {
    formModel.configContent = configContentJson.value ? JSON.parse(configContentJson.value) : {}
  } catch (e) {
    message.error('配置内容不是合法的 JSON，请检查后重试')
    return
  }
  formSubmitting.value = true
  try {
    if (formMode.value === 'create') {
      await IntegrationConfigApi.createIntegrationConfig(formModel)
    } else {
      await IntegrationConfigApi.updateIntegrationConfig(formModel)
    }
    message.success('保存成功')
    formVisible.value = false
    await getList()
  } finally {
    formSubmitting.value = false
  }
}

const handleCreate = () => {
  openForm('create')
}

const handleDelete = async (row: IntegrationConfigApi.IntegrationConfigVO) => {
  try {
    await message.delConfirm()
    await IntegrationConfigApi.deleteIntegrationConfig(row.id)
    message.success('删除成功')
    await getList()
  } catch {
    // ignore
  }
}

onMounted(() => {
  getList()
})
</script>

<style scoped lang="scss">
.json-form-item {
  .json-form-item__toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 6px;
  }

  .json-form-item__textarea {
    width: 100%;
  }

  .json-form-item__tips {
    margin-top: 8px;
    font-size: 13px;
    color: #4c4c4c;
    line-height: 1.5;
  }
}

.field-hint {
  border-left: 2px solid var(--el-border-color);
  padding-left: 12px;
  margin-bottom: 10px;

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  &__name {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__type {
    color: var(--el-text-color-secondary);
  }

  &__required {
    color: var(--el-color-danger);
    font-weight: 600;
  }

  &__list {
    margin: 6px 0 0;
    padding-left: 18px;
    font-size: 12px;
    color: var(--el-text-color-regular);

    li {
      list-style: disc;
      line-height: 1.5;
    }
  }
}
</style>
