---
marp: true
theme: default
paginate: true
backgroundColor: #fff
style: |
  section { font-size: 28px; }
  h1 { color: #1a365d; }
  h2 { color: #2c5282; }
  table { font-size: 22px; }
---

<!--
  HOW TO USE THIS DECK
  • Export to PDF: npx @marp-team/marp-cli EXECUTIVE_DATA_GOVERNANCE_DECK.md --pdf
  • Export to HTML: npx @marp-team/marp-cli EXECUTIVE_DATA_GOVERNANCE_DECK.md --html
  • Or use the "Marp for VS Code" extension: open this file, then "Export Slide Deck" from the command palette.
  • To build PPTX: npx @marp-team/marp-cli EXECUTIVE_DATA_GOVERNANCE_DECK.md --pptx
-->

# Colibri Data Zone
## Design, Architecture & Data Governance

**Executive summary for leadership & architecture**

Version 1.0 · March 2025

---

# Agenda

1. What is Colibri Data Zone
2. Design & architecture
3. Benefits
4. Comparison with AWS Data Zone
5. Comparison with industry tools (Collibra, Alation, Informatica)
6. When to choose Colibri vs. others
7. Roadmap & conclusion

---

# What is Colibri Data Zone?

- **Centralized data registration and governance portal**
- Catalog data assets, organize by **business domain**, assign **ownership & stewardship**
- **Business glossary** + **data lineage** visualization
- Inspired by **Amazon Data Zone**
- Supports **Product Manager (OLTP)** persona: source tables → warehouse → Redshift/DBT mapping

**In one line:** One place to discover, govern, and trace data from source systems to the warehouse.

---

# Design principles

| Principle | Description |
|-----------|-------------|
| **Domain-centric** | Data organized by business domains (Sales, Finance, LMS, etc.); each domain has an owner. |
| **Role-based governance** | Admin, Product Manager, Data Owner, Data Steward, Analyst, Viewer. |
| **Single source of truth** | One catalog (assets, domains, glossary, lineage) on DynamoDB single-table design. |
| **Persona-led UX** | Dedicated experiences (e.g. Source Table Catalog for PMs). |

---

# High-level architecture

```
┌─ PRESENTATION ─────────────────────────────────────────┐
│  Dashboard │ Source Tables (PM) │ Catalog │ Domains   │
│  Glossary │ Lineage   →  React, TypeScript, Tailwind  │
├─ API LAYER ───────────────────────────────────────────┤
│  /api/auth | assets | source-tables | domains |       │
│  glossary | lineage | stats | upload | users          │
├─ MODELS ───────────────────────────────────────────────┤
│  Asset · Domain · Glossary · Lineage · User            │
├─ DATA ─────────────────────────────────────────────────┤
│  DynamoDB (single table) or mock for local dev         │
└────────────────────────────────────────────────────────┘
```

---

# Core data model

- **DataAsset** — Name, type (S3, Redshift, RDS, Glue, Athena, **OLTP**), domain, owner, steward, sensitivity, tags, glossary. For OLTP: sourceSystem, sourceTableName, ingestionStatus, **targetRedshiftTables** (schema, table, DBT model).
- **Domain** — Business domain + owner (e.g. Learner, Sales, Finance).
- **GlossaryTerm** — Term, definition, synonyms, domain, owner.
- **User** — Identity + role.
- **LineageEdge** — Source asset → target asset (+ transformation type).

---

# Deployment

| Environment | Frontend | Backend | Data |
|-------------|----------|---------|------|
| **Development** | Vite (port 5173) | Express (3001) | In-memory mock or DynamoDB Local |
| **Production (AWS)** | ECS Fargate + ALB | ECS Fargate + ALB | DynamoDB (single table, PITR, SSE) |

Secrets: JWT in AWS Secrets Manager. ALB: `/api/*` → backend, `/*` → frontend.

---

# Benefits — Organizational

- **Single place to discover data** — Search/filter by domain, type, sensitivity, owner (no tribal knowledge or spreadsheets).
- **Clear accountability** — Every asset has domain owner + optional data steward.
- **Governance at scale** — Sensitivity (Public / Internal / Confidential / Restricted) + RBAC for policy and audit.
- **Faster onboarding** — Glossary + domain structure help new users understand what data exists.

---

# Benefits — Data Engineering & Product

- **Source table catalog** — Single list of OLTP source tables (e.g. ~1000+) with domain, description, owner, steward, **target Redshift table** and **DBT model** mapping.
- **Ingestion lifecycle** — Status: Pending → In Progress → DBT Ready → Completed / Failed.
- **Traceability** — Lineage + target mapping: source system → ingestion → DBT → Redshift.

---

# Benefits — Technical & cost

- **Scalable storage** — DynamoDB single-table design.
- **Modern stack** — React 18, TypeScript, typed API.
- **Deployment flexibility** — Same codebase: local mock or AWS ECS + DynamoDB.
- **No per-seat licensing** — Self-hosted; pay for infrastructure only.
- **Data in your control** — Metadata and access in your AWS account and VPC.

---

# Alignment with AWS Data Zone

| AWS Data Zone | Colibri Data Zone |
|---------------|-------------------|
| Domain | ✅ Domain entity + owner |
| Business catalog | ✅ Catalog with metadata, sensitivity, owner, steward, glossary |
| Projects / Environments | ❌ Not first-class; focus on catalog + lineage |
| Publish / Subscribe | ❌ Role-based visibility only |
| Connectors | Asset types registered; no live connector framework |
| Ingestion & transformation | ✅ OLTP Source Table Catalog + Redshift/DBT mapping |

---

# Colibri vs AWS Data Zone

| Dimension | AWS Data Zone | Colibri Data Zone |
|-----------|----------------|-------------------|
| **Scope** | Cross-account, projects, environments, IAM | Catalog + domains + glossary + lineage + OLTP→Redshift |
| **Access** | Fine-grained (row/column), Lake Formation | Role-based, JWT |
| **Automation** | Connectors, optional LLM | Bulk upload (Excel), API |
| **Deployment** | AWS-managed | Self-hosted (e.g. ECS + DynamoDB) |
| **Best for** | Cross-account sharing, full AWS integration | Focused catalog, OLTP→warehouse, cost control |

---

# Industry tools at a glance

- **Collibra** — Governance & policy; compliance & workflows; comprehensive but complex and costly.
- **Alation** — Catalog & discovery; user-friendly, search-driven; strong adoption; governance/lineage can be less deep.
- **Informatica** — Broad suite (ETL, quality, MDM, catalog); strong for large-scale integration; can be heavy and slower to deploy.

---

# Compare & contrast — Colibri vs market

| Dimension | Colibri Data Zone | Collibra | Alation | Informatica |
|-----------|-------------------|----------|---------|-------------|
| **Strength** | Catalog + domain + OLTP→warehouse | Policy, compliance | Discovery, search | ETL, MDM, suite |
| **Cost** | Infrastructure only | High, per-seat | Subscription | Enterprise |
| **Time to value** | Fast | Longer | Fast | Longer |
| **Governance** | Roles, sensitivity, owner/steward | Deep policies, workflows | Stewardship, collaboration | Policies, quality, MDM |
| **Deployment** | Self-hosted | Cloud/SaaS | Cloud/on-prem | Cloud/on-prem |

---

# When to choose Colibri Data Zone

- You want a **single, domain-oriented catalog** with clear ownership and sensitivity **without** the cost and complexity of a full enterprise suite.
- You need **OLTP source tables** and their mapping to **Redshift/DBT** for Data Engineering and Product Management.
- You prefer **self-hosted, API-first** control (e.g. React app + DynamoDB).
- You are inspired by **AWS Data Zone** but do **not** need cross-account sharing, projects, or fine-grained warehouse access enforcement.

---

# When to consider others

- **Collibra** — Heavy regulatory and policy needs; formal workflows, approvals, audit trails.
- **Alation** — Priority is search and discovery across many sources; investment in a dedicated catalog platform.
- **Informatica** — Single vendor for ETL, quality, MDM, and governance in one platform.

---

# Roadmap (optional)

- **Connectors** — Optional integration with AWS Glue, Redshift, or S3 for metadata sync.
- **Publish/subscribe** — Optional workflow to “publish” assets from a project or pipeline into the shared catalog.
- **Enforced metadata rules** — Require fields (e.g. sensitivity, owner) before an asset is “governed.”
- **Column-level lineage** — Extend lineage to column level where sources support it.

---

# Conclusion

- Colibri Data Zone is a **domain-centric, catalog-first** data governance platform inspired by **Amazon Data Zone**.
- Focus: **registration, discovery, lineage, and OLTP-to-warehouse mapping** with clear benefits in accountability, discoverability, and Data Engineering/PM workflows.
- **Self-hosted and cost-efficient**; **complements** AWS Data Zone where cross-account and full AWS integration are needed; **contrasts** with Collibra, Alation, and Informatica as a **lighter, targeted** alternative when deep compliance or a full suite is not the primary need.

---

# References & thank you

- [Amazon DataZone – Features](https://aws.amazon.com/datazone/features/)
- [Amazon DataZone – Data catalog](https://docs.aws.amazon.com/datazone/latest/userguide/working-with-business-catalog.html)
- [Alation vs. Collibra vs. Informatica](https://atlan.com/alation-vs-collibra-vs-informatica-vs-atlan/)
- [Data governance tools compared](https://www.alation.com/blog/data-governance-tools/)
- Colibri Data Zone – README and codebase

**Questions?**
