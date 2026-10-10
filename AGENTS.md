# Journey Creator mobile boundaries

This is the independent Expo / React Native / TypeScript project intended for jithu810/Travel_Mvp_Mobile.

- Keep D:\Travel_Mvp and its Git repository unchanged.
- Use the existing Journey Creator Supabase backend and user system.
- Use only public EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY values. Never add service-role/server credentials.
- Keep native code in src/app, src/components, src/hooks, src/lib, and src/types.
- Do not introduce Next.js, WebViews, a monorepo, a shared package, or another backend.
- The current scope includes the mobile foundation, public Discovery/Home, bounded Search, and public Journey Story with ordered timeline, public ratings, and deterministic snapshot signals. Add authentication UI, GPS, maps, camera, offline travel, and notifications only when requested.
- Use npx expo install for native packages and check the current versioned Expo documentation before changing SDK-dependent code.
- Run npm run typecheck and npm run lint after code changes; run Expo compatibility/export checks when dependencies or runtime configuration change.
- Do not create production records during verification or change schema/RLS/production redirects without explicit authorization.
- Do not commit or push unless requested.
