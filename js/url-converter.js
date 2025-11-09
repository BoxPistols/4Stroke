// URL to Markdown Converter Utility

/**
 * Detect if text contains URLs
 * @param {string} text
 * @returns {string[]} Array of URLs found
 */
export function detectURLs(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Fetch metadata from URL using a CORS-friendly service
 * @param {string} url
 * @returns {Promise<{title: string, description: string, image: string}>}
 */
export async function fetchURLMetadata(url) {
  try {
    // Using unfurl.io API (free, CORS-friendly)
    const apiUrl = `https://unfurl.io/api/v1/unfurl?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      title: data.title || extractTitleFromURL(url),
      description: data.description || '',
      image: data.image || '',
    };
  } catch (error) {
    console.warn('[URL Converter] Failed to fetch metadata:', error);
    // Fallback to extracting title from URL
    return {
      title: extractTitleFromURL(url),
      description: '',
      image: '',
    };
  }
}

/**
 * Extract a readable title from URL
 * @param {string} url
 * @returns {string}
 */
export function extractTitleFromURL(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const pathname = urlObj.pathname.replace(/\/$/, '');

    if (pathname && pathname !== '/') {
      // Use the last segment of the path
      const segments = pathname.split('/').filter(s => s);
      const lastSegment = segments[segments.length - 1];

      // Clean up the segment (remove extension, replace hyphens/underscores)
      return lastSegment
        .replace(/\.[^.]+$/, '') // Remove extension
        .replace(/[-_]/g, ' ')    // Replace hyphens and underscores with spaces
        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
    }

    // Use hostname as fallback
    return hostname;
  } catch (error) {
    return url;
  }
}

/**
 * Convert URL to Markdown format
 * @param {string} url
 * @param {string} title
 * @returns {string}
 */
export function urlToMarkdown(url, title) {
  return `[${title}](${url})`;
}

/**
 * Process pasted text and convert URLs to Markdown
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function processPastedText(text) {
  const urls = detectURLs(text);

  if (urls.length === 0) {
    return text; // No URLs found, return original text
  }

  let processedText = text;

  for (const url of urls) {
    try {
      const metadata = await fetchURLMetadata(url);
      const markdown = urlToMarkdown(url, metadata.title);
      processedText = processedText.replace(url, markdown);
    } catch (error) {
      console.warn('[URL Converter] Error processing URL:', url, error);
      // Keep original URL if processing fails
    }
  }

  return processedText;
}

/**
 * Simpler synchronous version using URL extraction only
 * @param {string} text
 * @returns {string}
 */
export function processPastedTextSync(text) {
  const urls = detectURLs(text);

  if (urls.length === 0) {
    return text;
  }

  let processedText = text;

  for (const url of urls) {
    const title = extractTitleFromURL(url);
    const markdown = urlToMarkdown(url, title);
    processedText = processedText.replace(url, markdown);
  }

  return processedText;
}
