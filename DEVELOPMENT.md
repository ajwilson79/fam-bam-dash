# Development Guide

## 🛠️ Setup

### Prerequisites
- Node.js 20+ 
- npm or yarn
- Git

### Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd fam-bam-dash/app
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start development server:
```bash
npm run dev
```

5. Open `http://localhost:5173` in your browser

## 📁 Project Structure

```
fam-bam-dash/
├── app/                      # React application
│   ├── src/
│   │   ├── assets/
│   │   │   └── photos/      # Local photos for slideshow
│   │   ├── lib/             # Core logic & API clients
│   │   │   ├── settings.ts  # Settings management
│   │   │   ├── weather.ts   # Weather API
│   │   │   ├── gcal.ts      # Google Calendar API
│   │   │   ├── photos.ts    # Photo loading & Google Photos
│   │   │   └── todo.ts      # Todo list logic
│   │   ├── widgets/         # UI components
│   │   │   ├── Clock.tsx
│   │   │   ├── Weather.tsx
│   │   │   ├── Calendar.tsx
│   │   │   ├── Todo.tsx
│   │   │   ├── PhotoSlideshow.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── App.tsx          # Main app layout
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile               # Docker build config
├── docker-compose.yml       # Docker compose config
├── nginx.conf              # Nginx config for production
└── README.md
```

## 🎨 Styling

The app uses Tailwind CSS 4 for styling. Key design tokens:

- Background: `bg-slate-900` (dark)
- Cards: `bg-slate-800`
- Accents: `bg-slate-700`
- Primary: `bg-sky-600`
- Text: `text-white`, `text-slate-300`, `text-slate-400`

### Touch-Friendly Design

All interactive elements use:
- `touch-manipulation` class for better touch response
- Minimum 44x44px touch targets
- Clear hover/active states
- Generous padding and spacing

## 🔌 API Integration

### Weather (Open-Meteo)

Free API, no key required. See `lib/weather.ts`:
- Current weather
- 5-day forecast
- Auto timezone detection

### Google Calendar

Requires API key. See `lib/gcal.ts`:
- Fetches upcoming events
- Configurable time window
- Formats event times

### Google Photos (Optional)

Requires OAuth. See `lib/photos.ts`:
- OAuth 2.0 flow with Google Identity Services
- Fetches album photos
- Combines with local photos

## 💾 State Management

### Settings
- Stored in `localStorage` under `fam-bam-settings`
- Simple pub/sub for cross-component updates
- Defaults from environment variables

### Todo Lists
- Stored in `localStorage` under `fam-bam-todo`
- Immutable state updates
- Multiple lists support

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🐳 Docker Development

Build and test Docker image locally:

```bash
# Build
docker build -t fam-bam-dash .

# Run
docker run -p 3000:80 fam-bam-dash

# With environment variables
docker run -p 3000:80 \
  -e VITE_LAT=37.7749 \
  -e VITE_LON=-122.4194 \
  fam-bam-dash
```

## 📝 Adding New Widgets

1. Create a new component in `src/widgets/`:
```tsx
import { useEffect, useState } from 'react'

export default function MyWidget() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    // Fetch data
  }, [])
  
  return (
    <div className="w-full h-full">
      {/* Your widget UI */}
    </div>
  )
}
```

2. Add to `App.tsx`:
```tsx
import MyWidget from './widgets/MyWidget'

// In the grid layout:
<div className="bg-slate-800 rounded-xl p-6">
  <MyWidget />
</div>
```

3. (Optional) Add settings in `lib/settings.ts` and `widgets/SettingsPanel.tsx`

## 🎯 Best Practices

### Performance
- Use `React.memo()` for expensive components
- Implement proper cleanup in `useEffect`
- Debounce API calls
- Lazy load images

### Accessibility
- Use semantic HTML
- Include ARIA labels for interactive elements
- Ensure keyboard navigation works
- Test with screen readers

### Code Style
- Use TypeScript for type safety
- Keep components small and focused
- Extract reusable logic to `lib/`
- Use meaningful variable names
- Add comments for complex logic

## 🔄 Release Process

1. Update version in `package.json`
2. Test locally:
```bash
npm run build
npm run preview
```

3. Test Docker build:
```bash
docker-compose build
docker-compose up
```

4. Commit and tag:
```bash
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

5. (Optional) Push to Docker Hub:
```bash
docker tag fam-bam-dash your-username/fam-bam-dash:latest
docker push your-username/fam-bam-dash:latest
```

## 🐛 Common Issues

### Hot reload not working
- Check Vite config
- Restart dev server
- Clear browser cache

### TypeScript errors
```bash
npm run build
# Fix any type errors shown
```

### Environment variables not loading
- Ensure variables start with `VITE_`
- Restart dev server after changing `.env`
- Check `import.meta.env.VITE_*` usage

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Open-Meteo API](https://open-meteo.com/)
- [Google Calendar API](https://developers.google.com/calendar)
- [Google Photos API](https://developers.google.com/photos)
