#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup_scheduler_for_job.sh PROJECT_ID [REGION]
PROJECT_ID=${1:-}
REGION=${2:-us-central1}

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <PROJECT_ID>"
  exit 1
fi

SA=ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com
JOB_NAME=ai-agent-prop-scrape
SCHEDULER_JOB=run-job-weekly
API_HOST="https://${REGION}-run.googleapis.com"
RUN_ENDPOINT="${API_HOST}/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/regions/${REGION}/jobs/${JOB_NAME}:run"

echo "Creating Cloud Scheduler HTTP job to run Cloud Run Job weekly"
gcloud scheduler jobs create http ${SCHEDULER_JOB} \
  --schedule="0 5 * * 1" \
  --time-zone="Etc/UTC" \
  --http-method=POST \
  --uri="${RUN_ENDPOINT}" \
  --oidc-service-account-email="${SA}" \
  --location="${REGION}" \
  --project=${PROJECT_ID} || echo "Scheduler job may already exist"

echo "Done. Cloud Scheduler will execute Cloud Run Job ${JOB_NAME} weekly in ${REGION}."
