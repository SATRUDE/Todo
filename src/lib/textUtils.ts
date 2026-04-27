import React from 'react';

/**
 * Converts URLs in text to clickable links
 * @param text The text that may contain URLs
 * @returns React node with clickable links for URLs
 */
export function linkifyText(text: string): React.ReactNode {
  // URL regex pattern - matches http://, https://, www., or common domain patterns
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Extract the URL and strip trailing punctuation that's not part of the URL
    const rawMatch = match[0];
    const displayUrl = rawMatch.replace(/[.,;:!?)\]>]+$/, '');

    // Add protocol if missing
    const href = displayUrl.startsWith('http://') || displayUrl.startsWith('https://')
      ? displayUrl
      : 'https://' + displayUrl;

    // Create clickable link
    parts.push(
      React.createElement(
        'a',
        {
          key: match.index,
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-[#5b5d62] underline break-all',
          style: { textDecoration: 'underline', color: '#5b5d62' },
          onClick: (e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()
        },
        displayUrl
      )
    );

    lastIndex = match.index + rawMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  // If no URLs were found, return original text
  if (parts.length === 0 || (parts.length === 1 && typeof parts[0] === 'string' && parts[0] === text)) {
    return text;
  }
  
  return React.createElement(React.Fragment, null, ...parts);
}

