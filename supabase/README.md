# Supabase workspace

Database migrations, Edge Functions, generated database types, and local Supabase configuration will live here once the first backend capability is designed.

No schema has been generated for the bootstrap. Before adding the first migration:

1. initialize or link the project with the current Supabase CLI;
2. create migration files through the CLI;
3. enable RLS on every exposed table and add explicit grants and policies;
4. generate TypeScript database types into `src/types`;
5. run Supabase security and performance advisors.

New Supabase projects may not expose newly created tables to the Data API automatically, so grants and Data API settings must be reviewed alongside RLS.
