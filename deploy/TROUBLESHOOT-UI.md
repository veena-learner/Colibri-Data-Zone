# UI "didn't send any data" – quick checks

When the ALB URL returns no data or "didn't send any data", the load balancer usually has **no healthy targets** (frontend and/or backend tasks are down or failing health checks).

## Get the UI back quickly

Run these to start fresh tasks and give them time to pass health checks:

```bash
export AWS_REGION=us-east-1
export CLUSTER=colibri-datazone-production

# Grace period so new tasks have time to start before ALB marks them unhealthy
aws ecs update-service --cluster $CLUSTER --service colibri-frontend --force-new-deployment --health-check-grace-period-seconds 300 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER --service colibri-backend --force-new-deployment --health-check-grace-period-seconds 300 --region $AWS_REGION
```

Wait **5 minutes**, then try the URL again. If it still fails, run the health check below and check CloudWatch logs.

## 1. Run the health check script

From the repo root (with AWS credentials and region set):

```bash
./deploy/check-health.sh
```

Check:
- **Running** count for `colibri-backend` and `colibri-frontend` is at least 1.
- **Target group health**: both target groups should show at least one `healthy` target. If you see `draining` or no healthy targets, wait 3–5 minutes and run again.

## 2. Check which service is failing

- **Frontend** serves the main page (HTML/JS). If the **page itself** never loads ("didn't send any data"), the **frontend** target group usually has no healthy targets.
- **Backend** serves `/api/*`. If the page loads but login or data fails, check the **backend**.

Force a new deployment of both services so new tasks register with the ALB:

```bash
export AWS_REGION=us-east-1
export CLUSTER=colibri-datazone-production

aws ecs update-service --cluster $CLUSTER --service colibri-frontend --force-new-deployment --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER --service colibri-backend --force-new-deployment --region $AWS_REGION
```

Wait 3–5 minutes, then open the URL again.

## 3. Check CloudWatch logs

Backend (recent errors):

```bash
aws logs filter-log-events --log-group-name /ecs/colibri-backend --region us-east-1 \
  --start-time $(($(date +%s) - 600))000 --query 'events[*].message' --output text | tail -50
```

Frontend (nginx/container):

```bash
aws logs filter-log-events --log-group-name /ecs/colibri-frontend --region us-east-1 \
  --start-time $(($(date +%s) - 600))000 --query 'events[*].message' --output text | tail -50
```

Look for exit codes, "OOMKilled", or repeated restarts.

## 4. Confirm ALB listener and target groups

- Default listener (e.g. port 80) should forward to **frontend** for `/` and to **backend** for `/api` (if you use path-based rules). If all traffic goes to one target group, the other service will never receive requests.
- In the AWS Console: EC2 → Load Balancers → select the Colibri ALB → Listeners. Check rules and target groups.

## 5. Test backend health directly

If you have a running backend task IP (from ECS console or `describe-tasks`), you can test (optional):

```bash
curl -s http://<backend-task-ip>:3001/health
```

Or after the ALB: if you have a path that hits the backend (e.g. `/api/health`), try that URL; otherwise the ALB may only route `/api/*` to the backend.

---

**Summary:** Run `./deploy/check-health.sh`, ensure both services have Running ≥ 1 and target groups show healthy. If not, force new deployments and check CloudWatch logs for crashes.
