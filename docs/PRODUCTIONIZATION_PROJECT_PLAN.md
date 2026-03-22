# Colibri Data Zone — Productionization Project Plan

**Context:** Pilot running in an AWS sandbox environment (ECS Fargate, ALB, DynamoDB, ECR, etc.).  
**Goal:** Move from pilot to enterprise-ready production posture with central authentication (SSO), repeatable infrastructure-as-code (Terraform), and a scalable rollout model.

---

## 1. Executive summary

Productionization requires aligning **identity**, **platform**, **application**, **data governance**, and **change management** so Colibri Data Zone can be deployed consistently across environments (non‑prod / prod), integrated with corporate IdP (SSO), operated with observability and SLOs, and adopted by the wider enterprise without one-off manual steps.

---

## 2. Current state (pilot baseline)

| Area | Typical pilot posture |
|------|------------------------|
| **Account** | Single sandbox AWS account |
| **Compute** | ECS Fargate (frontend + backend), ALB |
| **Data** | DynamoDB single-table design |
| **IaC** | CloudFormation + shell deploy (`deploy/`), manual parameters / ECR |
| **Auth** | Application-level login (JWT) — not enterprise SSO |
| **Secrets** | Mixed (Secrets Manager in CF; developers may use local env) |
| **Observability** | CloudWatch logs; limited dashboards / alerting |

**Outputs already in repo:** `deploy/cloudformation-ecs-full.yaml`, `deploy/deploy.sh`, operational runbooks (`deploy/TROUBLESHOOT-UI.md`, `deploy/LINEAGE-DYNAMODB.md`, etc.).

---

## 3. Target state (production)

- **Identity:** SAML / OIDC SSO (e.g. Okta, Azure AD, Ping) with role/claim mapping to app roles (Viewer / Steward / Admin).
- **Infrastructure:** Terraform (or Terraform + minimal CF where required) as **single source of truth**, with modules, remote state, and **environment promotion** (dev → test → prod).
- **Enterprise rollout:** Landing zone–aligned accounts (or shared services), standardized networking (VPC, subnets, SGs), **change windows**, training, and a **scaled adoption** plan (wave 1 domains, wave 2, etc.).
- **Operations:** Runbooks, on-call, backup/DR strategy for DynamoDB, cost guardrails, security reviews.

---

## 4. Workstreams & activity lists

### 4.1 Identity & SSO integration

| # | Activity | Notes |
|---|----------|--------|
| SS-01 | Choose IdP protocol (SAML 2.0 vs OIDC) aligned with enterprise standards | Often OIDC is simpler for SPAs + API |
| SS-02 | Register Colibri as enterprise application in IdP | Redirect URIs, logout, client IDs/secrets |
| SS-03 | Define identity claims → app roles mapping | e.g. groups → `Admin` / `Steward` / `Viewer` |
| SS-04 | Implement backend OIDC/SAML validation (token exchange or session) | Replace or supplement JWT login with IdP-issued tokens |
| SS-05 | Update frontend: SSO login flow, token refresh, logout URL | Remove or gate local password login in prod |
| SS-06 | Service account / API access pattern for automation | M2M tokens or IAM-based integration for batch jobs |
| SS-07 | Security review: token storage, CSRF, session length, MFA enforcement via IdP | Document threat model |
| SS-08 | Pen test / DAST for auth flows in staging | Before prod cutover |

**Deliverables:** SSO design doc, IdP app config, updated auth middleware + frontend, security sign-off.

---

### 4.2 Terraform for AWS infrastructure

| # | Activity | Notes |
|---|----------|--------|
| TF-01 | Agree IaC standard (Terraform version, remote state — S3 + DynamoDB lock) | Org policy may require Control Tower / Service Catalog |
| TF-02 | Inventory assets from pilot (VPC, ECS, ALB, TG, IAM, ECR, DynamoDB, logs, optional Secrets) | Map 1:1 from `cloudformation-ecs-full.yaml` |
| TF-03 | **Module design:** `network`, `ecs_cluster`, `alb`, `ecs_service`, `dynamodb`, `iam`, `ecr`, optional `waf`, `route53` | Reuse across envs with variables |
| TF-04 | Implement **dev / test / prod** workspaces or separate state per env | Promotion process documented |
| TF-05 | Migrate or parallel-run: Terraform import from existing resources OR greenfield next env | Minimize blast radius |
| TF-06 | CI pipeline: `terraform fmt`, `validate`, `plan` on PR; **approved apply** to prod | GitHub Actions / GitLab / CodePipeline |
| TF-07 | Drift detection & periodic `plan` in read-only mode | Alert on unexpected changes |
| TF-08 | Deprecate or wrap CloudFormation | Single source of truth after cutover |

**Deliverables:** Terraform repo structure, modules, env configs, CI/CD for plan/apply, migration runbook from CFN.

---

### 4.3 Security, compliance & governance

| # | Activity | Notes |
|---|----------|--------|
| SEC-01 | Data classification for catalog contents (PII, internal, public) | Drives logging and access policy |
| SEC-02 | IAM least privilege for ECS task roles vs pilot | Scoped DynamoDB keys, no `*` |
| SEC-03 | Secrets rotation (IdP client secret, DB if added later) | Secrets Manager rotation where applicable |
| SEC-04 | WAF on ALB (if internet-facing) | Rate limit, geo, OWASP rulesets |
| SEC-05 | TLS end-to-end review | ACM certs, TLS policy on ALB |
| SEC-06 | VPC posture / private subnets for tasks | NAT for egress if required |
| SEC-07 | Logging & retention policy | CloudWatch, optional central SIEM export |
| SEC-08 | Compliance pack (SOC2/ISO controls mapping) if required | Evidence from Terraform + runbooks |

