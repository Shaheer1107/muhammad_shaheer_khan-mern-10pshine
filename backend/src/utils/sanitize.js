// utils/sanitize.js
import sanitizeHtml from 'sanitize-html';
import { convert } from 'html-to-text';

export const sanitizeOptions = {
  allowedTags: [
    'h1','h2','h3','h4','h5','h6',
    'blockquote','p','a','ul','ol','li',
    'b','i','strong','em','strike','code','pre',
    'img','table','thead','tbody','tr','td','th'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['class', 'id', 'data-*']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data']
};

export function sanitizeAndExtract(html) {
  const safeHtml = sanitizeHtml(html || '', sanitizeOptions);
  const plainText = convert(safeHtml, {
    wordwrap: false,
    selectors: [{ selector: 'img', format: 'skip' }]
  });
  return { clean: safeHtml, plainText };
}
