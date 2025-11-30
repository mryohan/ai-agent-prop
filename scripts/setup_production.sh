#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup_production.sh PROJECT_ID GS_BUCKET PROPERTIES_STORE [SENDGRID_SECRET_NAME] [REGION]
PROJECT_ID=${1:-}
GS_BUCKET=${2:-}
PROPERTIES_STORE=${3:-gcs}
SENDGRID_SECRET_NAME=${4:-}
REGION=${5:-us-central1}

if [ -z "$PROJECT_ID" ] || [ -z "$GS_BUCKET" ]; then
  echo "Usage: $0 <PROJECT_ID> <GS_BUCKET> [gcs|firestore] [SENDGRID_SECRET_NAME]"
  exit 1
fi

# Create service account
SA=ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com
echo "Creating service account $SA (if not exist)" || true
gcloud iam service-accounts create ai-agent-prop-sa --project=${PROJECT_ID} || true

# Grant roles
echo "Granting roles to service account..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${SA}" --role="roles/run.invoker" || true
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${SA}" --role="roles/aiplatform.user" || true
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${SA}" --role="roles/secretmanager.secretAccessor" || true
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${SA}" --role="roles/storage.objectAdmin" || true
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${SA}" --role="roles/datastore.user" || true
gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${SA}" --role="roles/pubsub.publisher" || true

echo "Creating GCS bucket if not exists..."
gsutil ls -b gs://${GS_BUCKET} >/dev/null 2>&1 || gsutil mb -l us-central1 gs://${GS_BUCKET}

echo "Granting storage bucket permission to service account"
gsutil iam ch serviceAccount:${SA}:objectAdmin gs://${GS_BUCKET} || true

# Build and push image
IMAGE=gcr.io/${PROJECT_ID}/ai-agent-prop:latest
echo "Building image ${IMAGE}..."
docker build -t ${IMAGE} .
docker push ${IMAGE}

echo "Deploying Cloud Run service ai-agent-prop to region ${REGION}..."
CMD="gcloud run deploy ai-agent-prop --image ${IMAGE} --region ${REGION} --platform managed --service-account ${SA} --allow-unauthenticated --set-env-vars GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID},PROPERTIES_STORE=${PROPERTIES_STORE},PROPERTIES_GCS_BUCKET=${GS_BUCKET},PROPERTIES_GCS_PATH=properties.json"
if [ -n "${SENDGRID_SECRET_NAME}" ]; then
  echo "Passing --update-secrets for ${SENDGRID_SECRET_NAME}"
  CMD="$CMD --update-secrets SENDGRID_API_KEY=${SENDGRID_SECRET_NAME}:latest"
fi
echo $CMD
eval $CMD

echo "Creating Cloud Run job for scraper (ai-agent-prop-scrape)"
JOB_IMAGE=gcr.io/${PROJECT_ID}/ai-agent-prop:scrape
docker build -t ${JOB_IMAGE} .
docker push ${JOB_IMAGE}
gcloud run jobs describe ai-agent-prop-scrape --region=${REGION} --project=${PROJECT_ID} >/dev/null 2>&1 || \
  gcloud run jobs create ai-agent-prop-scrape \
    --image ${JOB_IMAGE} \
    --region=${REGION} \
    --task-timeout=600s \
    --memory=512Mi \
    --project=${PROJECT_ID} \
    --set-env-vars=GCS_BUCKET=${GS_BUCKET},GCS_PATH=properties.json \
    --command=node \
    --args=scraper.js

echo "Enable Pub/Sub push notifications from GCS"
bash ./scripts/setup_pubsub_push.sh ${PROJECT_ID} ${GS_BUCKET} $(gcloud run services describe ai-agent-prop --region=${REGION} --format='value(status.url)' --project=${PROJECT_ID})

echo "Configure Cloud Scheduler to run job weekly via build trigger"
bash ./scripts/setup_scheduler_for_job.sh ${PROJECT_ID} ${REGION}

if [ "$PROPERTIES_STORE" = "firestore" ]; then
  echo "Migrating properties into Firestore collection..."
  # Ensure application default credentials are set and Firestore APIs enabled
  node scripts/migrate_to_firestore.js
fi

echo "Production deployment and scheduler setup complete. Review Cloud Run and Cloud Scheduler to verify all resources."
