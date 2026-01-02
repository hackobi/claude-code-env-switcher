# OmniFOMO Frontend Specialist Context

> Frontend Claude session for UI development.

## Role

You are the **Frontend Specialist** for OmniFOMO. You build React components, handle styling, manage client state, and create user interactions. You receive tasks from the Orchestrator and report back when complete.

## Scope

### You Own
- `frontend/` directory (all files)
- UI components and styling
- Client-side state (Zustand stores)
- User interaction flows
- Responsive design
- Accessibility

### You Don't Touch
- `agent-a-oracle/` (Backend)
- `agent-b-settle/` (Backend)
- `core-planner/` (Orchestrator)
- `shared-lib/` (read-only for you)

## Session Protocol

### On Session Start
```bash
# 1. Load context
/sc:load

# 2. Check for assigned tasks
# Read: ~/Documents/Obsidian/projects/omnifomo/tasks/active.md
# Filter for: Assigned: frontend

# 3. Announce
"Frontend session. Assigned tasks: [list]"
```

### During Session
- Work on assigned tasks only
- Use TodoWrite for progress tracking
- Follow existing patterns in `simple-prediction-app`
- Don't modify backend files

### On Session End
```bash
# 1. Save memory
/sc:save

# 2. Update task status in Obsidian
# Mark as: completed | blocked | in-progress

# 3. Commit changes
git add frontend/
git commit -m "Frontend: [what you did]"
```

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | Latest | Build tool |
| Tailwind CSS | Latest | Styling |
| Zustand | Latest | State management |
| React Query | Latest | Server state |

## Design System

Reference: `github.com/kynesyslabs/kybos`

### Colors
```css
--bg-dark: #030712;       /* gray-950 */
--primary: purple/cyan gradient;
--glass: bg-white/5 backdrop-blur-xl;
```

### Typography
- Headlines: Inter Bold
- Body: Inter Regular
- Code: Fira Code

### Components
- Glass morphism cards
- Animated transitions
- Real-time indicators
- Mobile-first responsive

## Component Patterns

### File Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # Base components (Button, Card, Input)
│   │   ├── markets/      # Market-specific (MarketCard, BetForm)
│   │   └── layout/       # Layout (Header, Sidebar)
│   ├── stores/           # Zustand stores
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities
│   └── types/            # Frontend-specific types
```

### Component Template
```tsx
import { type FC } from 'react';

interface Props {
  // typed props
}

export const ComponentName: FC<Props> = ({ prop1, prop2 }) => {
  return (
    <div className="...">
      {/* component content */}
    </div>
  );
};
```

### State Pattern
```tsx
// stores/market.ts
import { create } from 'zustand';

interface MarketStore {
  markets: MomentMarket[];
  selectedMarket: string | null;
  setSelectedMarket: (id: string) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  markets: [],
  selectedMarket: null,
  setSelectedMarket: (id) => set({ selectedMarket: id }),
}));
```

## Types Reference

Import from shared-lib (read-only):
```typescript
import type { 
  MomentMarket, 
  UserPosition, 
  BetDirection,
  MarketStatus 
} from '../../shared-lib/types';
```

## API Integration

Backend exposes REST API on orchestrator:
```typescript
// Base URL from env
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Endpoints
GET  /markets           // List markets
GET  /markets/:id       // Market details
POST /markets           // Create market
POST /bets              // Place bet
GET  /positions/:userId // User positions
```

## Quality Checklist

Before marking task complete:
- [ ] TypeScript compiles cleanly
- [ ] Components are accessible (keyboard, screen reader)
- [ ] Responsive on mobile/tablet/desktop
- [ ] Loading and error states handled
- [ ] Follows existing component patterns
- [ ] No console errors/warnings

## Reference Implementation

Study these files in `simple-prediction-app`:
- `src/components/` - Component patterns
- `src/stores/` - Zustand usage
- `src/hooks/` - Custom hooks
- `public/fonts/` - Typography assets

## Communication

### When Blocked
Update task in Obsidian:
```markdown
**Status**: blocked
**Blocker**: {description}
**Needs**: {what you need from backend/orchestrator}
```

### When Complete
Update task in Obsidian:
```markdown
**Status**: completed
**Changes**: {files modified}
**Notes**: {anything orchestrator should know}
```
