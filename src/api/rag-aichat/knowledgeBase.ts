import request from '@/config/axios'

export interface KnowledgeBaseVO {
  id: string
  name: string
  description?: string
  dataset_name?: string
  chunk_count?: number
  document_count?: number
  [key: string]: any
}

export interface KnowledgeBaseDeptVO {
  id: number
  name: string
  parentId: number
  [key: string]: any
}

export interface KnowledgeBaseMemberVO {
  userId: number
  userName: string
  realName: string
  deptName: string
  [key: string]: any
}

export interface KnowledgeBaseUserVO {
  id: number
  username: string
  nickname: string
  deptId?: number
  deptName?: string
  [key: string]: any
}

export interface KnowledgeBaseMemberAddReqVO {
  userName: string
  realName: string
}

export function getKnowledgeBaseList(params: {
  dataset_name?: string
  dataset_id?: string
}) {
  return request.get({
    url: '/ragflow/datasets/listAllView',
    params
  })
}

export function getKnowledgeBaseDetail(datasetId: string) {
  return request.get({
    url: `/ragflow/datasets/get/${datasetId}`,
  })
}

export function getKnowledgeBaseListByMe(params: {
  dataset_name?: string
  dataset_id?: string
}) {
  return request.get({
    url: '/ragflow/datasets/listByMe',
    params
  })
}

export function getKnowledgeBaseListInvite(params: {
  dataset_name?: string
  dataset_id?: string
}) {
  return request.get({
    url: '/ragflow/datasets/listInvite',
    params
  })
}

export function createKnowledgeBase(data: Record<string, any>) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(data))
  return request.post({
    url: '/ragflow/datasets/create',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateKnowledgeBase(
  datasetId: string,
  data: Record<string, any>
) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(data))
  return request.post({
    url: `/ragflow/datasets/update/${datasetId}`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function deleteKnowledgeBase(datasetId: string) {
  return request.post({
    url: '/ragflow/datasets/delete',
    params: { datasetIds: datasetId }
  })
}

export function getMemberList(datasetId: string) {
  return request.get<KnowledgeBaseMemberVO[]>({
    url: `/ragflow/datasets/listMember/${datasetId}`,
  })
}

export function addMember(datasetId: string, users: KnowledgeBaseMemberAddReqVO[]) {
  return request.post({
    url: `/ragflow/datasets/addMember/${datasetId}`,
    data: users
  })
}

export function deleteMember(datasetId: string, userIds: string) {
  return request.post({
    url: `/ragflow/datasets/deleteMember/${datasetId}`,
    params: { userIds }
  })
}

export function getDeptList() {
  return request.get<KnowledgeBaseDeptVO[]>({
    url: '/ragflow/datasets/listDept'
  })
}

export function getUserList(params: { di: number }) {
  return request.get<KnowledgeBaseUserVO[]>({
    url: '/ragflow/datasets/listUser',
    params
  })
}
