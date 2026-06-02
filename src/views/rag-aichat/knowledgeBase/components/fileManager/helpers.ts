import type { FileItem, FileType, SortBy, SortDirection } from './types'

export const FILE_TYPE_OPTIONS: Array<{ label: string; value: FileType | 'all' }> = [
  { label: '全部类型', value: 'all' },
  { label: '文件夹', value: 'folder' },
  { label: 'PDF', value: 'pdf' },
  { label: 'Word', value: 'doc' },
  { label: 'Excel', value: 'xls' },
  { label: 'PPT', value: 'ppt' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '音频', value: 'audio' },
  { label: '压缩包', value: 'zip' },
  { label: '代码', value: 'code' },
  { label: '其他', value: 'unknown' }
]

export const SORT_OPTIONS: Array<{ label: string; value: SortBy }> = [
  { label: '按名称', value: 'name' },
  { label: '按类型', value: 'type' },
  { label: '按更新时间', value: 'updatedAt' },
  { label: '按大小', value: 'size' }
]

export const getFileTypeLabel = (type: FileType) => {
  const option = FILE_TYPE_OPTIONS.find((item) => item.value === type)
  return option?.label || '其他'
}

export const formatFileSize = (size: number | null) => {
  if (!size || Number.isNaN(size)) return '--'
  if (size >= 1024 * 1024 * 1024) return `${(size / (1024 * 1024 * 1024)).toFixed(2)}G`
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)}M`
  if (size >= 1024) return `${(size / 1024).toFixed(2)}KB`
  return `${size}B`
}

export const formatDateTime = (value: string) => {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 19)
}

export const sortFiles = (files: FileItem[], sortBy: SortBy, sortDirection: SortDirection) => {
  const factor = sortDirection === 'asc' ? 1 : -1
  return [...files].sort((a, b) => {
    if (sortBy === 'size') {
      const va = a.size || 0
      const vb = b.size || 0
      return (va - vb) * factor
    }
    if (sortBy === 'updatedAt') {
      const va = new Date(a.updatedAt || 0).getTime()
      const vb = new Date(b.updatedAt || 0).getTime()
      return (va - vb) * factor
    }
    const va = String(a[sortBy] || '').toLowerCase()
    const vb = String(b[sortBy] || '').toLowerCase()
    return va.localeCompare(vb) * factor
  })
}
