// utils/sanitize.js
import sanitizeHtml from "sanitize-html";
import { convert } from "html-to-text";

// Enhanced sanitization options to preserve rich text features from ReactQuill
export const sanitizeOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "p", "a", "ul", "ol", "li",
    "b", "i", "strong", "em", "strike", "u", "s",
    "code", "pre", "img", "table", "thead", "tbody", "tr", "td", "th",
    "span", "div", "br"
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": [
      "class", "id", "data-*", "style", 
      "align" // allows text alignment
    ]
  },
  // Allow inline CSS for basic formatting safely
  allowedStyles: {
    "*": {
      // font formatting
      "font-family": [/^[a-zA-Z0-9,\s\-"'!]+$/],
      "font-size": [/^\d+(?:px|em|rem|%)$/],
      "color": [/^#[0-9A-Fa-f]{3,6}$|^rgb\([^)]+\)$|^rgba\([^)]+\)$/],
      "background-color": [/^#[0-9A-Fa-f]{3,6}$|^rgb\([^)]+\)$|^rgba\([^)]+\)$/],
      "text-align": [/^(left|right|center|justify)$/],
      "text-decoration": [/^(none|underline|line-through|overline)$/],
      "font-weight": [/^(normal|bold|[1-9]00)$/],
      "font-style": [/^(normal|italic|oblique)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  allowedSchemesByTag: {},
  selfClosing: ["img", "br", "hr"],
  parser: { lowerCaseAttributeNames: false },
};

export function sanitizeAndExtract(html) {
  const safeHtml = sanitizeHtml(html || "", sanitizeOptions);
  const plainText = convert(safeHtml, {
    wordwrap: false,
    selectors: [{ selector: "img", format: "skip" }],
  });
  return { clean: safeHtml, plainText };
}
