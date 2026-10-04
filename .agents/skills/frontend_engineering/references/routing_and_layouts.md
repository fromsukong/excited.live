# Routing and Layout Patterns

## TanStack Router + Layout Persistence

### Layout Structure
`apps/webapp/src/routes/_layout.tsx` serves as the root shell for all application pages:

```tsx
export function RouteComponent() {
  const { currentTab, page } = usePlanDashboardContext()
  const { t } = useLocale()

  return (
    <Stack className="app-shell" height="100vh">
      <Topbar currentTab={currentTab} page={page} t={t} />
      <Stack as="main" direction="horizontal" className="app-main" flex={1}>
        <div className="layout-content">
          <Suspense fallback={<div className="route-loading" />}>
            <Outlet />
          </Suspense>
        </div>
        <ChatAssistant />
      </Stack>
    </Stack>
  )
}
```

### Key Principles
1. **No Layout Remounts**: By placing `Topbar` and `ChatAssistant` outside the `<Outlet />`, page navigation does not reset scroll, message state, or trigger re-renders of the navigation shell.
2. **Suspense Boundaries**: Wrapping `<Outlet />` with `<Suspense>` guarantees that chunk loading during page transitions stays scoped to the content area without bubbling up to the entire shell.
3. **Lazy Route Components**:
   - `apps/webapp/src/routes/_layout/index.tsx`:
     ```tsx
     export const Route = createFileRoute('/_layout/')({
       component: lazyRouteComponent(
         () => import('../../pages/home/home'),
         'HomePage',
       ),
     })
     ```
   - `apps/webapp/src/routes/_layout/settings.tsx`:
     ```tsx
     export const Route = createFileRoute('/_layout/settings')({
       component: lazyRouteComponent(
         () => import('../../pages/settings/settings'),
         'SettingsPage',
       ),
     })
     ```
