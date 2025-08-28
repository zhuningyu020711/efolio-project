// Simple XSS-safe sanitizer for this coursework demo
export function sanitize(input) {
    if (typeof input !== 'string') return ''
    const noTags = input
    .replace(/<\/?[^>]+>/g, '') // strip tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }
    return noTags.replace(/[&<>"']/g, m => map[m])
    }