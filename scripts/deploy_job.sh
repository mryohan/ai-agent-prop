#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID=${1:-}
GS_BUCKET=${2:-}
REGION=${3:-us-central1}
IMAGE=gcr.io/${PROJECT_ID}/ai-agent-prop:scrape

if [ -z "$PROJECT_ID" ] || [ -z "$GS_BUCKET" ]; then
  echo "Usage: $0 <PROJECT_ID> <GCS_BUCKET>"
  exit 1
fi

# Build and push image for the job
echo "Building image $IMAGE..."
docker build -t $IMAGE .
docker push $IMAGE

echo "Creating Cloud Run job in region ${REGION}..."
gcloud run jobs describe ai-agent-prop-scrape --project=$PROJECT_ID --region=${REGION} >/dev/null 2>&1 || \
  gcloud run jobs create ai-agent-prop-scrape \
    --image $IMAGE \
    --region=${REGION} \
    --task-timeout=600s \
    --memory=512Mi \
    --project=$PROJECT_ID \
    --set-env-vars=GCS_BUCKET=${GS_BUCKET},GCS_PATH=properties.json \
    --command=node \
    --args=scraper.js

echo "Job created or already exists. Run it manually to test:"
echo "gcloud run jobs execute ai-agent-prop-scrape --region=${REGION} --project=$PROJECT_ID"
