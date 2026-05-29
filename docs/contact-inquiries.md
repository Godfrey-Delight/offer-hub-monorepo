Contact Inquiries — Supabase table

Purpose

This document describes the required Supabase table used by the client-side contact form at `/contact`.

Table name

- `contact_inquiries`

Required columns

- `id` — uuid primary key. Recommended default: `gen_random_uuid()` (requires `pgcrypto` or `pgcrypto` equivalent).
- `company` — text NOT NULL. Company name provided by the submitter.
- `contact_name` — text NOT NULL. Person to contact at the company.
- `email` — text NOT NULL. Work email for follow-up.
- `message` — text NULL. Optional use case / message field.
- `created_at` — timestamptz NOT NULL DEFAULT now().

Indexes (optional but recommended)

- `idx_contact_inquiries_email` on `email`

Example SQL

Run this in the Supabase SQL editor or with the Supabase CLI:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries (email);
```

Notes for PRs

- Include the SQL migration file in the PR (we added `sql/contact_inquiries.sql`).
- In the PR description, mention the table name and required columns and link to this document.
- If your Supabase project requires different UUID generation (for example `uuid-ossp`), adapt the SQL accordingly.
