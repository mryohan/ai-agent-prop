#!/usr/bin/env bash
set -euo pipefail

#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy_production.sh PROJECT_ID IMAGE_TAG GS_BUCKET PROPERTIES_STORE [SENDGRID_SECRET_NAME] [REGION]
PROJECT_ID=${1:-}
IMAGE_TAG=${2:-latest}
GS_BUCKET=${3:-}
PROPERTIES_STORE=${4:-gcs}
SENDGRID_SECRET_NAME=${5:-}
REGION=${6:-us-central1}

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <PROJECT_ID> [IMAGE_TAG] [GS_BUCKET] [PROPERTIES_STORE]"
  exit 1
fi

# Load .env file if it exists to get email config
if [ -f .env ]; then
  # Read specific keys we need, handling potential spaces
  EMAIL_PROVIDER=$(grep "^EMAIL_PROVIDER=" .env | cut -d'=' -f2-)
  EMAIL_PROVIDER_ENDPOINT=$(grep "^EMAIL_PROVIDER_ENDPOINT=" .env | cut -d'=' -f2-)
  EMAIL_FROM=$(grep "^EMAIL_FROM=" .env | cut -d'=' -f2-)
  BREVO_API_KEY=$(grep "^BREVO_API_KEY=" .env | cut -d'=' -f2-)
  AGENT_NOTIFICATION_EMAIL=$(grep "^AGENT_NOTIFICATION_EMAIL=" .env | cut -d'=' -f2-)
  AGENT_NAME=$(grep "^AGENT_NAME=" .env | cut -d'=' -f2-)
  AGENT_PHONE=$(grep "^AGENT_PHONE=" .env | cut -d'=' -f2-)
  ADMIN_KEY=$(grep "^ADMIN_KEY=" .env | cut -d'=' -f2-)
fi

IMAGE=gcr.io/${PROJECT_ID}/ai-agent-prop:${IMAGE_TAG}

echo "Building and pushing image..."
docker build -t $IMAGE .
docker push $IMAGE

SERVICE_ACCOUNT=ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com

# Construct env vars string
ENV_VARS="GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID},PROPERTIES_STORE=${PROPERTIES_STORE},PROPERTIES_GCS_BUCKET=${GS_BUCKET},PROPERTIES_GCS_PATH=properties.json,MULTI_TENANT_MODE=true"

# Add Email Config if present
if [ -n "${EMAIL_PROVIDER:-}" ]; then ENV_VARS="${ENV_VARS},EMAIL_PROVIDER=${EMAIL_PROVIDER}"; fi
if [ -n "${EMAIL_PROVIDER_ENDPOINT:-}" ]; then ENV_VARS="${ENV_VARS},EMAIL_PROVIDER_ENDPOINT=${EMAIL_PROVIDER_ENDPOINT}"; fi
if [ -n "${EMAIL_FROM:-}" ]; then ENV_VARS="${ENV_VARS},EMAIL_FROM=${EMAIL_FROM}"; fi
if [ -n "${BREVO_API_KEY:-}" ]; then ENV_VARS="${ENV_VARS},BREVO_API_KEY=${BREVO_API_KEY}"; fi
if [ -n "${AGENT_NOTIFICATION_EMAIL:-}" ]; then ENV_VARS="${ENV_VARS},AGENT_NOTIFICATION_EMAIL=${AGENT_NOTIFICATION_EMAIL}"; fi
if [ -n "${AGENT_NAME:-}" ]; then ENV_VARS="${ENV_VARS},AGENT_NAME=${AGENT_NAME}"; fi
if [ -n "${AGENT_PHONE:-}" ]; then ENV_VARS="${ENV_VARS},AGENT_PHONE=${AGENT_PHONE}"; fi
if [ -n "${ADMIN_KEY:-}" ]; then ENV_VARS="${ENV_VARS},ADMIN_KEY=${ADMIN_KEY}"; fi

echo "Deploying Cloud Run service to region ${REGION}..."
gcloud run deploy ai-agent-prop \
  --image $IMAGE \
  --region ${REGION} \
  --platform managed \
  --service-account ${SERVICE_ACCOUNT} \
  --allow-unauthenticated \
  --set-env-vars "${ENV_VARS}" \
  ${SENDGRID_SECRET_NAME:+--update-secrets SENDGRID_API_KEY=${SENDGRID_SECRET_NAME}:latest} \
  --project=$PROJECT_ID

echo "Deployment complete. Run the service or open Cloud Run URL to verify."
