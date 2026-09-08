import { get, post } from './client.js'

/**
 * @param {string} url
 * @param {File|Blob} file
 * @param {string} [fieldName='file']
 * @param {Record<string, *>} [extraData={}]
 * @param {import('axios').AxiosRequestConfig & import('./types.js').RequestOptions} [options={]}
 */
export function uploadFile(url, file, fieldName = 'file', extraData = {}, options = {}) {
  const formData = new FormData()
  Object.entries(extraData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  })
  formData.append(fieldName, file)

  return post(url, formData, {
    ...options,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(options.headers || {})
    }
  })
}

/**
 * @param {string} url
 * @param {string} [filename]
 * @param {import('axios').AxiosRequestConfig & import('./types.js').RequestOptions} [options={}]
 */
export async function downloadFile(url, filename, options = {}) {
  const blob = await get(url, {
    ...options,
    responseType: 'blob',
    loading: options.loading ?? true,
    loadingText: options.loadingText || '下载中...'
  })

  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
  return blob
}

/**
 * @param {import('axios').AxiosResponse} response
 * @param {string} [filename]
 */
export function saveBlobResponse(response, filename) {
  const disposition = response.headers?.['content-disposition'] || ''
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
  const name = filename || (match ? decodeURIComponent(match[1]) : 'download')
  const blob = response.data
  const blobUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(blobUrl)
}
