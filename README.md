# ai-agent-prop
AI Agent for Real Estate Agent

## Deployment to Google Cloud (Cloud Run / Vertex AI)

This repository is a Node/Express API that integrates with Vertex AI's generative models. You can deploy the server on Google Cloud Run so it's always available to your website or services, using the Vertex AI client inside the container.

### Overview
- The app reads `properties.json` and exposes `/api/chat` for chat interactions.
- Environment variables: `GOOGLE_CLOUD_PROJECT_ID`, `PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`

### Prepare the environment and Service Account
1. Create or use an existing Google Cloud project.
2. Create a service account for Cloud Run to call Vertex AI and optionally access Secret Manager.
```bash
# Create the service account
gcloud iam service-accounts create ai-agent-prop-sa --project YOUR_PROJECT_ID

# Grant permissions needed for Vertex AI, Cloud Run, and Secret Manager (if using secrets)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:ai-agent-prop-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:ai-agent-prop-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/run.invoker"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:ai-agent-prop-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

3. (Optional) If your app needs to store email credentials, add them to Secret Manager and grant the service account access.
```bash
gcloud secrets create EMAIL_USER --data-file=- <<EOF
your-email@example.com
EOF
gcloud secrets create EMAIL_PASSWORD --data-file=- <<EOF
your-email-password
EOF
gcloud secrets add-iam-policy-binding EMAIL_USER --member="serviceAccount:ai-agent-prop-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding EMAIL_PASSWORD --member="serviceAccount:ai-agent-prop-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

### Build and Deploy using Cloud Run (manual)
```bash
# Build the container
PROJECT_ID=YOUR_PROJECT_ID
IMAGE=gcr.io/$PROJECT_ID/ai-agent-prop:latest
docker build -t $IMAGE .
docker push $IMAGE

# Deploy to Cloud Run
gcloud run deploy ai-agent-prop \
	--image $IMAGE \
	--region us-central1 \
	--platform managed \
	--allow-unauthenticated \
	--service-account ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com \
	--set-env-vars GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID},PORT=8080
```

If you used Secret Manager for EMAIL credentials, attach them as env vars at deployment using `--update-secrets` or by exposing them as environment variables during deploy.

Example using `--update-secrets` during deploy:
```bash
gcloud run deploy ai-agent-prop \
	--image $IMAGE \
	--region us-central1 \
	--platform managed \
	--allow-unauthenticated \
	--service-account ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com \
	--set-env-vars GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID},PORT=8080 \
	--update-secrets EMAIL_USER=EMAIL_USER:latest \
	--update-secrets EMAIL_PASSWORD=EMAIL_PASSWORD:latest
```

### Add Cloud Build & CI (optional)
If you connect a repo to Cloud Build, the included `cloudbuild.yaml` provides a minimal pipeline to build, push, and deploy to Cloud Run automatically.

### Schedule weekly updates (recommendation)
Here's a recommended pattern to keep `properties.json` up-to-date weekly:

1) Create or choose a GCS bucket to store `properties.json` and give your service account write access:

```bash
GS_BUCKET=YOUR_BUCKET_NAME
gsutil mb -l us-central1 gs://$GS_BUCKET
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com" --role="roles/storage.objectAdmin"
```

2) Use Cloud Build to run the scraper and upload to GCS. We included `cloudbuild-scrape.yaml`. You can trigger it manually to verify:

```bash
gcloud builds submit --config=cloudbuild-scrape.yaml --substitutions=_GCS_BUCKET=${GS_BUCKET},_GCS_PATH=properties.json
```

3) Create a Cloud Scheduler job to run weekly and trigger the Cloud Build pipeline. Example using HTTP call to the Cloud Build API with service account auth:

```bash
# Create a Pub/Sub topic used by Cloud Scheduler to send messages (optional path)
gcloud pubsub topics create cloud-build-scrape-trigger

# Create a Cloud Build trigger that listens for messages on that topic (or you can create a manual trigger that runs the config)
gcloud beta builds triggers create pubsub --name="scrape-weekly" --topic="cloud-build-scrape-trigger" --project=$PROJECT_ID --include-build-config --build-config=cloudbuild-scrape.yaml --substitutions=_GCS_BUCKET=${GS_BUCKET},_GCS_PATH=properties.json

# Create scheduler job that publishes to the topic weekly
gcloud scheduler jobs create pubsub scrape-weekly --schedule="0 4 * * 1" --topic="cloud-build-scrape-trigger" --message-body="{}" --time-zone="Etc/UTC"
```

4) Alternatively, you can use Cloud Run Jobs or a Cloud Function triggered by Cloud Scheduler to run the scraper; whichever you prefer. Cloud Run Jobs are ideal for containerized one-off tasks.

### Use Pub/Sub push (no-polling) to update properties in real-time
- If you prefer the server to react immediately when `properties.json` is updated in Cloud Storage, you can enable Cloud Storage to publish notifications to a Pub/Sub topic and configure the topic to push to the Cloud Run service.
- Configure Pub/Sub push with OIDC token to secure the endpoint. Set `PUBSUB_AUTH_AUDIENCE` to the push endpoint audience (set to your Cloud Run URL) and deploy the server with the same `PUBSUB_AUTH_AUDIENCE` value.

Example:
```bash
# Create Pub/Sub topic for storage notifications
gcloud pubsub topics create properties-updates --project=$PROJECT_ID

# Create a Pub/Sub subscription with push config to Cloud Run
gcloud pubsub subscriptions create properties-updates-sub \
	--topic=properties-updates \
	--push-endpoint=https://YOUR_CLOUD_RUN_URL/gcs-notify \
	--push-auth-service-account=ai-agent-prop-sa@${PROJECT_ID}.iam.gserviceaccount.com \
	--project=$PROJECT_ID

# Enable bucket to publish notifications to this topic
gsutil notification create -t properties-updates -f json gs://$GS_BUCKET
```

