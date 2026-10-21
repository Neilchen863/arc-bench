// Minimal allow-list sanitizer for rich-text HTML coming from the contenteditable editor.
const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'CODE', 'PRE', 'DIV', 'SPAN', 'A']);

export function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const walk = node => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 1) {
        if (!ALLOWED.has(child.tagName)) {
          if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(child.tagName)) { child.remove(); continue; }
          walk(child);
          child.replaceWith(...child.childNodes);
          continue;
        }
        for (const attr of [...child.attributes]) {
          const keep = child.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:|\/)/i.test(attr.value);
          if (!keep) child.removeAttribute(attr.name);
        }
        walk(child);
      } else if (child.nodeType !== 3) {
        child.remove();
      }
    }
  };
  const root = doc.body.firstChild;
  walk(root);
  return root.innerHTML;
}

export function toPlainText(html) {
  // Separate block-level content with spaces so excerpts do not glue lines together.
  const spaced = (html || '').replace(/<br\s*\/?>|<\/(p|div|li|h[2-4]|blockquote|pre)>/gi, m => `${m} `);
  const doc = new DOMParser().parseFromString(`<div>${spaced}</div>`, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
