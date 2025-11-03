# Architecture Documentation

## Overview

This application uses React Router v6 for navigation and Clerk for authentication, following an enterprise-level feature-based architecture.

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Authentication**: Clerk
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite

## Folder Structure

```
src/
├── app/
│   ├── routes/
│   │   ├── AppRoutes.tsx          # Main router configuration
│   │   └── ProtectedRoute.tsx     # Protected route wrapper with Clerk auth
│   └── App.tsx                    # Root application component
│
├── features/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx      # Custom login UI with Clerk integration
│   │   │   └── SignupPage.tsx     # Custom signup UI with Clerk integration
│   │   └── services/
│   │       └── clerkAuth.ts       # Clerk authentication service
│   │
│   ├── dashboard/
│   │   ├── pages/
│   │   │   └── Dashboard.tsx      # Dashboard page
│   │   └── components/
│   │       ├── create-project-modal.tsx
│   │       └── delete-project-dialog.tsx
│   │
│   ├── projects/
│   │   ├── pages/
│   │   │   └── ProjectLayout.tsx  # Project detail page
│   │   └── components/
│   │       ├── database-page.tsx
│   │       ├── triggers-page.tsx
│   │       ├── project-settings-page.tsx
│   │       └── [modals...]
│   │
│   ├── profile/
│   │   └── pages/
│   │       └── ProfilePage.tsx
│   │
│   └── billing/
│       └── pages/
│           └── BillingPage.tsx
│
├── providers/
│   └── AppProviders.tsx           # Global providers (Clerk, Query, Tooltip, Toast)
│
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── logo.tsx
│   ├── footer.tsx
│   └── theme-toggle.tsx
│
├── hooks/
├── lib/
│   ├── utils.ts
│   └── animations.ts
│
└── types/
    └── index.ts                   # Shared TypeScript types
```

## Authentication Flow

### Clerk Integration

The application uses Clerk for authentication with a **custom UI approach**:

1. **Custom Login/Signup Forms**: We maintain the original UI design but use Clerk's authentication methods under the hood
2. **No Prebuilt Components**: We do not use Clerk's `<SignIn />` or `<SignUp />` components
3. **Service Layer**: `clerkAuth.ts` provides a clean interface to Clerk's authentication APIs

### Protected Routes

Protected routes are implemented using:
- `<ProtectedRoute />` component that wraps authenticated routes
- Clerk's `useAuth()` hook for checking authentication status
- Automatic redirect to `/sign-in` for unauthenticated users

## Routing Structure

```
/sign-in              → LoginPage (public)
/sign-up              → SignupPage (public)
/                     → Dashboard (protected)
/projects/:projectId  → ProjectLayout (protected)
/profile              → ProfilePage (protected)
/billing              → BillingPage (protected)
```

### Route Features

- **Lazy Loading**: All route components are lazy-loaded for better performance
- **Loading States**: Suspense boundaries with loading fallback
- **Route State**: Project data is passed via `location.state` to avoid prop drilling
- **Params**: Dynamic routes use URL parameters (e.g., `:projectId`)

## Key Architecture Decisions

### 1. Feature-Based Organization
Each feature has its own folder with:
- `pages/` - Route-level components (default exports)
- `components/` - Feature-specific components
- `services/` - Feature-specific business logic
- `hooks/` - Feature-specific custom hooks (if needed)

### 2. Navigation Pattern
- Use `useNavigate()` hook instead of callback props
- Use `useLocation()` for accessing route state
- Use `useParams()` for dynamic route parameters

### 3. State Management
- **Route State**: For temporary data (project selection)
- **React Query**: For server state and caching
- **Local State**: For component-level UI state

### 4. Authentication State
- Clerk manages authentication state globally
- `useAuth()` provides auth status in components
- `useClerk()` provides sign-out and other utilities

## Environment Variables

Required environment variables:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Stored in `.env.local` (not committed to git)

## Migration Summary

### What Changed
- ✅ Replaced `useState`-based view switching with React Router
- ✅ Integrated Clerk for authentication (custom UI maintained)
- ✅ Reorganized into feature-based folder structure
- ✅ Implemented protected routes
- ✅ Added lazy loading for better performance
- ✅ Centralized providers in `AppProviders.tsx`

### What Stayed the Same
- ✅ All UI components remain unchanged
- ✅ Design system and styling
- ✅ Component logic and behavior
- ✅ User experience and workflows

## Development Guidelines

### Adding a New Protected Route

1. Create the page component in `src/features/[feature]/pages/`
2. Export as default
3. Add lazy import in `AppRoutes.tsx`
4. Add route inside `<ProtectedRoute>` wrapper

```tsx
const NewPage = lazy(() => import("@/features/[feature]/pages/NewPage"));

// In routes
<Route element={<ProtectedRoute />}>
  <Route path="/new-page" element={<NewPage />} />
</Route>
```

### Navigation Between Routes

```tsx
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

// Simple navigation
navigate("/profile");

// With state
navigate("/projects/123", { state: { project } });

// Go back
navigate(-1);
```

### Accessing Route Data

```tsx
import { useParams, useLocation } from "react-router-dom";

const { projectId } = useParams();
const location = useLocation();
const project = location.state?.project;
```

### Authentication

```tsx
import { useAuth, useClerk } from "@clerk/clerk-react";

const { isSignedIn, userId } = useAuth();
const { signOut } = useClerk();

// Sign out
await signOut();
```

## Performance Optimizations

- **Lazy Loading**: All route components are code-split
- **Suspense Boundaries**: Prevent entire app re-renders
- **React Query**: Efficient data caching and fetching
- **Protected Route Loading**: Shows spinner while checking auth

## Security

- Protected routes require authentication
- Clerk handles session management securely
- API keys stored in environment variables (not in code)
- Custom forms with Clerk backend = security + custom UX
