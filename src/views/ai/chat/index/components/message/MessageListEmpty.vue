<!-- 消息列表为空时，展示 prompt 列表 -->
<template>
  <div class="relative flex flex-row justify-center w-full h-full overflow-y-auto">
    <div class="flex flex-col items-center justify-center py-40px w-full max-w-600px">
      <!-- 角色头像和名称 -->
      <div class="flex flex-col items-center mb-20px">
        <img
          v-if="roleAvatar"
          :src="roleAvatar"
          class="w-64px h-64px rounded-full mb-12px object-cover"
        />
        <div class="text-28px font-bold text-center">{{ roleTitle }}</div>
      </div>

      <!-- 欢迎语 -->
      <div
        v-if="welcomeMessage"
        class="w-full px-20px py-16px mb-20px rounded-12px bg-[var(--el-color-primary-light-9)] text-14px text-[var(--el-text-color-regular)] leading-[1.7] whitespace-pre-wrap"
      >
        {{ welcomeMessage }}
      </div>

      <!-- 当前模式下你能做什么 -->
      <div v-if="roleDescription" class="w-full mb-20px">
        <div
          class="flex items-center gap-6px mb-10px text-14px font-medium text-[var(--el-text-color-primary)] cursor-pointer select-none"
          role="button"
          tabindex="0"
          :aria-expanded="capabilityExpanded"
          @click="capabilityExpanded = !capabilityExpanded"
          @keydown.enter.prevent="capabilityExpanded = !capabilityExpanded"
          @keydown.space.prevent="capabilityExpanded = !capabilityExpanded"
        >
          <Icon icon="ep:info-filled" class="text-[var(--el-color-primary)]" />
          <span>当前模式下你能做什么？</span>
          <Icon
            :icon="capabilityExpanded ? 'ep:arrow-up' : 'ep:arrow-down'"
            class="ml-auto text-12px"
          />
        </div>
        <div
          v-show="capabilityExpanded"
          :aria-hidden="!capabilityExpanded"
          class="px-16px py-12px rounded-10px bg-[var(--el-fill-color-light)] text-13px text-[var(--el-text-color-regular)] leading-[1.7] whitespace-pre-wrap"
        >
          {{ roleDescription }}
        </div>
      </div>

      <!-- prompt 建议列表 -->
      <div class="flex flex-row flex-wrap items-center justify-center w-full">
        <div
          class="flex justify-center w-180px leading-50px border border-solid border-[#e4e4e4] rounded-10px m-10px cursor-pointer hover:bg-[rgba(243,243,243,0.73)] text-14px px-10px text-center"
          v-for="item in promptList"
          :key="item.prompt"
          @click="handlerPromptClick(item)"
        >
          {{ item.prompt }}
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ChatConversationVO } from '@/api/ai/chat/conversation'
import { ChatRoleApi, ChatRoleVO } from '@/api/ai/model/chatRole'

const props = defineProps<{
  conversation?: ChatConversationVO | null
}>()

const emits = defineEmits(['onPrompt'])

const defaultPromptList = [
  { prompt: '今天天气怎么样?' },
  { prompt: '写一首好听的诗歌?' }
]

const role = ref<ChatRoleVO | null>(null) // 当前会话绑定的角色信息
const capabilityExpanded = ref(true) // 是否展开"能做什么"

/** 角色头像 */
const roleAvatar = computed(() => {
  if (role.value?.avatar) return role.value.avatar
  if (props.conversation?.roleAvatar) return props.conversation.roleAvatar
  return ''
})

/** 标题：有角色时显示角色名，否则显示默认 */
const roleTitle = computed(() => role.value?.name || '芋道 AI')

/** 欢迎语 */
const welcomeMessage = computed(() => role.value?.welcomeMessage || '')

/** 角色描述（能做什么） */
const roleDescription = computed(() => role.value?.description || '')

/** prompt 列表：优先使用角色描述提炼，当前保持默认 */
const promptList = computed(() => defaultPromptList)

/** 加载角色信息 */
const loadRole = async () => {
  const roleId = props.conversation?.roleId
  if (!roleId) {
    role.value = null
    return
  }
  try {
    role.value = await ChatRoleApi.getChatRole(roleId)
  } catch {
    role.value = null
  }
}

/** 选中 prompt 点击 */
const handlerPromptClick = ({ prompt }: { prompt: string }) => {
  emits('onPrompt', prompt)
}

watch(
  () => props.conversation?.roleId,
  () => loadRole(),
  { immediate: true }
)
</script>
