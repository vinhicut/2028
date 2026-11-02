import React from 'react';
import { parseArticleContent, sanitizeRichText } from '../utils/articleContent';
import './ArticleBody.css';

export default function ArticleBody({ content }) {
  return <div className="dharma-content">{parseArticleContent(content).map((block, index) => {
    if (block.type === 'image') return <figure className="dharma-inline-image" key={index}><img src={block.src} alt={block.alt || ''} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
    const requestedFont = String(block.font || '').trim();
    const fontFamily = /^(Georgia|['\"]?Times New Roman)/i.test(requestedFont)
      ? "'Be Vietnam Pro', Arial, sans-serif"
      : requestedFont || "'Be Vietnam Pro', Arial, sans-serif";
    const textStyle = { textAlign: block.align || 'left', fontFamily, fontSize: block.fontSize ? `${block.fontSize}px` : undefined, color: block.color || '#3f3933', fontWeight: block.bold ? 700 : 400, fontStyle: block.italic ? 'italic' : 'normal', textDecoration: block.underline ? 'underline' : 'none', columnCount: block.type === 'text' ? Number(block.columns || 1) : 1, columnGap: '2em' };
    if (block.type === 'heading') return <h2 key={index} style={textStyle}>{block.text}</h2>;
    return block.html
      ? <p key={index} style={textStyle} dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.html) }} />
      : <p key={index} style={textStyle}>{block.text}</p>;
  })}</div>;
}
