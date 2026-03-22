# Seed AWS DynamoDB with Local / Mock Data

## Bulk load assets from Excel (with domain creation)

To load an assets file (e.g. `assets_from_redshift.xls`) and **create any missing domains** from the file, then write all assets to the DynamoDB table:

```bash
cd /path/to/Colibri-Data-zone
export AWS_REGION=us-east-1
export DYNAMODB_TABLE=ColibriDataZone-production
npm run bulk-load-assets --workspace=backend -- /path/to/assets_from_redshift.xls
```

Or with the file in `backend/data`:

```bash
AWS_REGION=us-east-1 DYNAMODB_TABLE=ColibriDataZone-production npm run bulk-load-assets --workspace=backend -- backend/data/assets_from_redshift.xls
```

The script:
- Reads the first sheet of the Excel file (`.xls` or `.xlsx`)
- Normalizes columns: Name/Asset Name, Description, Type, Location, **Domain**, Sensitivity, Data Owner, Data Steward, Tags, Source, Format
- Creates a **domain** for each unique **Domain** value that does not already exist
- Creates each row as an **asset** linked to the corresponding domain

Optional: `DEFAULT_OWNER_ID=user-veena` (owner for new domains). Data Owner / Data Steward can be user ids or emails (resolved to user id).

---

# Seed script (users, domains, glossary, OLTP, ontology)

The backend script `backend/src/scripts/seedDynamoDb.ts` uploads the same data as your local mock to the AWS DynamoDB table.

**Data uploaded:**
- Users (admin@colibri.io, veena.anantharam@colibrigroup.com, etc. — same password as local)
- Domains, Glossary terms
- OLTP source tables (32)
- Optional: assets from `backend/data/assets_from_redshift(Sheet1).csv` if present
- Optional: ontology from `backend/data/dbt_column_descriptions_enhanced.xlsx` or `dbt_column_descriptions.csv`

**Requirements:** AWS CLI configured (or env vars `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`).

**Command (from repo root):**

```bash
export AWS_REGION=us-east-1
export DYNAMODB_TABLE=ColibriDataZone-production
npm run seed:dynamodb --workspace=backend
```

Or with inline env:

```bash
AWS_REGION=us-east-1 DYNAMODB_TABLE=ColibriDataZone-production npm run seed:dynamodb --workspace=backend
```

Do **not** set `USE_MOCK_DB` so the script uses real DynamoDB.

---

## If the UI still shows no data after seeding

1. **Use the AWS UI URL**  
   Open `http://<your-alb-dns>` (the ECS URL), not `http://localhost:5173`. Local UI talks to local backend/mock.

2. **Same table and region**  
   The ECS backend uses the table name from the stack parameter `DynamoDBTableName` (e.g. `ColibriDataZone-production`) in the **same region** as the stack (e.g. `us-east-1`). Seed that same table in that same region:
   ```bash
   AWS_REGION=us-east-1 DYNAMODB_TABLE=ColibriDataZone-production npm run seed:dynamodb --workspace=backend
   ```

3. **Confirm data is in the table**  
   ```bash
   aws dynamodb scan --table-name ColibriDataZone-production --region us-east-1 --max-items 5 --query 'Items[*].PK.S' --output text
   ```
   You should see keys like `USER#admin@colibri.io`, `DOMAIN#domain-learner`, etc.

4. **Confirm which table the backend uses**  
   - **Option A – CloudWatch:** After redeploying the backend, check Logs for `/ecs/colibri-backend`. At startup you should see:
     `DynamoDB table: ColibriDataZone-production (env DYNAMODB_TABLE=ColibriDataZone-production)`  
   - **Option B – ECS task definition:** See what the running backend task actually has:
     ```bash
     aws ecs describe-services --cluster colibri-datazone-production --services colibri-backend --region us-east-1 --query 'services[0].taskDefinition' --output text
     ```
     Then (replace `REVISION` with the number from the ARN, e.g. `colibri-backend-production:12`):
     ```bash
     aws ecs describe-task-definition --task-definition colibri-backend-production:REVISION --region us-east-1 --query 'taskDefinition.containerDefinitions[0].environment' --output table
     ```
     Ensure there is `DYNAMODB_TABLE = ColibriDataZone-production`. If it is missing or different, update the stack parameter `DynamoDBTableName` to `ColibriDataZone-production` and force a new deployment so new tasks use the correct table.
