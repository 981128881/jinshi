/** 标签按文案哈希取色，同标签颜色稳定 */
const TAG_TONES = [
  { color: '#5f7f55', bg: 'rgba(136, 168, 123, 0.18)' },
  { color: '#c47d0a', bg: 'rgba(243, 156, 18, 0.16)' },
  { color: '#2a7ab8', bg: 'rgba(52, 152, 219, 0.14)' },
  { color: '#7a4fad', bg: 'rgba(155, 89, 182, 0.14)' },
  { color: '#c0392b', bg: 'rgba(231, 76, 60, 0.12)' },
  { color: '#0e8f7a', bg: 'rgba(26, 188, 156, 0.14)' },
  { color: '#d35400', bg: 'rgba(230, 126, 34, 0.14)' },
  { color: '#34495e', bg: 'rgba(52, 73, 94, 0.12)' }
]

function hashTag(tag) {
  const s = String(tag || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** @param {string} tag */
export function tagColorStyle(tag) {
  const tone = TAG_TONES[hashTag(tag) % TAG_TONES.length]
  return {
    color: tone.color,
    backgroundColor: tone.bg
  }
}
