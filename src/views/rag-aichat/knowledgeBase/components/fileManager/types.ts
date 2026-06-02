export type FileType =
  | 'folder'
  | 'pdf'
  | 'doc'
  | 'xls'
  | 'ppt'
  | 'image'
  | 'video'
  | 'audio'
  | 'zip'
  | 'code'
  | 'unknown'

export type ViewMode = 'grid' | 'list'
export type SortBy = 'name' | 'type' | 'updatedAt' | 'size'
export type SortDirection = 'asc' | 'desc'

export interface FileItem {
  id: string
  name: string
  type: FileType
  size: number | null
  updatedAt: string
  owner?: string
  path: string[]
  thumbnailUrl?: string
  raw: any
  isLocal?: boolean
}
