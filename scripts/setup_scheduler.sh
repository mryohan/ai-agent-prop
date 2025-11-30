#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup_scheduler.sh PROJECT_ID BUCKET_NAME
PROJECT_ID=${1:-}
BUCKET_NAME=${2:-}

if [ -z "$PROJECT_ID" ] || [ -z "$BUCKET_NAME" ]; then
  echo "Usage: $0 <PROJECT_ID> <BUCKET_NAME>"
  exit 1
fi

echo "Creating Pub/Sub topic..."
gcloud pubsub topics create cloud-build-scrape-trigger --project=$PROJECT_ID || true

echo "Creating/Updating Cloud Build trigger..."
gcloud beta builds triggers create pubsub \
  --name="scrape-weekly" \
  --project=$PROJECT_ID \
  --topic="cloud-build-scrape-trigger" \
  --build-config=cloudbuild-scrape.yaml \
  --substitutions=_GCS_BUCKET=${BUCKET_NAME},_GCS_PATH=properties.json || echo "Trigger might already exist"

echo "Creating Cloud Scheduler job (weekly: Monday 04:00 UTC)..."
gcloud scheduler jobs create pubsub scrape-weekly \
  --project=$PROJECT_ID \
  --schedule="0 4 * * 1" \
  --topic="cloud-build-scrape-trigger" \
  --message-body="{}" \
  --time-zone="Etc/UTC" || echo "Scheduler job might already exist"

echo "Done. Cloud Build trigger and scheduler created."
