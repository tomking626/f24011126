import request from '@/utils/request'

export function myDocuments(params) {
  return request({ url: '/documents/my', method: 'get', params })
}

export function pageDocuments(params) {
  return request({ url: '/documents/page', method: 'get', params })
}

export function getDocument(id) {
  return request({ url: `/documents/${id}`, method: 'get' })
}

export function createDocument(data) {
  return request({ url: '/documents', method: 'post', data })
}

export function updateDocument(data) {
  return request({ url: '/documents', method: 'put', data })
}

export function submitDocument(id) {
  return request({ url: `/documents/${id}/submit`, method: 'put' })
}

export function reviewDocument(id, status, remark) {
  return request({
    url: `/documents/${id}/review`,
    method: 'put',
    params: { status, remark }
  })
}
