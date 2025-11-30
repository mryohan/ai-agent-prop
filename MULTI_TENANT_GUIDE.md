# Multi-Tenant Setup Guide

This guide explains how to configure the AI chat agent to serve multiple websites, each with their own property listings.

## Architecture Overview

In multi-tenant mode:
- Each website/domain is identified by a **Tenant ID**
- Properties are stored separately per tenant:
  - **GCS**: `{tenant-id}/properties.json`
  - **Firestore**: `properties_{tenant-id}` collection
- The chat widget sends the tenant ID with each request
- Server loads and caches properties per tenant

## Configuration Steps

### 1. Enable Multi-Tenant Mode

Set in your environment variables (Cloud Run or `.env`):

```bash
MULTI_TENANT_MODE=true
```

### 2. Structure Your GCS Bucket

Organize properties by tenant ID:

```
gs://your-bucket/
├── tenant1.com/
│   └── properties.json
├── tenant2.com/
│   └── properties.json
└── default/
    └── properties.json
```

### 3. Configure Each Website

Add `data-tenant-id` to the chat widget HTML on each website:

```html
<!-- Website 1: example1.com -->
<div id="chat-widget" data-tenant-id="example1.com">
    <!-- chat widget HTML -->
</div>

<!-- Website 2: example2.com -->
<div id="chat-widget" data-tenant-id="example2.com">
    <!-- chat widget HTML -->
</div>
```

The widget will automatically send the tenant ID with each API request.

### 4. Run Scraper Per Tenant

For each website, run the scraper with tenant-specific configuration:

```bash
# Scrape for tenant1.com
export TENANT_ID=tenant1.com
export SCRAPE_BASE_URL=https://site1-listings.example.com
export MULTI_TENANT_MODE=true
node scraper.js

# Scrape for tenant2.com
export TENANT_ID=tenant2.com
export SCRAPE_BASE_URL=https://site2-listings.example.com
export MULTI_TENANT_MODE=true
node scraper.js
```

Or create separate Cloud Run Jobs:

```bash
# Create job for tenant1
gcloud run jobs create scraper-tenant1 \
  --image gcr.io/PROJECT_ID/ai-agent-prop:scrape \
  --region asia-southeast2 \
  --set-env-vars=TENANT_ID=tenant1.com,SCRAPE_BASE_URL=https://site1.example.com,MULTI_TENANT_MODE=true,GCS_BUCKET=your-bucket,GCS_PATH=tenant1.com/properties.json \
  --command=node \
  --args=scraper.js

# Create job for tenant2
gcloud run jobs create scraper-tenant2 \
  --image gcr.io/PROJECT_ID/ai-agent-prop:scrape \
  --region asia-southeast2 \
  --set-env-vars=TENANT_ID=tenant2.com,SCRAPE_BASE_URL=https://site2.example.com,MULTI_TENANT_MODE=true,GCS_BUCKET=your-bucket,GCS_PATH=tenant2.com/properties.json \
  --command=node \
  --args=scraper.js
```

### 5. Update Cloud Scheduler (Optional)

Create separate weekly scrapers per tenant:

```bash
# Schedule tenant1 scraper
gcloud scheduler jobs create http scraper-tenant1-weekly \
  --schedule="0 5 * * 1" \
  --uri="https://asia-southeast2-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT_ID/regions/asia-southeast2/jobs/scraper-tenant1:run" \
  --http-method=POST \
  --oidc-service-account-email=ai-agent-prop-sa@PROJECT_ID.iam.gserviceaccount.com \
  --location=asia-southeast2

# Schedule tenant2 scraper
gcloud scheduler jobs create http scraper-tenant2-weekly \
  --schedule="0 6 * * 1" \
  --uri="https://asia-southeast2-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/PROJECT_ID/regions/asia-southeast2/jobs/scraper-tenant2:run" \
  --http-method=POST \
  --oidc-service-account-email=ai-agent-prop-sa@PROJECT_ID.iam.gserviceaccount.com \
  --location=asia-southeast2
```

## API Request Format

The chat widget automatically includes the tenant ID via:

1. **Header**: `X-Tenant-ID: tenant1.com`
2. **Body field**: `"tenant": "tenant1.com"`
3. **Query param**: `?tenant=tenant1.com` (fallback)

Example request:

```bash
curl -X POST https://your-service.run.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: tenant1.com" \
  -d '{
    "message": "Show me apartments in Jakarta",
    "tenant": "tenant1.com"
  }'
```

## How It Works

1. **Client sends request** with tenant ID (via header/body)
2. **Server extracts tenant ID** using `getTenantId(req)`
3. **Server loads tenant properties**:
   - Checks cache first
   - If expired or missing, loads from GCS/Firestore
   - Caches result with timestamp
4. **Model processes** with tenant-specific property data
5. **Results returned** based on that tenant's listings

## GCS Pub/Sub Notifications

When you update properties in GCS, the notification will automatically reload the correct tenant:

- File: `tenant1.com/properties.json` → Reloads `tenant1.com` cache
- File: `tenant2.com/properties.json` → Reloads `tenant2.com` cache

No configuration changes needed - the server extracts tenant from the file path.

## Testing Multi-Tenant Setup

```bash
# Test tenant1
curl -X POST https://your-service.run.app/api/chat \
  -H "X-Tenant-ID: tenant1.com" \
  -d '{"message":"show all properties"}'

# Test tenant2
curl -X POST https://your-service.run.app/api/chat \
  -H "X-Tenant-ID: tenant2.com" \
  -d '{"message":"show all properties"}'

# Should return different properties for each tenant
```

## Firestore Multi-Tenant

If using Firestore (set `PROPERTIES_STORE=firestore`):

- Properties stored in collections: `properties_tenant1`, `properties_tenant2`, etc.
- Scraper automatically creates tenant-specific collections
- Live updates via Firestore snapshot listeners work per-tenant

## Single-Tenant Mode (Backward Compatible)

If `MULTI_TENANT_MODE=false` (or not set):

- System works as before with single property list
- All requests use `DEFAULT_TENANT`
- Properties stored at: `properties.json` (GCS) or `properties` collection (Firestore)
- Existing deployments continue to work without changes

## Best Practices

1. **Tenant ID naming**: Use domain names (e.g., `example.com`, `site2.com`)
2. **Cache duration**: Set `PROPERTIES_POLL_SEC` based on update frequency (default: 3600s = 1 hour)
3. **Scraper scheduling**: Stagger scraper jobs for different tenants to avoid resource spikes
4. **Monitoring**: Track tenant IDs in logs using `[tenant-id]` prefix
5. **CORS**: Ensure your Cloud Run service allows requests from all tenant domains
