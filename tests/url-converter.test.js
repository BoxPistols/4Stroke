import { describe, it, expect } from 'vitest';
import {
  detectURLs,
  extractTitleFromURL,
  urlToMarkdown,
  processPastedTextSync,
} from '../js/url-converter.js';

describe('URL Converter', () => {
  describe('detectURLs', () => {
    it('should detect single HTTP URL', () => {
      const text = 'Check this out: http://example.com';
      const urls = detectURLs(text);
      expect(urls).toEqual(['http://example.com']);
    });

    it('should detect single HTTPS URL', () => {
      const text = 'Check this out: https://example.com';
      const urls = detectURLs(text);
      expect(urls).toEqual(['https://example.com']);
    });

    it('should detect multiple URLs', () => {
      const text = 'Visit https://example.com and http://test.com';
      const urls = detectURLs(text);
      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://example.com');
      expect(urls).toContain('http://test.com');
    });

    it('should return empty array when no URLs found', () => {
      const text = 'No URLs here';
      const urls = detectURLs(text);
      expect(urls).toEqual([]);
    });

    it('should detect URLs with paths', () => {
      const text = 'Read https://example.com/blog/post-title';
      const urls = detectURLs(text);
      expect(urls).toEqual(['https://example.com/blog/post-title']);
    });

    it('should detect URLs with query parameters', () => {
      const text = 'Search https://example.com/search?q=test&lang=en';
      const urls = detectURLs(text);
      expect(urls).toEqual(['https://example.com/search?q=test&lang=en']);
    });
  });

  describe('extractTitleFromURL', () => {
    it('should extract title from URL with path', () => {
      const url = 'https://example.com/blog/my-awesome-post';
      const title = extractTitleFromURL(url);
      expect(title).toBe('My Awesome Post');
    });

    it('should remove file extensions', () => {
      const url = 'https://example.com/documents/report.pdf';
      const title = extractTitleFromURL(url);
      expect(title).toBe('Report');
    });

    it('should replace hyphens and underscores with spaces', () => {
      const url = 'https://example.com/my_cool-article';
      const title = extractTitleFromURL(url);
      expect(title).toBe('My Cool Article');
    });

    it('should use hostname when no path', () => {
      const url = 'https://example.com';
      const title = extractTitleFromURL(url);
      expect(title).toBe('example.com');
    });

    it('should use hostname when path is just slash', () => {
      const url = 'https://example.com/';
      const title = extractTitleFromURL(url);
      expect(title).toBe('example.com');
    });

    it('should remove www prefix from hostname', () => {
      const url = 'https://www.example.com';
      const title = extractTitleFromURL(url);
      expect(title).toBe('example.com');
    });

    it('should capitalize words', () => {
      const url = 'https://example.com/hello-world';
      const title = extractTitleFromURL(url);
      expect(title).toBe('Hello World');
    });

    it('should use last path segment', () => {
      const url = 'https://example.com/blog/2024/01/my-post';
      const title = extractTitleFromURL(url);
      expect(title).toBe('My Post');
    });
  });

  describe('urlToMarkdown', () => {
    it('should convert URL and title to Markdown format', () => {
      const url = 'https://example.com';
      const title = 'Example Site';
      const markdown = urlToMarkdown(url, title);
      expect(markdown).toBe('[Example Site](https://example.com)');
    });

    it('should handle special characters in title', () => {
      const url = 'https://example.com';
      const title = 'Example & Test';
      const markdown = urlToMarkdown(url, title);
      expect(markdown).toBe('[Example & Test](https://example.com)');
    });

    it('should handle URLs with query parameters', () => {
      const url = 'https://example.com/search?q=test';
      const title = 'Search Results';
      const markdown = urlToMarkdown(url, title);
      expect(markdown).toBe('[Search Results](https://example.com/search?q=test)');
    });
  });

  describe('processPastedTextSync', () => {
    it('should convert single URL to Markdown', () => {
      const text = 'Check out https://example.com/my-article';
      const result = processPastedTextSync(text);
      expect(result).toContain('[');
      expect(result).toContain('](https://example.com/my-article)');
    });

    it('should convert multiple URLs to Markdown', () => {
      const text = 'Visit https://example.com and https://test.com/page';
      const result = processPastedTextSync(text);
      expect(result).toContain('[');
      expect(result).toContain('](https://example.com)');
      expect(result).toContain('](https://test.com/page)');
    });

    it('should preserve text without URLs', () => {
      const text = 'Just plain text without any links';
      const result = processPastedTextSync(text);
      expect(result).toBe(text);
    });

    it('should preserve surrounding text', () => {
      const text = 'Before https://example.com/article after';
      const result = processPastedTextSync(text);
      expect(result).toContain('Before');
      expect(result).toContain('after');
      expect(result).toContain('[');
      expect(result).toContain(']');
    });

    it('should handle mixed content', () => {
      const text = 'Text with https://example.com/post and more text';
      const result = processPastedTextSync(text);
      expect(result).toContain('Text with');
      expect(result).toContain('and more text');
      expect(result).toContain('[');
    });

    it('should handle URLs at start of text', () => {
      const text = 'https://example.com is a website';
      const result = processPastedTextSync(text);
      expect(result).toMatch(/^\[/);
      expect(result).toContain('is a website');
    });

    it('should handle URLs at end of text', () => {
      const text = 'Visit https://example.com';
      const result = processPastedTextSync(text);
      expect(result).toContain('Visit');
      expect(result).toMatch(/\)$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = processPastedTextSync('');
      expect(result).toBe('');
    });

    it('should handle URLs with fragments', () => {
      const text = 'https://example.com/page#section';
      const result = processPastedTextSync(text);
      expect(result).toContain('](https://example.com/page#section)');
    });

    it('should handle URLs with ports', () => {
      const text = 'http://localhost:3000/page';
      const result = processPastedTextSync(text);
      expect(result).toContain('](http://localhost:3000/page)');
    });

    it('should handle GitHub URLs', () => {
      const text = 'https://github.com/user/repo/issues/123';
      const result = processPastedTextSync(text);
      expect(result).toContain('[');
      expect(result).toContain('123');
    });

    it('should handle URLs with multiple dashes', () => {
      const text = 'https://example.com/my-very-long-article-title';
      const result = processPastedTextSync(text);
      expect(result).toContain('My Very Long Article Title');
    });
  });
});
