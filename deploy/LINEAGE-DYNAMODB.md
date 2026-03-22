# Lineage not showing in UI (AWS DynamoDB)

If the script said "Done. dbt lineage loaded into DynamoDB" but the **Lineage** tab still shows no data after multiple tries, the ECS backend is almost certainly **still running an old image** that does not load lineage from DynamoDB. Restarting the task ("force new deployment" only) does **not** pull new code—you must **build and push a new image**, then deploy.

## 1. Verify lineage is in the table

```bash
aws dynamodb scan --table-name ColibriDataZone-production \
  --filter-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"LINEAGE#DBT"}}' \
  --select COUNT \
  --region us-east-1
```

If **Count** is **0**, re-run the load script (Step 4). If **Count > 0**, continue.

## 2. Build and push a new backend image (required)

From your machine (Docker + AWS CLI, same account/region):

```bash
cd /Users/veena.anantharam/Project-Dev/Colibri-Data-zone

# Build new image with latest code (Query for lineage, headers, etc.)
docker build --platform linux/amd64 -t 753429994813.dkr.ecr.us-east-1.amazonaws.com/colibri-backend:latest ./backend

# Log in to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 753429994813.dkr.ecr.us-east-1.amazonaws.com

# Push so ECS can pull it
docker push 753429994813.dkr.ecr.us-east-1.amazonaws.com/colibri-backend:latest
```

## 3. Force new deployment so ECS uses the new image

```bash
aws ecs update-service --cluster colibri-datazone-production \
  --service colibri-backend --force-new-deployment --region us-east-1
```

Wait **2–3 minutes** for the new task to be healthy.

## 4. Check what the backend is returning (diagnostic headers)

1. Open the Colibri UI, go to **Lineage**, and make sure the **"dbt Lineage"** tab is selected.
2. Open browser **DevTools** (F12) → **Network** tab.
3. Refresh the page (or trigger a request to the lineage API).
4. Click the request to **`lineage`** or **`dbt/lineage`** (the one that returns JSON).
5. In **Response Headers**, check:
   - **X-Lineage-Source**: `dynamodb` = backend loaded from DynamoDB; `local` = from server files; `none` = no data.
   - **X-Lineage-Nodes** / **X-Lineage-Edges**: counts returned.

If you see **X-Lineage-Source: dynamodb** and **X-Lineage-Nodes** > 0, the backend has the data. If the UI still doesn’t show it, the issue is on the frontend (e.g. try a hard refresh Ctrl+Shift+R or another browser). If you see **X-Lineage-Source: none** and **X-Lineage-Nodes: 0**, the backend is not loading lineage (wrong table, old code, or no data—re-check Step 1 and Step 2).

## 5. Re-run the load script (if Count was 0)

```bash
cd backend
AWS_REGION=us-east-1 DYNAMODB_TABLE=ColibriDataZone-production npm run load-dbt-lineage -- \
  /Users/veena.anantharam/Downloads/manifest.json \
  /Users/veena.anantharam/Downloads/catalog.json
```

Then repeat Step 1 and, if Count > 0, Steps 2 and 3.

---

**Summary:** Data in DynamoDB + **new image build and push** + force new deployment. Then use **X-Lineage-Source** in the response headers to confirm the backend is serving lineage from DynamoDB.
