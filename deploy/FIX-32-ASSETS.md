# Fix: UI shows only 32 data assets instead of ~3k

**What we know:**
- In AWS you only have the table **ColibriDataZone-production** (the table **ColibriDataZone** does not exist — you get `ResourceNotFoundException`).
- **ColibriDataZone-production** has **32** items with `PK` starting with `ASSET#` (the seed OLTP assets).
- The ~3k bulk-loaded assets were written elsewhere: either to **local DynamoDB** (when the script used `DYNAMODB_ENDPOINT=http://localhost:8000`) or the bulk load never ran against AWS.

So to see ~3k assets in the AWS UI, you need to **load them into ColibriDataZone-production** by running the bulk load script **against AWS**.

The backend was previously defaulting to **local** DynamoDB whenever `NODE_ENV` wasn’t `production`, so the script was writing to localhost instead of AWS. That’s now fixed: if you set **`DYNAMODB_TABLE=ColibriDataZone-production`**, the client uses **real AWS** even when `.env` has `DYNAMODB_ENDPOINT` (e.g. for local dev).

## Load the 3k assets into AWS (ColibriDataZone-production)

1. **AWS credentials**  
   Ensure credentials are set (e.g. `export AWS_ACCESS_KEY_ID=...` etc., or `aws configure`).

2. **Run the bulk load** with the **production table** so it writes to AWS:

```bash
cd /Users/veena.anantharam/Project-Dev/Colibri-Data-zone/backend

AWS_REGION=us-east-1 DYNAMODB_TABLE=ColibriDataZone-production npm run bulk-load-assets -- backend/data/assets_from_redshift.xls
```

If the Excel file is elsewhere, use that path instead of `backend/data/assets_from_redshift.xls`.

3. **Confirm in AWS** (optional):

```bash
aws dynamodb scan --table-name ColibriDataZone-production \
  --filter-expression "begins_with(PK, :p)" \
  --expression-attribute-values '{":p":{"S":"ASSET#"}}' \
  --select COUNT --region us-east-1
```

You should see **Count** around 3000+.

4. **Backend and stack**  
   Your stack already uses **ColibriDataZone-production** (`deploy/stack-params.json` has `DynamoDBTableName: ColibriDataZone-production`). After the bulk load, redeploy the backend so it picks up the new data (or just refresh the Assets page — the backend already reads from that table):

```bash
aws ecs update-service --cluster colibri-datazone-production \
  --service colibri-backend --force-new-deployment --region us-east-1
```

Wait 2–3 minutes, then refresh the Assets page in the UI.

---

**If the bulk load fails** (e.g. missing domains/users): ensure the **seed** has been run against the same AWS table first:

```bash
unset DYNAMODB_ENDPOINT
AWS_REGION=us-east-1 DYNAMODB_TABLE=ColibriDataZone-production npm run seed:dynamodb --workspace=backend
```

Then run the bulk-load-assets command again.
