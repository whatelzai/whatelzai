# Culture content moved to Supabase

Culture content is database-owned. Runtime collections, labels, teachers, chapters and sayings are read from `member_knowledge_collections` / `member_knowledge_entries`; original source text, attribution and occurrence provenance are preserved there.

Do not add culture content files or content-bearing seed SQL here. Historical snapshots remain in Git history; ignored local migration inputs are under `supabase/private/knowledge/`. The current reader and Chat have no bundled-content fallback.

See `docs/fcos-knowledge.md` for storage, editing/import and verification.
