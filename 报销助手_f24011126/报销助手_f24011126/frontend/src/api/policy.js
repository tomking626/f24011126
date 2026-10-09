import request from '@/utils/request'

export function listActivePolicies() {
  return request({ url: '/policies/list', method: 'get' })
}

export function pagePolicies(params) {
  return request({ url: '/policies/page', method: 'get', params })
}

export function getPolicy(id) {
  return request({ url: `/policies/${id}`, method: 'get' })
}

export function createPolicy(data) {
  return request({ url: '/policies', method: 'post', data })
}

export function updatePolicy(data) {
  return request({ url: '/policies', method: 'put', data })
}

export function deletePolicy(id) {
  return request({ url: `/policies/${id}`, method: 'delete' })
}

export function togglePolicyStatus(id, status) {
  return request({ url: `/policies/${id}/status`, method: 'put', params: { status } })
}
