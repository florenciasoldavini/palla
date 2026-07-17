// TypeScript does not resolve React Native platform extensions. Metro replaces
// this module with `supabase-storage.native.ts` on iOS and Android.
export { supabaseStorage } from '@/lib/supabase-storage.web';
