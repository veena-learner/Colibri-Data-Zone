# Colibri Data Zone — Executive Summary: Design, Architecture & Data Governance

**Document Type:** Executive Architecture & Governance Overview  
**Audience:** Leadership, Architecture, and Data & Analytics Stakeholders  
**Version:** 1.0  
**Last Updated:** March 2025  

---

## 1. Executive Summary

**Colibri Data Zone** is a centralized data registration and governance portal that enables organizations to catalog data assets, organize them by business domain, assign ownership and stewardship, maintain a business glossary, and visualize data lineage. The platform is inspired by [Amazon DataZone](https://aws.amazon.com/datazone/) and designed to support both technical data teams and business stakeholders—including a dedicated **Product Manager (OLTP Source)** persona for orchestrating ingestion of source tables into the data warehouse and their mapping to Redshift targets via DBT.

This document outlines the **design and architecture** of Colibri Data Zone, its **benefits**, and a **compare-and-contrast** with AWS Data Zone and industry-standard data governance tools (e.g., Collibra, Alation, Informatica).

---

## 2. Design & Architecture

### 2.1 Design Principles

| Principle | Description |
|-----------|-------------|
| **Domain-centric** | Data is organized by business domains (e.g., Sales, Finance, LMS, Marketing); each domain has an owner and can contain many assets. |
| **Role-based governance** | Clear roles (Admin, Product Manager, Data Owner, Data Steward, Analyst, Viewer) drive who can register, classify, and consume data. |
| **Single source of truth** | One catalog for assets, domains, glossary, lineage, and users, backed by a single-table DynamoDB design for scalability and consistency. |
| **Persona-led UX** | Dedicated experiences (e.g., Source Table Catalog for PMs) so each persona can accomplish their workflows without navigating the full catalog. |

### 2.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COLIBRI DATA ZONE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  PRESENTATION LAYER                                                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Dashboard   │ │ Source      │ │ Data        │ │ Domains /   │            │
│  │ & Stats     │ │ Tables      │ │ Catalog     │ │ Glossary /  │            │
│  │             │ │ (PM Persona)│ │ & Detail    │ │ Lineage     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│       React 18, TypeScript, Tailwind, React Query, React Flow                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  API LAYER (Express, Node.js, TypeScript)                                    │
│  /api/auth | /api/assets | /api/assets/source-tables | /api/domains |        │
│  /api/glossary | /api/lineage | /api/stats | /api/upload | /api/users       │
├─────────────────────────────────────────────────────────────────────────────┤
│  BUSINESS LOGIC & MODELS                                                     │
│  AssetModel | DomainModel | GlossaryModel | LineageModel | UserModel         │
│  (CRUD, search, list by domain/source system, source-table listing)          │
├─────────────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                                   │
│  DynamoDB (single-table design: PK/SK)  OR  In-memory mock for local dev     │
│  Entities: ASSET, DOMAIN, GLOSSARY, USER, LINEAGE                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Core Data Model (Conceptual)

- **DataAsset** — Central entity: name, description, type (S3, Redshift, RDS, Glue, Athena, **OLTP**), location, domain, data owner, data steward, sensitivity (Public / Internal / Confidential / Restricted), tags, glossary term links, optional schema. For OLTP sources: **sourceSystem**, **sourceTableName**, **ingestionStatus** (Pending, InProgress, DBTReady, Completed, Failed), **targetRedshiftTables** (schema, table, DBT model).
- **Domain** — Business domain (e.g., Learner, Sales, Finance) with owner and optional parent domain.
- **GlossaryTerm** — Business term, definition, synonyms, related terms, domain, owner.
- **User** — Identity and role (Admin, ProductManager, DataOwner, DataSteward, Analyst, Viewer).
- **LineageEdge** — Source asset → target asset with optional transformation type and description.

### 2.4 Deployment Architecture

- **Development:** Frontend (Vite) on port 5173, Backend (Express) on port 3001, mock DB or DynamoDB Local.
- **Production (AWS):** 
  - **DynamoDB** — Single table (`ColibriDataZone-{Environment}`), pay-per-request, Point-in-Time Recovery, SSE.
  - **Compute:** ECS Fargate (backend and frontend as separate services).
  - **Secrets:** JWT secret in AWS Secrets Manager.
  - **Load balancing:** ALB with `/api/*` → backend, `/*` → frontend.

### 2.5 Alignment with AWS Data Zone Concepts

| AWS Data Zone Concept | Colibri Data Zone Implementation |
|------------------------|-----------------------------------|
| **Domain** | Domain entity with owner; assets and glossary terms linked to domain. |
| **Business catalog** | Data catalog (assets) with business metadata: name, description, sensitivity, owner, steward, glossary. |
| **Projects / Environments** | Not implemented as first-class “projects” or “environments”; focus is catalog + governance + lineage. |
| **Publish / Subscribe** | Asset registration and visibility by role; no formal publish/subscribe workflow. |
| **Data source connectors** | Asset types (S3, Redshift, RDS, Glue, Athena, OLTP); no live connector framework—metadata is registered. |
| **Ingestion & transformation** | OLTP Source Table Catalog with ingestion status and target Redshift/DBT mapping for Data Engineering handoff. |

---

## 3. Benefits

### 3.1 Organizational Benefits

- **Single place to discover data** — Teams can search and filter by domain, type, sensitivity, and owner instead of relying on tribal knowledge or spreadsheets.
- **Clear accountability** — Every asset has a **domain owner** and optional **data steward**, improving ownership and stewardship for compliance and quality.
- **Governance at scale** — Sensitivity classification (Public / Internal / Confidential / Restricted) and role-based access support policy and audit needs.
- **Faster onboarding** — Business glossary and domain structure help new users understand what data exists and what it means.

### 3.2 Benefits for Data Engineering & Product (OLTP → Warehouse)

- **Source table catalog** — Product Managers and Data Engineering can maintain a single list of OLTP source tables (~1000+) with domain, description, owner, steward, and **target Redshift table** mapping (including DBT model names).
- **Ingestion lifecycle** — Status (Pending, In Progress, DBT Ready, Completed, Failed) makes it clear which sources are not yet in the warehouse or need attention.
- **Traceability** — Lineage (asset-to-asset) plus target mapping gives a clear path from source system → ingestion → DBT → Redshift.

### 3.3 Technical Benefits

- **Scalable storage** — DynamoDB single-table design supports high read/write and future entity growth.
- **Modern stack** — React 18, TypeScript, and a typed API reduce errors and improve maintainability.
- **Deployment flexibility** — Same codebase runs locally with a mock DB or in AWS with DynamoDB and ECS, easing dev and production parity.

### 3.4 Cost & Control

- **No per-seat licensing** — Self-hosted model avoids per-user fees typical of commercial catalogs.
- **Data stays in your control** — Metadata and access are managed within your environment (e.g., AWS account and VPC).

---

## 4. Comparison with AWS Data Zone

| Dimension | AWS Data Zone | Colibri Data Zone |
|-----------|----------------|-------------------|
| **Scope** | Full data governance and sharing across AWS accounts/regions; projects, environments, publish/subscribe, IAM integration. | Catalog-centric governance: assets, domains, glossary, lineage, and OLTP→Redshift mapping; no cross-account or project/environment model. |
| **Data catalog** | Business catalog with business names, glossary, metadata forms; assets can be published from project inventory to domain catalog. | Rich catalog with domain, owner, steward, sensitivity, tags, glossary links; OLTP source tables with ingestion status and target mapping. |
| **Access control** | Fine-grained (row/column) via Lake Formation/Redshift; IAM and SSO; enforced metadata rules. | Role-based (Admin, PM, Data Owner, Data Steward, Analyst, Viewer); JWT auth; no row/column enforcement in warehouse. |
| **Automation** | Connectors to Glue, Redshift, Athena, etc.; optional LLM-assisted catalog curation. | Bulk upload (Excel), API-driven registration; no automated discovery or LLM. |
| **Lineage** | Integrated with AWS services and catalog. | Stored as edges (source/target asset + transformation type); UI visualization. |
| **Deployment** | AWS-managed service. | Self-hosted (e.g., ECS + DynamoDB); you operate and secure it. |
| **Best for** | Enterprises already on AWS wanting governed, cross-account data sharing and projects. | Teams wanting a focused, cost-controlled catalog and governance layer with strong OLTP→warehouse visibility. |

*References: [Amazon DataZone Features](https://aws.amazon.com/datazone/features/), [Data catalog](https://docs.aws.amazon.com/datazone/latest/userguide/working-with-business-catalog.html), [Enforced metadata rules](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-datazone-data-access-governance-enforced-metadata-rules/).*

---

## 5. Comparison with Industry-Standard Data Governance Tools

### 5.1 Overview of Compared Tools

- **Collibra** — Governance and policy-focused; strong compliance and workflow; often perceived as comprehensive but complex and costly ([comparison context](https://atlan.com/alation-vs-collibra-vs-informatica-vs-atlan/)).
- **Alation** — Catalog and discovery-focused; user-friendly, search-driven; strong adoption; governance and lineage can be less deep ([Alation](https://www.alation.com/blog/data-governance-tools/)).
- **Informatica** — Broad data management (ETL, quality, MDM, catalog); strong for large-scale integration; can be heavy and slower to deploy ([comparison context](https://atlan.com/alation-vs-collibra-vs-informatica-vs-atlan/)).

### 5.2 Compare & Contrast Matrix

| Dimension | Colibri Data Zone | Collibra | Alation | Informatica (IDMC) |
|-----------|-------------------|----------|---------|---------------------|
| **Primary strength** | Lightweight catalog + domain governance + OLTP→warehouse mapping | Policy, workflows, compliance | Discovery, search, adoption | End-to-end data management, ETL, MDM |
| **Deployment** | Self-hosted (e.g., AWS ECS + DynamoDB) | Typically cloud/SaaS | Cloud / on-prem options | Cloud (IDMC) / on-prem |
| **Cost model** | Infrastructure only; no per-seat catalog license | Often high; per-seat / enterprise | Subscription; per-seat | Enterprise licensing |
| **Time to value** | Fast for catalog + domains + glossary + lineage | Longer; process and design heavy | Fast for search and catalog | Longer; broad suite |
| **Governance depth** | Roles, sensitivity, owner/steward, glossary | Policies, workflows, stewardship, compliance | Stewardship, collaboration | Policies, quality, MDM, privacy |
| **Data catalog** | Strong; domains, types, sensitivity, OLTP/Redshift mapping | Integrated with governance | Strong; search and collaboration | Catalog as part of suite |
| **Lineage** | Asset-level lineage; clear for OLTP→DBT→Redshift | Supported; often tied to workflows | Good; can lack column-level depth | Supported across suite |
| **Integrations** | REST API; Excel bulk upload; no built-in ETL/BI | Many connectors and workflows | Connectors to DBs, BI, etc. | Deep (ETL, cloud, apps) |
| **Personas** | Admin, PM (source tables), Data Owner, Data Steward, Analyst, Viewer | Data stewards, owners, consumers, compliance | Analysts, stewards, technical users | IT, data engineers, stewards |
| **Best fit** | Mid-size/enterprise needing a focused catalog and OLTP→warehouse governance without full suite cost | Orgs with heavy compliance and policy needs | Orgs prioritizing discovery and adoption | Orgs needing integrated ETL, quality, MDM, and governance |

### 5.3 When to Choose Colibri Data Zone

- You want a **single, domain-oriented catalog** with clear ownership and sensitivity, without the cost and complexity of a full enterprise governance suite.
- You need **explicit support for OLTP source tables** and their mapping to **Redshift/DBT** for Data Engineering and Product Management.
- You prefer **self-hosted, API-first** control and are comfortable running a modern web app and DynamoDB (or equivalent).
- You are **inspired by AWS Data Zone** but do not need cross-account sharing, projects, or fine-grained warehouse access enforcement.

### 5.4 When to Consider Collibra, Alation, or Informatica

- **Collibra:** Heavy regulatory and policy requirements; need formal workflows, approvals, and audit trails.
- **Alation:** Priority is search and discovery across many sources; willing to invest in a dedicated catalog platform.
- **Informatica:** Need a single vendor for ETL, quality, MDM, and governance in one platform.

---

## 6. Roadmap Considerations (Optional)

- **Connectors:** Optional integration with AWS Glue, Redshift, or S3 for metadata sync.
- **Publish/subscribe:** Optional workflow for “publishing” assets from a project or pipeline into the shared catalog.
- **Enforced metadata rules:** Require certain fields (e.g., sensitivity, owner) before an asset is considered “governed.”
- **Column-level lineage:** Extend lineage model and UI to column level where sources support it.

---

## 7. Conclusion

Colibri Data Zone provides a **domain-centric, catalog-first data governance platform** that draws from Amazon Data Zone’s concepts (domains, business catalog, ownership) while remaining focused on **registration, discovery, lineage, and OLTP-to-warehouse mapping**. It offers **clear benefits** in accountability, discoverability, and support for Data Engineering and Product Management workflows, with a **self-hosted, cost-efficient** profile. It **complements** rather than replaces AWS Data Zone for organizations that need cross-account sharing and full AWS integration, and it **contrasts** with Collibra, Alation, and Informatica by offering a lighter, more targeted alternative when deep compliance workflows or a full data-management suite are not the primary need.

---

## References

- [Amazon DataZone – Features](https://aws.amazon.com/datazone/features/)
- [Amazon DataZone – Data access governance](https://aws.amazon.com/datazone/features/data-access/)
- [Amazon DataZone – Enforced metadata rules (2024)](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-datazone-data-access-governance-enforced-metadata-rules/)
- [Amazon DataZone – Business data catalog](https://docs.aws.amazon.com/datazone/latest/userguide/working-with-business-catalog.html)
- [Amazon DataZone – Domains and user access](https://docs.aws.amazon.com/datazone/latest/userguide/working-with-domains-users.html)
- [Alation vs. Collibra vs. Informatica – How to choose](https://atlan.com/alation-vs-collibra-vs-informatica-vs-atlan/)
- [Data governance tools – Leading platforms compared](https://www.alation.com/blog/data-governance-tools/)
- Colibri Data Zone – README and codebase (architecture, API, data model).
