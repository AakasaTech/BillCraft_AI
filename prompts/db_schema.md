You are a senior PostgreSQL database architect.

Design a normalized PostgreSQL schema for BillCraft AI.

Requirements:

Entities:
- Users
- Organizations
- Clients
- Invoices
- Invoice items
- Payments
- Subscriptions
- Email logs
- AI requests
- Audit logs

Additional entities and fields:

Organizations:
- default_currency
- timezone
- locale
- tax_registration_number

Clients:
- country_code
- preferred_currency
- preferred_language

Invoices:
- exchange_rate
- tax_type
- tax_registration_number
- payment_instructions
- locale

Features:
- Multi-tenancy
- Soft deletes
- Row-level security
- UUID primary keys
- Created/updated timestamps
- Invoice numbering
- VAT support
- Multiple currencies

Generate:

1. ER diagram in Mermaid format
2. SQL CREATE TABLE statements
3. Indexes
4. Foreign keys
5. Row-level security policies
6. Example queries
7. Migration strategy

Use PostgreSQL best practices.