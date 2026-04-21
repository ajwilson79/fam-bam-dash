# Contributing to Fam Bam Dash

Thanks for your interest in contributing! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/fam-bam-dash.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit with clear messages
7. Push and create a Pull Request

## 📝 Development Setup

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

Quick start:
```bash
cd app
npm install
cp .env.local.example .env.local
npm run dev
```

## 🎯 What to Contribute

### Ideas for Contributions

- New widgets (news, stocks, sports scores, etc.)
- UI/UX improvements
- Performance optimizations
- Bug fixes
- Documentation improvements
- Accessibility enhancements
- Internationalization (i18n)
- New themes or customization options
- Mobile responsiveness improvements
- Test coverage

### Widget Ideas

- News headlines
- Stock ticker
- Sports scores
- Traffic/commute info
- Cryptocurrency prices
- Smart home device status
- Spotify now playing
- RSS feed reader
- Countdown timers
- Habit tracker

## 📋 Pull Request Guidelines

### Before Submitting

- [ ] Code follows the existing style
- [ ] TypeScript types are properly defined
- [ ] No console errors or warnings
- [ ] Tested in Chrome, Firefox, and Safari
- [ ] Tested on mobile/tablet if UI changes
- [ ] Documentation updated if needed
- [ ] No sensitive data (API keys, etc.) committed

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## 🎨 Code Style

### TypeScript/React

- Use functional components with hooks
- Use TypeScript for type safety
- Prefer `const` over `let`
- Use meaningful variable names
- Extract complex logic to separate functions
- Keep components small and focused

### Example Component

```tsx
import { useEffect, useState } from 'react'

interface MyWidgetProps {
  title: string
  refreshInterval?: number
}

export default function MyWidget({ title, refreshInterval = 60000 }: MyWidgetProps) {
  const [data, setData] = useState<DataType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    
    async function fetchData() {
      try {
        const result = await api.getData()
        if (mounted) setData(result)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load')
      }
    }

    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [refreshInterval])

  if (error) return <div className="text-red-400">{error}</div>
  if (!data) return <div className="text-slate-400">Loading...</div>

  return (
    <div className="w-full h-full">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {/* Widget content */}
    </div>
  )
}
```

### CSS/Tailwind

- Use Tailwind utility classes
- Follow existing color scheme (slate-900, slate-800, etc.)
- Ensure touch-friendly sizing (min 44x44px)
- Add `touch-manipulation` for interactive elements
- Use responsive classes (`lg:`, `md:`, etc.)

### File Organization

```
app/src/
├── lib/           # Business logic, API clients
├── widgets/       # UI components
├── types/         # TypeScript type definitions (if needed)
└── utils/         # Helper functions (if needed)
```

## 🧪 Testing

Before submitting:

```bash
# Lint
npm run lint

# Build
npm run build

# Unit tests
npm run test
```

## 🐛 Bug Reports

When reporting bugs, include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/OS information
- Console errors (if any)

## 💡 Feature Requests

When requesting features:

- Describe the feature clearly
- Explain the use case
- Provide examples or mockups if possible
- Consider if it fits the project's scope

## 📄 Documentation

Documentation improvements are always welcome:

- Fix typos or unclear instructions
- Add examples
- Improve setup guides
- Add troubleshooting tips
- Translate to other languages

## 🔒 Security

If you discover a security vulnerability:

- DO NOT open a public issue
- Email the maintainer directly
- Provide details and steps to reproduce
- Allow time for a fix before public disclosure

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).

## 🙏 Thank You!

Every contribution, no matter how small, is appreciated. Thank you for helping make Fam Bam Dash better!

## 💬 Questions?

- Open a GitHub Discussion
- Check existing issues and PRs
- Read the documentation

Happy coding! 🎉
