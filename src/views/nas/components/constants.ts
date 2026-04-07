import type { NasMountType, NasType } from '@/api/nas/nas'

export type FormMode = 'create' | 'update'
export type PermissionTargetType = 0 | 1 | 100
export type FileBrowserBreadcrumb = {
  label: string
  path: string
}

export const ADMIN_NAS_TYPE: NasType = 'admin'
export const USER_TARGET_TYPE: PermissionTargetType = 0
export const DEPT_TARGET_TYPE: PermissionTargetType = 1
export const ENTERPRISE_TARGET_TYPE: PermissionTargetType = 100
export const ENTERPRISE_TARGET_ID = 0

export const MOUNT_TYPE_OPTIONS: NasMountType[] = ['SMB2', 'SMB3', 'CIFS2', 'CIFS3', 'FTP', 'NFS']

export const TARGET_TYPE_OPTIONS = [
  { label: '用户', value: USER_TARGET_TYPE },
  { label: '部门', value: DEPT_TARGET_TYPE },
  { label: '企业', value: ENTERPRISE_TARGET_TYPE }
]

export const TARGET_TYPE_LABELS: Record<number, string> = {
  [USER_TARGET_TYPE]: '用户',
  [DEPT_TARGET_TYPE]: '部门',
  [ENTERPRISE_TARGET_TYPE]: '企业'
}

export const PERMISSION_BIT_OPTIONS = [
  { label: '查看目录', value: 1 },
  { label: '重命名', value: 4 },
  { label: '查看文件', value: 8 },
  { label: '修改', value: 16 },
  { label: '上传', value: 32 },
  { label: '下载', value: 64 },
  { label: '删除', value: 128 },
  { label: '分享', value: 256 },
  { label: '在线预览', value: 512 },
  { label: '在线编辑', value: 1024 },
  { label: '授权', value: 1073741824 }
]
