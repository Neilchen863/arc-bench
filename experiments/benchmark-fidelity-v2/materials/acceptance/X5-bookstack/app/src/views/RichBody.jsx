import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useId, useRef } from 'react';

const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'BR', 'DIV', 'P', 'UL', 'OL', 'LI']);

// Keep only simple formatting tags (no attributes) so stored HTML is safe to render.
export function sanitize(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const clean = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!ALLOWED.has(child.tagName)) { child.replaceWith(...child.childNodes); clean(node); return; }
        for (const a of [...child.attributes]) child.removeAttribute(a.name);
        clean(child);
      } else if (child.nodeType !== Node.TEXT_NODE) child.remove();
    }
  };
  const root = doc.body.firstChild;
  clean(root);
  return root.innerHTML;
}

// Plain-text bodies from older pages are shown with their line breaks.
export const toHtml = (body) => (/<[a-z][\s\S]*>/i.test(body || '')
  ? sanitize(body)
  : (body || '').split('\n').map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>'));

// Rich-text page body: a contenteditable surface with a small formatting toolbar.
export default function RichBody({ value, onChange }) {
  const ref = useRef(null);
  const labelId = useId();
  useEffect(() => { ref.current.innerHTML = toHtml(value); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cmd = (name) => { ref.current.focus(); document.execCommand(name); onChange(sanitize(ref.current.innerHTML)); };
  return (
    <Box>
      <Typography id={labelId} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Page content</Typography>
      <Box sx={{ border: '1px solid rgba(0,0,0,.23)', borderRadius: 1 }}>
        <Stack direction="row" role="toolbar" aria-label="Formatting" sx={{ borderBottom: '1px solid rgba(0,0,0,.12)', px: 0.5 }}>
          <Tooltip title="Bold"><IconButton size="small" aria-label="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('bold')}><b>B</b></IconButton></Tooltip>
          <Tooltip title="Italic"><IconButton size="small" aria-label="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('italic')}><i>I</i></IconButton></Tooltip>
          <Tooltip title="Bulleted list"><IconButton size="small" aria-label="Bulleted list" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('insertUnorderedList')}>•≡</IconButton></Tooltip>
        </Stack>
        <Box
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          onInput={() => onChange(sanitize(ref.current.innerHTML))}
          sx={{ minHeight: 280, p: 1.5, outline: 'none', '&:focus': { boxShadow: 'inset 0 0 0 2px #1976d2' } }}
        />
      </Box>
    </Box>
  );
}
