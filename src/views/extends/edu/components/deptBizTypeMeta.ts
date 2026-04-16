import { DICT_TYPE, getDictLabel } from '@/utils/dict'

type DeptBizTagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

type DeptBizTypeMeta = {
  icon: string
  tagType: DeptBizTagType
}

const DEFAULT_META: DeptBizTypeMeta = {
  icon: 'ep:office-building',
  tagType: 'info'
}

const META_MAP: Record<string, DeptBizTypeMeta> = {
  school: {
    icon: 'mdi:school-outline',
    tagType: 'primary'
  },
  campus: {
    icon: 'mdi:map-marker-radius-outline',
    tagType: 'success'
  },
  department: {
    icon: 'mdi:domain',
    tagType: 'warning'
  },
  grade: {
    icon: 'mdi:stairs',
    tagType: 'danger'
  },
  class: {
    icon: 'mdi:google-classroom',
    tagType: 'info'
  }
}

export const getDeptBizTypeMeta = (bizType?: string) => {
  const key = (bizType ?? '').trim()
  const meta = META_MAP[key] || DEFAULT_META
  return {
    ...meta,
    label: key ? getDictLabel(DICT_TYPE.EDU_DEPT_BIZ_TYPE, key) || key : '未配置'
  }
}
