# Colibri Data Zone

A data registration and governance portal inspired by AWS DataZone. Colibri Data Zone provides a centralized platform for managing your organization's data assets, domains, business glossary, and data lineage.

## Features

- **Data Catalog**: Register, browse, and search data assets across your organization
- **Domain Management**: Organize assets into logical business domains
- **Data Governance**: Classify data sensitivity, assign ownership, and manage access
- **Business Glossary**: Define and maintain business terminology
- **Data Lineage**: Visualize data flow and dependencies with interactive graphs
- **Simple Authentication**: JWT-based auth with role-based access control

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, React Query, React Flow |
| Backend | Node.js, Express, TypeScript |
| Database | DynamoDB (single-table design) |
| Auth | JWT tokens |
| Containerization | Docker, Docker Compose |

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- AWS CLI (for production deployment)

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
cd colibri-data-zone

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
cd ..
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env
```

The default `.env` works for local development. Key variables:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE=ColibriDataZone
JWT_SECRET=your-local-dev-secret
```

### 3. Start DynamoDB Local

```bash
# Start DynamoDB Local and Admin UI
docker-compose up -d

# Verify it's running
docker-compose ps
```

DynamoDB Admin UI will be available at http://localhost:8001

### 4. Create Database Table

```bash
cd backend
npm run create-table
```

### 5. Seed Sample Data

```bash
npm run seed
```

This creates sample users, domains, assets, glossary terms, and lineage connections.

**Test Credentials:**
- Admin: `admin@colibri.io` / `admin123`
- Data Steward: `steward@colibri.io` / `steward123`
- Analyst: `analyst@colibri.io` / `analyst123`

### 6. Start Development Servers

**Option A: Run both simultaneously (recommended)**

```bash
# From root directory
npm run dev
```

**Option B: Run separately**

```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

### 7. Access the Application

Open http://localhost:5173 in your browser and login with the test credentials.

## Project Structure

```
colibri-data-zone/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── Layout/       # Sidebar, Header, MainLayout
│   │   │   └── ui/           # Badge, Card, Modal, etc.
│   │   ├── pages/            # Route pages
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Assets.tsx
│   │   │   ├── AssetDetail.tsx
│   │   │   ├── Domains.tsx
│   │   │   ├── Glossary.tsx
│   │   │   └── Lineage.tsx
│   │   ├── services/         # API client
│   │   ├── store/            # Zustand auth store
│   │   ├── types/            # TypeScript interfaces
│   │   └── App.tsx           # Router setup
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                  # Express API
│   ├── src/
│   │   ├── config/           # Database, constants
│   │   ├── middleware/       # Auth, validation
│   │   ├── models/           # DynamoDB models
│   │   ├── routes/           # API routes
│   │   ├── scripts/          # DB setup scripts
│   │   ├── types/            # TypeScript interfaces
│   │   └── index.ts          # Entry point
│   └── Dockerfile
├── deploy/                   # Deployment configs
│   ├── ecs-task-definition-backend.json
│   ├── ecs-task-definition-frontend.json
│   ├── cloudformation-dynamodb.yaml
│   └── iam-policy.json
├── docker-compose.yml        # Local development
├── docker-compose.prod.yml   # Production testing
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Assets
- `GET /api/assets` - List assets (supports `?search=` and `?domainId=`)
- `GET /api/assets/:id` - Get asset details
- `POST /api/assets` - Create asset (DataSteward+)
- `PUT /api/assets/:id` - Update asset (DataSteward+)
- `DELETE /api/assets/:id` - Delete asset (DataSteward+)

### Domains
- `GET /api/domains` - List domains
- `GET /api/domains/:id` - Get domain
- `POST /api/domains` - Create domain (DataOwner+)
- `PUT /api/domains/:id` - Update domain (DataOwner+)
- `DELETE /api/domains/:id` - Delete domain (DataOwner+)

### Glossary
- `GET /api/glossary` - List terms (supports `?search=`)
- `GET /api/glossary/:id` - Get term
- `POST /api/glossary` - Create term (DataSteward+)
- `PUT /api/glossary/:id` - Update term (DataSteward+)
- `DELETE /api/glossary/:id` - Delete term (DataSteward+)

### Lineage
- `GET /api/lineage` - List all edges
- `GET /api/lineage/graph/:assetId` - Get lineage graph
- `POST /api/lineage` - Create edge (DataSteward+)
- `DELETE /api/lineage/:sourceId/:targetId` - Delete edge (DataSteward+)

### Stats
- `GET /api/stats/dashboard` - Dashboard statistics

## User Roles

| Role | Permissions |
|------|-------------|
| Admin | Full access to all features |
| DataOwner | Create/manage domains, all DataSteward permissions |
| DataSteward | Create/manage assets, glossary, lineage |
| Analyst | Read access to all data |
| Viewer | Read access to all data |

## Production Deployment to ECS

### 1. Create DynamoDB Table

```bash
aws cloudformation deploy \
  --template-file deploy/cloudformation-dynamodb.yaml \
  --stack-name colibri-dynamodb \
  --parameter-overrides Environment=production
```

### 2. Create ECR Repositories

```bash
aws ecr create-repository --repository-name colibri-backend
aws ecr create-repository --repository-name colibri-frontend
```

### 3. Build and Push Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
cd backend
docker build -t colibri-backend .
docker tag colibri-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/colibri-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/colibri-backend:latest

# Build and push frontend
cd ../frontend
docker build -t colibri-frontend .
docker tag colibri-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/colibri-frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/colibri-frontend:latest
```

### 4. Create IAM Role for ECS Tasks

Create a role with the policy in `deploy/iam-policy.json` attached.

### 5. Store Secrets

```bash
aws secretsmanager create-secret \
  --name colibri/jwt-secret \
  --secret-string "your-production-jwt-secret"
```

### 6. Update Task Definitions

Edit the task definitions in `deploy/` to replace:
- `YOUR_ACCOUNT_ID` with your AWS account ID
- `YOUR_REGION` with your AWS region

### 7. Register Task Definitions

```bash
aws ecs register-task-definition --cli-input-json file://deploy/ecs-task-definition-backend.json
aws ecs register-task-definition --cli-input-json file://deploy/ecs-task-definition-frontend.json
```

### 8. Create ECS Cluster and Services

```bash
# Create cluster
aws ecs create-cluster --cluster-name colibri-cluster

# Create backend service
aws ecs create-service \
  --cluster colibri-cluster \
  --service-name colibri-backend \
  --task-definition colibri-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"

# Create frontend service
aws ecs create-service \
  --cluster colibri-cluster \
  --service-name colibri-frontend \
  --task-definition colibri-frontend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### 9. Configure Application Load Balancer

1. Create an ALB in your VPC
2. Create target groups for frontend (port 80) and backend (port 3001)
3. Configure listener rules:
   - `/api/*` → backend target group
   - `/*` → frontend target group

## Testing Production Build Locally

```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up --build

# Access at http://localhost
```

## Troubleshooting

### DynamoDB Connection Issues
- Ensure Docker is running: `docker-compose ps`
- Check DynamoDB endpoint: `curl http://localhost:8000`
- Verify table exists: Visit http://localhost:8001

### Frontend Can't Reach Backend
- Check backend is running on port 3001
- Verify Vite proxy in `frontend/vite.config.ts`
- Check CORS settings in `backend/src/index.ts`

### Authentication Errors
- Clear browser localStorage
- Verify JWT_SECRET matches between sessions
- Check token expiration (24h default)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
