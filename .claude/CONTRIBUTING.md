# Contributing Guidelines

## Code Style

### NO EMOJI POLICY

**IMPORTANT: Emojis are strictly prohibited in all code, comments, and commit messages.**

#### Rationale
- Emojis can cause encoding issues across different systems
- They reduce code readability and professionalism
- They may not render consistently across all terminals and editors
- They complicate code searching and grep operations

#### Examples

BAD:
```javascript
console.log('Loading data...');
console.log('Success!');
alert('Error occurred');
```

GOOD:
```javascript
console.log('[INFO] Loading data...');
console.log('[SUCCESS] Data loaded');
alert('[ERROR] Failed to load data');
```

#### Alternatives

Use text-based prefixes instead:
- `[INFO]` instead of informational emojis
- `[SUCCESS]` or `[OK]` instead of checkmarks
- `[ERROR]` or `[FAIL]` instead of crosses/warnings
- `[DEBUG]` for debugging messages
- `[WARNING]` for warnings

### Commit Messages

- NO emojis in commit messages
- Use conventional commits format: `type: description`
- Examples:
  - `feat: add user authentication`
  - `fix: resolve mobile layout issue`
  - `refactor: improve responsive design`
  - `docs: update setup instructions`

### Code Comments

- Write comments in English
- Be concise and clear
- Avoid redundant comments
- Document WHY, not WHAT

### AI Agent Instructions

When working with AI coding assistants (Claude, Copilot, etc.):
- Explicitly instruct: "Do not use emojis in any generated code or messages"
- Request plain text alternatives
- Review AI-generated code for emoji usage before committing

## Mobile Responsive Design

- Always test on mobile devices (or browser dev tools)
- Use responsive breakpoints:
  - Desktop: > 1024px
  - Tablet: 768px - 1024px
  - Mobile: < 768px
  - Small mobile: < 480px
- Prefer `clamp()`, `min()`, `max()` for fluid typography
- Use viewport units (`vw`, `vh`) carefully with fallbacks

## Firebase Configuration

- Never commit actual Firebase credentials to git
- Use `firebase-config.example.js` as template
- Copy to `firebase-config.js` for local development
- For deployment, use environment variables or deployment-specific config

## Testing

- Test authentication flow completely
- Verify data persistence across sessions
- Check mobile responsiveness at all breakpoints
- Test on different browsers (Chrome, Firefox, Safari)

---

Last updated: 2025-11-09
