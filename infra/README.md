# Deploying AgentProbe to GKE

A single prod deployment with a Cloud SQL Proxy sidecar. No Helm, no ingress, no static IPs — access is via `kubectl port-forward`. Pods reach Postgres through the sidecar at `127.0.0.1:5432` and any other in-cluster service through normal cluster DNS.

Pieces:

- [`Dockerfile`](../Dockerfile) — multi-stage Bun build, exposes `:7878`.
- [`infra/k8s/manifest.yaml`](k8s/manifest.yaml) — `ServiceAccount` + `Service` + `Deployment` (with `cloud-sql-proxy` sidecar). Placeholders are filled in at deploy time.
- [`.github/workflows/build-deploy.yml`](../.github/workflows/build-deploy.yml) — builds, pushes to Google Artifact Registry, runs `envsubst | kubectl apply`.

The repository is public, so nothing here is tied to a specific GCP project, cluster, or domain. All environment-specific config lives in **GitHub Environment variables**.

## How it works

Push to `main` → builds the image, tags it with the short SHA, pushes to Artifact Registry, then renders [`manifest.yaml`](k8s/manifest.yaml) with `envsubst` and applies it. `workflow_dispatch` lets you pick a different environment by name (must match a GitHub Environment).

## One-time GCP setup

```bash
PROJECT_ID=my-project
REGION=us-east1
REPO=agentprobe
DEPLOY_SA=agentprobe-deploy
RUNTIME_SA=evals-runtime          # used by the in-cluster ServiceAccount via WI
POOL=github-actions
PROVIDER=github
GH_OWNER=<your-github-org-or-user>
GH_REPO=AgentProbe

# Artifact Registry repository
gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --project="$PROJECT_ID"

# GitHub Actions deploy SA
gcloud iam service-accounts create "$DEPLOY_SA" --project="$PROJECT_ID"
DEPLOY_EMAIL="${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_EMAIL}" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_EMAIL}" --role="roles/container.developer"

# Runtime SA — Cloud SQL Proxy authenticates as this via Workload Identity
gcloud iam service-accounts create "$RUNTIME_SA" --project="$PROJECT_ID"
RUNTIME_EMAIL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_EMAIL}" --role="roles/cloudsql.client"

# Workload Identity Pool + Provider locked to this repo
gcloud iam workload-identity-pools create "$POOL" \
    --project="$PROJECT_ID" --location=global

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --project="$PROJECT_ID" --location=global \
    --workload-identity-pool="$POOL" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GH_OWNER}/${GH_REPO}'"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

# Allow GitHub Actions to impersonate the deploy SA
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_EMAIL" \
    --project="$PROJECT_ID" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${GH_OWNER}/${GH_REPO}"

# Allow the in-cluster k8s SA "evals" in namespace "evals" to impersonate the runtime SA
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_EMAIL" \
    --project="$PROJECT_ID" \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:${PROJECT_ID}.svc.id.goog[evals/evals]"

echo "WORKLOAD_IDENTITY_PROVIDER=projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "DEPLOY_SERVICE_ACCOUNT=${DEPLOY_EMAIL}"
echo "GSA_EMAIL=${RUNTIME_EMAIL}"
```

## Configure GitHub Environment variables

Settings → Environments → `prod` (create the environment first) → set variables:

### Required

| Variable | Example |
| --- | --- |
| `GCP_PROJECT_ID` | `my-project` |
| `GCP_REGION` | `us-east1` |
| `GCP_ARTIFACT_REPOSITORY` | `agentprobe` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/123/locations/global/workloadIdentityPools/github-actions/providers/github` |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | `agentprobe-deploy@my-project.iam.gserviceaccount.com` |
| `GKE_CLUSTER` | `my-gke-cluster` |
| `GKE_LOCATION` | `us-east1-b` |
| `K8S_NAMESPACE` | `evals` |
| `GSA_EMAIL` | `evals-runtime@my-project.iam.gserviceaccount.com` |
| `CLOUD_SQL_INSTANCE` | `my-project:us-central1:my-instance` |

### Optional

| Variable | Default |
| --- | --- |
| `IMAGE_NAME` | `agentprobe` |
| `DEPLOY_BRANCH` | `main` |

No GitHub Actions secrets are required — Workload Identity Federation handles auth.

## Pre-create the runtime Secret

The manifest reads everything sensitive from a Secret named `evals-secrets` via `envFrom`. Create it once before the first deploy:

```bash
kubectl create namespace evals
kubectl create secret generic evals-secrets \
    --namespace evals \
    --from-literal=OPEN_ROUTER_API_KEY='sk-or-...' \
    --from-literal=AGENTPROBE_DB_URL='postgresql://USER:PASS@127.0.0.1:5432/DBNAME' \
    --from-literal=AGENTPROBE_ENCRYPTION_KEY="$(openssl rand -hex 32)"
```

`AGENTPROBE_DB_URL` points at `127.0.0.1:5432` because the Cloud SQL Proxy sidecar listens on the loopback interface inside the pod.

## Access the UI

```bash
kubectl port-forward -n evals svc/evals 7878:7878
```

Then open <http://localhost:7878>.

## Deploy from your laptop

```bash
NAMESPACE=evals \
IMAGE=us-east1-docker.pkg.dev/my-project/agentprobe/agentprobe \
TAG=latest \
GSA_EMAIL=evals-runtime@my-project.iam.gserviceaccount.com \
CLOUD_SQL_INSTANCE=my-project:us-central1:my-instance \
envsubst < infra/k8s/manifest.yaml | kubectl apply -f -
```
