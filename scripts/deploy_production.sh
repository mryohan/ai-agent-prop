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

IMAGE=gcr.io/${PROJECT_ID}/ai-agent-prop:${IMAGE_TAG}

echo "Building and pushing image..."
docker build -t $IMAGE .
docker push $IMAGE

SERVICE_ACCOUNT=ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com

echo "Deploying Cloud Run service to region ${REGION}..."
gcloud run deploy ai-agent-prop \
  --image $IMAGE \
  --region ${REGION} \
  --platform managed \
  --service-account ${SERVICE_ACCOUNT} \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID},PROPERTIES_STORE=${PROPERTIES_STORE},PROPERTIES_GCS_BUCKET=${GS_BUCKET},PROPERTIES_GCS_PATH=properties.json" \
  ${SENDGRID_SECRET_NAME:+--update-secrets SENDGRID_API_KEY=${SENDGRID_SECRET_NAME}:latest} \
  --project=$PROJECT_ID

echo "Deployment complete. Run the service or open Cloud Run URL to verify."
