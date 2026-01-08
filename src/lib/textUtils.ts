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
    
    // Extract the URL
    let url = match[0];
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.startsWith('www.')) {
        url = 'https://' + url;
      } else {
        url = 'https://' + url;
      }
    }
    
    // Create clickable link
    parts.push(
      React.createElement(
        'a',
        {
          key: match.index,
          href: url,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-[#5b5d62] underline break-all',
          style: { textDecoration: 'underline', color: '#5b5d62' },
          onClick: (e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()
        },
        match[0]
      )
    );
    
    lastIndex = match.index + match[0].length;
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

