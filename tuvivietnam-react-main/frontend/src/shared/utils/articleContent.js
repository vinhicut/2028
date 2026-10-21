export function parseArticleContent(content = '') {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* Older articles are stored as plain text. */ }
  return String(content).split(/\n\s*\n/).filter(Boolean).map((text) => {
    const value = text.trim();
    return value.startsWith('## ')
      ? { type: 'heading', text: value.slice(3) }
      : { type: 'text', text: value, align: 'left', font: 'Georgia, serif', color: '#3f3933' };
  });
}

export function serializeArticleContent(blocks) {
  // Keep empty paragraphs in the editor model so inserting an image never
  // removes the text area the author is currently using.
  return JSON.stringify(blocks.filter((block) => block.type !== 'image' || block.src));
}

export function hasRichText(html = '') {
  return String(html).replace(/<br\s*\/?\s*>/gi, '').replace(/&nbsp;/gi, '').replace(/<[^>]*>/g, '').trim().length > 0;
}

export function escapeRichText(value = '') {
  value = String(value);
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sanitizeRichText(html = '') {
  if (typeof DOMParser === 'undefined') return escapeRichText(String(html));
  const parsed = new DOMParser().parseFromString(String(html), 'text/html');
  const clean = (node) => [...node.childNodes].map((child) => {
    if (child.nodeType === Node.TEXT_NODE) return escapeRichText(child.textContent || '');
    if (child.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = child.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'iframe' || tag === 'object') return '';
    const inner = clean(child);
    if (tag === 'br') return '<br>';
    if (tag === 'div' || tag === 'p') return `${inner}<br>`;
    if (['b', 'strong', 'i', 'em', 'u'].includes(tag)) return `<${tag}>${inner}</${tag}>`;
    if (tag === 'span') {
      const color = child.style.color;
      const fontSize = child.style.fontSize;
      const safeColor = /^#[0-9a-f]{6}$/i.test(color) || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(color);
      const safeFontSize = /^(12|14|16|18|20|24|28|32|36)px$/.test(fontSize);
      const styles = [safeColor && `color:${color}`, safeFontSize && `font-size:${fontSize}`].filter(Boolean);
      return styles.length ? `<span style="${styles.join(';')}">${inner}</span>` : inner;
    }
    if (tag === 'font') {
      const color = child.getAttribute('color') || '';
      return (/^#[0-9a-f]{6}$/i.test(color) || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(color)) ? `<span style="color:${color}">${inner}</span>` : inner;
    }
    return inner;
  }).join('');
  return clean(parsed.body);
}
