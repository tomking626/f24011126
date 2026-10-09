import request from '@/utils/request'

export function pageBusinessFacts(params) {
  return request({ url: '/business-facts/page', method: 'get', params })
}

export function myBusinessFacts(params) {
  return request({ url: '/business-facts/mine', method: 'get', params })
}

export function getBusinessFact(id) {
  return request({ url: `/business-facts/${id}`, method: 'get' })
}

export function createBusinessFact(data) {
  return request({ url: '/business-facts', method: 'post', data })
}

export function updateBusinessFact(data) {
  return request({ url: '/business-facts', method: 'put', data })
}

export function deleteBusinessFact(id) {
  return request({ url: `/business-facts/${id}`, method: 'delete' })
}

export function submitBusinessFact(id) {
  return request({ url: `/business-facts/${id}/submit`, method: 'put' })
}

export function cancelBusinessFact(id) {
  return request({ url: `/business-facts/${id}/cancel`, method: 'put' })
}
