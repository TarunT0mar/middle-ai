# Middle AI implementation plan

1. Scaffold a responsive Next.js App Router app with TypeScript, Tailwind, and a small accessible shadcn-style component set.
2. Build a shared, tenant-scoped support pipeline: approved-fact retrieval, sensitive/unknown escalation, draft and human-takeover states, and optional OpenAI/WhatsApp/Supabase adapters. Keep the simulator usable without external credentials and label its demo behavior.
3. Add the owner flow and dashboard pages for onboarding, knowledge review, products, conversations, settings, plus the `/demo/chat` simulator and file/text ingestion.
4. Add Supabase migrations, RLS, pgvector search, seed studio data, `.env.example`, and setup/deployment documentation.
5. Add business-logic tests and run lint, typecheck, tests, and a production build; report external setup and any remaining limitations.