Now your server will accept push notifications at `/gcs-notify` and will reload the properties from GCS when the configured `PROPERTIES_GCS_PATH` object is updated.

### Use Firestore-backed properties
- If you prefer a database-backed approach, set `PROPERTIES_STORE=firestore` and `PROPERTIES_FIRESTORE_COLLECTION=properties`.
- Use `scripts/migrate_to_firestore.js` to migrate existing `properties.json` into Firestore.

```bash
# Migrate properties.json into Firestore
PROJECT_ID=$PROJECT_ID
gcloud auth application-default login
node scripts/migrate_to_firestore.js
```

When Firestore is used, the server will listen to live snapshot updates and update the in-memory properties automatically without polling.

### Runtime integration in the app
The server automatically loads `properties.json` from local FS if `PROPERTIES_GCS_BUCKET` is not set; otherwise it will fetch from GCS using `PROPERTIES_GCS_BUCKET` and `PROPERTIES_GCS_PATH`. To enable GCS-backed properties, deploy your server with these env vars:

```bash
gcloud run deploy ai-agent-prop ... --set-env-vars PROPERTIES_GCS_BUCKET=$GS_BUCKET,PROPERTIES_GCS_PATH=properties.json
```

The service periodically polls GCS to refresh the in-memory properties list based on `PROPERTIES_POLL_SEC` (default 3600s). This keeps the server in sync with the weekly scrape without restarting the service.

Tip: If you schedule scrapes weekly, set `PROPERTIES_POLL_SEC` to a lower interval (e.g., 900 or 3600 seconds) so the server picks up the updated file shortly after the weekly run. If you prefer less frequent polling, set it to a higher value to reduce GCS reads. Example for 15-minute refreshes:

```bash
gcloud run deploy ai-agent-prop ... --set-env-vars PROPERTIES_GCS_BUCKET=${GS_BUCKET},PROPERTIES_GCS_PATH=properties.json,PROPERTIES_POLL_SEC=900
```


### Security and Scaling
- Use Secret Manager for sensitive credentials rather than storing them in `.env`.
- Configure concurrency, CPU/memory in Cloud Run for performance & costs.
- Add a custom domain or restrict access with authentication if you don’t want the endpoint public.

### Notes specific to Vertex AI usage
- The container must run with credentials (usually via the Cloud Run service account). If running locally, `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS` to a service account key.
- Make sure the service account has `roles/aiplatform.user` to call Vertex AI.
 - For sending email without storing a password in env vars, we recommend using SendGrid (preferred) or other transactional mail providers; store the API keys in Secret Manager and use `--update-secrets` to expose them to the container at runtime.
 - If you want to use Gmail API to send email without a password, you must configure domain-wide delegation on a service account and deploy the app with that service account; otherwise SendGrid or SMTP with credentials stored in Secret Manager remains the simplest approach.

#### Gmail API (Domain Wide Delegation)
If your organization uses Google Workspace and you prefer to use Gmail without storing a password, you can use a service account with domain-wide delegation:

1. Create service account and enable Domain Wide Delegation in the service account settings.
2. In your Google Workspace Admin Console, grant the service account client ID the following OAuth scope: `https://www.googleapis.com/auth/gmail.send`.
3. Create a JSON key for the service account and store it securely (Secret Manager), or ensure the Cloud Run instance runs with the service account as `--service-account` so ADC is in effect.
4. In your Node app, create a delegated JWT client which impersonates the user to send the email via Gmail API. (We'll provide example code if you choose to use Gmail API.)

Note: This is an advanced setup and requires admin permissions.

### Deploying to production with ADC and secrets
We've included a helper script to build and deploy your Cloud Run service using your current gcloud credentials:

```bash
chmod +x ./scripts/deploy_production.sh
./scripts/deploy_production.sh $PROJECT_ID latest $GS_BUCKET gcs YOUR_SENDGRID_SECRET_NAME
```

Use `PROPERTIES_STORE=firestore` to deploy using Firestore instead of GCS. Also use `--update-secrets` to expose secrets such as `SENDGRID_API_KEY` onto the instance without storing them in environment variables.

### Quick checklist before production deploy
1. Create and configure `ai-agent-prop-sa` service account and grant the following roles: `roles/run.invoker`, `roles/aiplatform.user`, `roles/storage.objectViewer`, `roles/secretmanager.secretAccessor`, `roles/datastore.user` (Firestore), `roles/pubsub.subscriber` (if using Pub/Sub).
2. Add necessary secrets to Secret Manager (e.g., `SENDGRID_API_KEY`) and grant the service account access.
3. Build and push the container, then deploy using `scripts/deploy_production.sh` or `gcloud run deploy` with the appropriate env vars.

### One-step setup script
If you prefer an all-in-one script to create the bucket, service account, roles, and deploy the Cloud Run service + job, use:

```bash
chmod +x ./scripts/setup_production.sh
./scripts/setup_production.sh $PROJECT_ID $GS_BUCKET [gcs|firestore] [SENDGRID_SECRET_NAME]
```

This script will also create a Cloud Run Job for the scraper and configure a Cloud Scheduler trigger to run the job weekly.

### Note about `properties.json`
- The app loads `properties.json` from the container file system by default. If you want dynamic updates in production consider one of these options:
	- Store the file in a Cloud Storage bucket and update `server.js` to read from GCS at startup.
	- Keep the file inside the container and rebuild the image after a catalog refresh (easy but requires a build each update).
	- Move property data to a database (e.g., Firestore/Cloud SQL) and update the backend to fetch data from that store.

