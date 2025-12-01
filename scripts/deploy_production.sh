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
  # Read specific keys we need, handling potential spaces and removing carriage returns
  EMAIL_PROVIDER=$(grep "^EMAIL_PROVIDER=" .env | cut -d'=' -f2- | tr -d '\r')
  EMAIL_PROVIDER_ENDPOINT=$(grep "^EMAIL_PROVIDER_ENDPOINT=" .env | cut -d'=' -f2- | tr -d '\r')
  EMAIL_FROM=$(grep "^EMAIL_FROM=" .env | cut -d'=' -f2- | tr -d '\r')
  BREVO_API_KEY=$(grep "^BREVO_API_KEY=" .env | cut -d'=' -f2- | tr -d '\r')
  AGENT_NOTIFICATION_EMAIL=$(grep "^AGENT_NOTIFICATION_EMAIL=" .env | cut -d'=' -f2- | tr -d '\r')
  AGENT_NAME=$(grep "^AGENT_NAME=" .env | cut -d'=' -f2- | tr -d '\r')
  AGENT_PHONE=$(grep "^AGENT_PHONE=" .env | cut -d'=' -f2- | tr -d '\r')
  ADMIN_KEY=$(grep "^ADMIN_KEY=" .env | cut -d'=' -f2- | tr -d '\r')
  VERTEX_AI_LOCATION=$(grep "^VERTEX_AI_LOCATION=" .env | cut -d'=' -f2- | tr -d '\r')
fi

IMAGE=gcr.io/${PROJECT_ID}/ai-agent-prop:${IMAGE_TAG}

echo "Building and pushing image..."
docker build -t $IMAGE .
docker push $IMAGE

SERVICE_ACCOUNT=ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com

# Create a temp file for env vars to safely handle spaces and special characters
ENV_FILE="env_vars_$(date +%s).yaml"
cat > "$ENV_FILE" <<EOF
GOOGLE_CLOUD_PROJECT_ID: "${PROJECT_ID}"
PROPERTIES_STORE: "${PROPERTIES_STORE}"
PROPERTIES_GCS_BUCKET: "${GS_BUCKET}"
PROPERTIES_GCS_PATH: "properties.json"
MULTI_TENANT_MODE: "true"
EOF

# Add Email Config if present
if [ -n "${EMAIL_PROVIDER:-}" ]; then echo "EMAIL_PROVIDER: \"${EMAIL_PROVIDER}\"" >> "$ENV_FILE"; fi
if [ -n "${EMAIL_PROVIDER_ENDPOINT:-}" ]; then echo "EMAIL_PROVIDER_ENDPOINT: \"${EMAIL_PROVIDER_ENDPOINT}\"" >> "$ENV_FILE"; fi
if [ -n "${EMAIL_FROM:-}" ]; then echo "EMAIL_FROM: \"${EMAIL_FROM}\"" >> "$ENV_FILE"; fi
if [ -n "${BREVO_API_KEY:-}" ]; then echo "BREVO_API_KEY: \"${BREVO_API_KEY}\"" >> "$ENV_FILE"; fi
if [ -n "${AGENT_NOTIFICATION_EMAIL:-}" ]; then echo "AGENT_NOTIFICATION_EMAIL: \"${AGENT_NOTIFICATION_EMAIL}\"" >> "$ENV_FILE"; fi
if [ -n "${AGENT_NAME:-}" ]; then echo "AGENT_NAME: \"${AGENT_NAME}\"" >> "$ENV_FILE"; fi
if [ -n "${AGENT_PHONE:-}" ]; then echo "AGENT_PHONE: \"${AGENT_PHONE}\"" >> "$ENV_FILE"; fi
if [ -n "${ADMIN_KEY:-}" ]; then echo "ADMIN_KEY: \"${ADMIN_KEY}\"" >> "$ENV_FILE"; fi
if [ -n "${VERTEX_AI_LOCATION:-}" ]; then echo "VERTEX_AI_LOCATION: \"${VERTEX_AI_LOCATION}\"" >> "$ENV_FILE"; fi

echo "Deploying Cloud Run service to region ${REGION}..."
gcloud run deploy ai-agent-prop \
  --image $IMAGE \
  --region ${REGION} \
  --platform managed \
  --service-account ${SERVICE_ACCOUNT} \
  --allow-unauthenticated \
  --env-vars-file "$ENV_FILE" \
  ${SENDGRID_SECRET_NAME:+--update-secrets SENDGRID_API_KEY=${SENDGRID_SECRET_NAME}:latest} \
  --project=$PROJECT_ID

# Cleanup
rm "$ENV_FILE"

echo "Deployment complete. Run the service or open Cloud Run URL to verify."
