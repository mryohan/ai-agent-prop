#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup_pubsub_push.sh PROJECT_ID GS_BUCKET CLOUD_RUN_SERVICE_URL
PROJECT_ID=${1:-}
GS_BUCKET=${2:-}
CLOUD_RUN_URL=${3:-}

if [ -z "$PROJECT_ID" ] || [ -z "$GS_BUCKET" ] || [ -z "$CLOUD_RUN_URL" ]; then
  echo "Usage: $0 <PROJECT_ID> <GS_BUCKET> <CLOUD_RUN_SERVICE_URL>"
  exit 1
fi

echo "Creating Pub/Sub topic for storage notifications..."
TOPIC=properties-updates
gcloud pubsub topics create $TOPIC --project=$PROJECT_ID || true

echo "Creating Pub/Sub subscription (push) to Cloud Run endpoint (OIDC auth using service account)."
SUBS=properties-updates-sub
SERVICE_ACCOUNT=ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com
gcloud pubsub subscriptions create $SUBS \
  --topic=$TOPIC \
  --push-endpoint=${CLOUD_RUN_URL}/gcs-notify \
  --push-auth-service-account=${SERVICE_ACCOUNT} \
  --project=$PROJECT_ID || true

echo "Setting up Cloud Storage notification to publish events to $TOPIC"
gsutil notification create -t $TOPIC -f json gs://${GS_BUCKET}

echo "IMPORTANT: After this runs, set CLOUD_RUN endpoint Audience (PUBSUB_AUTH_AUDIENCE) to the Cloud Run service with the same host."
echo "You can retrieve the Cloud Run URL if you don't already have it:"
echo "gcloud run services describe ai-agent-prop --project=${PROJECT_ID} --region=us-central1 --format='value(status.url)'"
echo "Done. Cloud Storage will now publish change events to Pub/Sub and the subscription will push to the Cloud Run /gcs-notify endpoint."
#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup_pubsub_push.sh PROJECT_ID GS_BUCKET CLOUD_RUN_URL
PROJECT_ID=${1:-}
GS_BUCKET=${2:-}
CLOUD_RUN_URL=${3:-}

if [ -z "$PROJECT_ID" ] || [ -z "$GS_BUCKET" ] || [ -z "$CLOUD_RUN_URL" ]; then
  echo "Usage: $0 <PROJECT_ID> <GCS_BUCKET> <CLOUD_RUN_URL>"
  exit 1
fi

TOPIC=properties-updates
SUBSCRIPTION=properties-updates-sub
SERVICE_ACCOUNT=ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com

echo "Creating Pub/Sub topic: $TOPIC"
gcloud pubsub topics create $TOPIC --project=$PROJECT_ID || true

echo "Creating Pub/Sub subscription with OIDC push to Cloud Run endpoint"
gcloud pubsub subscriptions create $SUBSCRIPTION \
  --topic=$TOPIC \
  --push-endpoint=${CLOUD_RUN_URL}/gcs-notify \
  --push-auth-service-account=${SERVICE_ACCOUNT} \
  --project=$PROJECT_ID || echo "Subscription might already exist"

echo "Creating Cloud Storage notification to publish to topic"
gsutil notification create -t $TOPIC -f json gs://$GS_BUCKET || echo "Notification might already exist"

echo "Done. Make sure Cloud Run deployed with env var PUBSUB_AUTH_AUDIENCE=${CLOUD_RUN_URL}"
