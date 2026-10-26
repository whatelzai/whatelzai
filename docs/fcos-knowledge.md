# fcOS knowledge storage

Business knowledge is database-owned. Application code contains schema validation, authorization, retrieval, UI and operational assistant instructions; it must not contain the editable teachings, lesson material, personal stories or note bodies. Shared references and private member records remain separate.

## Storage map

| Content                                                                              | Canonical location                                                                             |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Catalogue market/edition/SKU/price/PV/BV                                             | Existing `product_catalogue_sources`, `product_catalogue_listings`, `product_catalogue_notes`  |
| Shared culture, product-class material, pipeline or marketing-plan reference records | `member_knowledge_collections` and `member_knowledge_entries`                                  |
| Baobei story, interests, concerns and remarks                                        | Existing text columns in `member_leads`; variable extra attributes in its `metadata` JSONB     |
| HQH/HHH observations, reflections and next steps                                     | Existing text columns in `member_briefings`; variable extra attributes in its `metadata` JSONB |
| Ownership, lead/note links and sharing grants                                        | Existing relational IDs and grant tables                                                       |

Prose stays in text; JSONB stores variable structured details such as chapter associations, source occurrences, lesson sections, product references, speaker/session metadata and tags. JSONB is bounded and must be an object. Product facts are not copied into lesson metadata as a competing price source. Private notes/profile content must never be imported into shared knowledge tables.

## Culture migration

The former bundled Ultra collection was imported as exact text, 231 distinct sayings, 233 source occurrences and 15 chapters. Collection metadata holds teacher/display name, source attribution/date and chapters. Entry metadata preserves all chapter links and original source-order occurrences. The original complete source text and SHA-256 digest are retained in collection `provenance`, which is excluded from reader/Chat selects. Soon Ye and Founder’s Club remain empty database collections; no content was invented. Repository history retains historical snapshots, but current code no longer imports or contains those content files.

Both `/culture` and Chat use `loadCulture()` after verified assigned-user authorization. Only published culture collections and their published entries are read; stable pagination prevents Data API row-cap truncation. Parse metadata into the small reader shape before serialization. Missing/unavailable data does not fall back to baked-in content. Current Chat retrieval is substring-based, now also matching stored chapter titles; embeddings/semantic ranking are not implemented by this storage migration.

## Editing and importing

Use trusted owner/server tooling or Supabase Table Editor to edit rows; no browser table grants or public write endpoint is introduced. Titles, teachers, chapters, body text and metadata changes require no code deployment. Existing profile/note forms continue editing their text columns. The new extra-metadata fields have no speculative form controls yet.

`scripts/import-member-knowledge.ts <private-json-path>` accepts `collections` and `entries` arrays, atomically inserts through service-only `import_member_knowledge`, then verifies exact round-trip fields without logging content. Load credentials from an ignored environment file. Keep inputs under ignored `supabase/private/`; never commit content-bearing seed SQL or real member fixtures. IDs must be new: collisions roll back the complete import, preserving editorial changes. To add classes, use collection kind `product-class`, text body and JSONB lesson metadata. Other supported reference kinds are `pipeline` and `marketing-plan`; no new reader/editor or Chat source for these kinds is implied.

The service-only role can read/write references. Tables have RLS enabled and no anon/authenticated grants; import execution is revoked from those roles. Published references are delivered only through authenticated application loaders. Source provenance never reaches the browser or model. Existing profile/note ownership and sharing enforcement remain unchanged.

## Verification

Run `node --import tsx --test scripts/knowledge-sql.test.mjs scripts/culture-source.test.ts scripts/member-ai-boundaries.test.ts`, typecheck, changed-file lint/format and production build. Verify import against the private original before removing local bundled files, check live anonymous denial and exact counts, then verify Culture/search/empty collections and Chat retrieval through the authenticated UI.
