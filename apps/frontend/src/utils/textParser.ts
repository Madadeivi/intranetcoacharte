import React from 'react';

// Tipo para las partes parseadas del texto
export type ParsedPart = { type: 'text' | 'bold' | 'br'; content: string };

/**
 * Parsea texto con formato markdown básico (**negrita**) y saltos de línea a JSX
 * @param text - El texto a parsear
 * @returns Array de elementos React
 */
export function parseBoldAndBreaks(text: string): React.ReactNode[] {
  const parts: ParsedPart[] = [];
  let buffer = '';
  let i = 0;
  
  while (i < text.length) {
    if (text[i] === '\\' && text[i + 1] === 'n') {
      if (buffer) parts.push({ type: 'text', content: buffer });
      parts.push({ type: 'br', content: '' });
      buffer = '';
      i += 2;
    } else if (text[i] === '\n') {
      if (buffer) parts.push({ type: 'text', content: buffer });
      parts.push({ type: 'br', content: '' });
      buffer = '';
      i++;
    } else if (text[i] === '*' && text[i + 1] === '*') {
      // Detectar inicio de negrita
      if (buffer) parts.push({ type: 'text', content: buffer });
      buffer = '';
      i += 2;
      let boldText = '';
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '*')) {
        boldText += text[i];
        i++;
      }
      if (i < text.length) i += 2; // Saltar cierre **
      parts.push({ type: 'bold', content: boldText });
    } else {
      buffer += text[i];
      i++;
    }
  }
  
  if (buffer) parts.push({ type: 'text', content: buffer });
  
  // Convertir a JSX
  return parts.map((part, idx) => {
    if (part.type === 'bold') return React.createElement('strong', { key: idx }, part.content);
    if (part.type === 'br') return React.createElement('br', { key: idx });
    return React.createElement(React.Fragment, { key: idx }, part.content);
  });
}