---

### 4.4 Observability, reliability & DR

| # | Activity | Notes |
|---|----------|--------|
| OPS-01 | SLOs for availability and latency (e.g. 99.5% / p95 API) | ALB + app metrics |
| OPS-02 | Dashboards: ECS, ALB, DynamoDB throttles, 5xx | Pager / SNS |
| OPS-03 | On-call rotation & escalation | Runbook links |
| OPS-04 | DynamoDB backup strategy (PITR on, snapshot policy) | RTO/RPO targets |
| OPS-05 | Load / soak test before prod | Especially asset scan + lineage endpoints |
| OPS-06 | Capacity & cost: Fargate task size, autoscaling policies | Budget alerts |

---

### 4.5 Application & data production hardening

| # | Activity | Notes |
|---|----------|--------|
| APP-01 | Environment config: **no** mock DB in prod; strict `DYNAMODB_TABLE` | Already directionally in place |
| APP-02 | Rate limiting / API quotas at ALB or app layer | Abuse protection |
| APP-03 | Audit trail for catalog mutations (who changed what) | May extend DynamoDB AUDIT pattern |
| APP-04 | Bulk job execution in AWS (EventBridge + Fargate task) vs laptops | Enterprise data residency / creds |
| APP-05 | Feature flags for pilot-only capabilities | Safe rollout |

---

### 4.6 Enterprise rollout & change management

| # | Activity | Notes |
|---|----------|--------|
| ENT-01 | **Stakeholder map:** Data governance, security, infra, LOB data owners | Steering committee |
| ENT-02 | Rollout waves: e.g. Wave 0 (IT + 1 domain), Wave 1 (3 LOBs), Wave 2 (enterprise) | Criteria per wave |
| ENT-03 | Training: catalog stewardship, lineage upload, ontology standards | Videos + office hours |
| ENT-04 | Support model: L1 helpdesk script, L2 platform team | SLAs |
| ENT-05 | Communication plan: launch email, office hours, feedback channel | |
| ENT-06 | Success metrics: MAU, assets cataloged, domains onboarded, lineage coverage | Quarterly review |
| ENT-07 | Multi-region or multi-account strategy (if required) | Shared ALB vs per-business-unit |

---

## 5. Suggested phase timeline (indicative)

| Phase | Duration (typical) | Focus |
|-------|-------------------|--------|
| **P0 — Foundation** | 2–4 weeks | Terraform scaffolding, remote state, dev env parity, IAM baselines |
| **P1 — SSO** | 3–6 weeks | IdP integration, role mapping, security review, staging sign-off |
| **P2 — Prod platform** | 4–8 weeks | Prod account/VPC, WAF, backups, monitoring, DR drill |
| **P3 — Pilot hardening** | 2–4 weeks | Load test, runbooks, automation for seed/b load jobs in AWS |
| **P4 — Enterprise rollout** | Ongoing (quarters) | Waves, training, expansion, continuous improvement |

*Actual durations depend on enterprise change windows, security reviews, and IdP team availability.*

---

## 6. Dependencies & prerequisites

- Enterprise architecture approval for **internet-facing ALB** vs private + VPN / ZTNA.
- **IdP team** capacity for app registration and claim design.
- **Cloud platform team** for accounts, VPC standards, and Terraform enterprise tooling (if any).
- **Legal / privacy** if catalog will reference regulated data subjects.

---

## 7. Risks & mitigations (summary)

| Risk | Mitigation |
|------|------------|
| SSO delays block prod | Time-bound MVP: SSO in staging first; parallel track |
| Terraform migration causes drift | Import plan + limited blast radius env first |
| DynamoDB / API performance at scale | Pagination, GSIs if needed, load testing |
| Pilot “shadow IT” scripts (bulk load from laptop) | Move jobs to scheduled Fargate + IAM roles |
| Low adoption | Executive sponsor, wave criteria tied to OKRs |

---

## 8. Success criteria (exit checklist for “production ready”)

- [ ] SSO enforced in production; local admin login disabled or break-glass only  
- [ ] All infra in Terraform applied via pipeline with approval gates  
- [ ] Monitoring dashboard + alerting + documented on-call  
- [ ] DynamoDB PITR (or agreed backup) and tested restore  
- [ ] Security review complete (IAM, WAF/TLS, data handling)  
- [ ] Runbooks: deploy, rollback, lineage load, disaster recovery  
- [ ] Wave 1 rollout complete with trained stewards and defined SLAs  

---

## 9. References (internal)

- Deployment & ops: `deploy/` (CloudFormation today; Terraform target)  
- Architecture narrative: `docs/EXECUTIVE_DATA_GOVERNANCE_ARCHITECTURE.md`  
- Troubleshooting: `deploy/TROUBLESHOOT-UI.md`, `deploy/LINEAGE-DYNAMODB.md`

---

*Document owner: Program / Platform lead (update with names, dates, and phase gates as the program formalizes.)*
