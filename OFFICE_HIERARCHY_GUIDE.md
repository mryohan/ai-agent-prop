# Office Hierarchy & Priority Search System

## 🎯 Overview

The AI agent now uses a **3-level priority search system** to find properties for users:

### Search Priority (Cascading):
1. **Level 1: Personal Listings** - Agent's own properties (e.g., cernanlantang.raywhite.co.id)
2. **Level 2: Office Group** - Main office properties (e.g., menteng.raywhite.co.id)
3. **Level 3: National Database** - All Ray White Indonesia (www.raywhite.co.id)

The system searches each level until it finds matching properties, then stops. This ensures the agent prioritizes their own listings first, then office colleagues, and finally the national network.

---

## 📁 GCS Bucket Structure

All property databases are stored in: `gs://raywhite-properties/`

### Created Buckets:

| Bucket Path | Type | Purpose |
|-------------|------|---------|
| `aldilawibowo.raywhite.co.id/properties.json` | Personal Agent | Aldilawibowo's individual listings |
| `cernanlantang.raywhite.co.id/properties.json` | Personal Agent | Cernanlantang's individual listings |
| `menteng.raywhite.co.id/properties.json` | Office Group | Menteng office - all agents |
| `signaturekuningan.com/properties.json` | Office Group | Signature Kuningan office |
| `www.raywhite.co.id/properties.json` | National | All Ray White Indonesia properties |

---

## 🏢 Current Office Hierarchy

Configured in `server.js`:

```javascript
const officeHierarchy = {
    'cernanlantang.raywhite.co.id': {
        office: 'menteng.raywhite.co.id',
        national: 'www.raywhite.co.id'
    },
    'aldilawibowo.raywhite.co.id': {
        office: 'signaturekuningan.com',
        national: 'www.raywhite.co.id'
    }
};
```

### What This Means:

**For Cernanlantang Agent:**
1. First searches: `cernanlantang.raywhite.co.id` (244 properties)
2. If no match → searches: `menteng.raywhite.co.id` (office group)
3. If still no match → searches: `www.raywhite.co.id` (national)

**For Aldilawibowo Agent:**
1. First searches: `aldilawibowo.raywhite.co.id` (258 properties)
2. If no match → searches: `signaturekuningan.com` (office group)
3. If still no match → searches: `www.raywhite.co.id` (national)

---

## 🎨 How It Works (User Experience)

### Example Conversation:

**User:** "Saya cari rumah 500 juta di Jakarta Selatan"

**Agent (Cernanlantang):**
1. Searches own listings (cernanlantang.raywhite.co.id)
2. If found → Shows properties with direct links ✅
3. If NOT found → Searches office group (menteng.raywhite.co.id)
4. If found at office level → "Properti ini dari kantor Menteng kami. Saya bisa koordinasikan viewing untuk Anda." ⚠️ (No direct links)
5. If still NOT found → Searches national (www.raywhite.co.id)
6. If found at national level → "Properti ini dari jaringan Ray White Indonesia. Saya bisa koordinasikan dengan agent listing untuk Anda." ⚠️ (No direct links)

---

## 📊 Admin Dashboard

**URL:** https://ai-agent-prop-678376481425.asia-southeast2.run.app/admin

**Login:**
- Email: siryohannes89@gmail.com
- Password: pass1234

### New Sections:

#### 1. **Office Hierarchy** (NEW)
Shows the 3-level priority structure:
- **Level 1:** Personal listings (always own properties)
- **Level 2:** Office group assignment
- **Level 3:** National database

#### 2. **Co-Brokerage Settings**
Enable/disable office-wide search per tenant

---

## 🔧 How to Update Property Data

### For Personal Agents:
```bash
# Upload Cernanlantang's properties
gsutil cp cernanlantang-properties.json gs://raywhite-properties/cernanlantang.raywhite.co.id/properties.json

# Upload Aldilawibowo's properties
gsutil cp aldilawibowo-properties.json gs://raywhite-properties/aldilawibowo.raywhite.co.id/properties.json
```

### For Office Groups:
```bash
# Upload Menteng office properties (aggregated from all Menteng agents)
gsutil cp menteng-office-properties.json gs://raywhite-properties/menteng.raywhite.co.id/properties.json

# Upload Signature Kuningan office properties
gsutil cp signaturekuningan-properties.json gs://raywhite-properties/signaturekuningan.com/properties.json
```

### For National Database:
```bash
# Upload all Ray White Indonesia properties
gsutil cp national-properties.json gs://raywhite-properties/www.raywhite.co.id/properties.json
```

---

## 🚀 Adding a New Agent

### Step 1: Create GCS Bucket
```bash
echo '[]' | gsutil cp - gs://raywhite-properties/newagent.raywhite.co.id/properties.json
```

### Step 2: Configure Hierarchy

**Option A: Via API**
```bash
curl -X POST https://ai-agent-prop-678376481425.asia-southeast2.run.app/admin/hierarchy/newagent.raywhite.co.id \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: f32a0adfce9b814e9197c6ba6c90cf13fc41dd2c4b9fcd631217a61e9a21f373" \
  -d '{
    "office": "menteng.raywhite.co.id",
    "national": "www.raywhite.co.id"
  }'
```

**Option B: In Code** (server.js)
```javascript
const officeHierarchy = {
    'newagent.raywhite.co.id': {
        office: 'menteng.raywhite.co.id',
        national: 'www.raywhite.co.id'
    }
};
```

### Step 3: Upload Properties
```bash
gsutil cp newagent-properties.json gs://raywhite-properties/newagent.raywhite.co.id/properties.json
```

### Step 4: Embed Widget
Follow instructions in `WIDGET_INSTALLATION.md`

---

## 🔍 Testing the Priority Search

### Test via API:
```bash
# Test Cernanlantang agent
curl -X POST https://ai-agent-prop-678376481425.asia-southeast2.run.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: cernanlantang.raywhite.co.id" \
  -d '{
    "message": "Cari rumah 500 juta di Jakarta Selatan",
    "history": [],
    "tenantId": "cernanlantang.raywhite.co.id"
  }'
```

### Check Logs:
```bash
gcloud run services logs read ai-agent-prop \
  --region=asia-southeast2 \
  --project=gen-lang-client-0734676219 \
  --limit=50
```

Look for these log patterns:
- `[cernanlantang.raywhite.co.id] Starting priority-based office search...`
- `[cernanlantang.raywhite.co.id] Level 2: Searching menteng.raywhite.co.id (Office Group)...`
- `[cernanlantang.raywhite.co.id] Level 3: Searching www.raywhite.co.id (Ray White Indonesia)...`
- `[cernanlantang.raywhite.co.id] ✅ Found matches at Level 2 (Office Group), stopping search`

---

## 📝 Property JSON Format

### Personal Agent Properties (Level 1):
For personal listings (e.g., cernanlantang.raywhite.co.id/properties.json):

```json
[
  {
    "id": "prop_001",
    "title": "Rumah Modern Jakarta Selatan",
    "location": "Rumah, Jakarta Selatan, Kebayoran Baru",
    "price": "Rp. 500 Juta",
    "type": "Sale",
    "bedrooms": 3,
    "bathrooms": 2,
    "land_size": "120 m²",
    "building_size": "90 m²",
    "description": "Rumah modern dengan desain minimalis",
    "poi": "Dekat stasiun MRT, sekolah internasional",
    "imageUrl": "https://cernanlantang.raywhite.co.id/images/prop_001.jpg",
    "url": "https://cernanlantang.raywhite.co.id/property/prop_001"
  }
]
```

### Office Group & National Properties (Level 2 & 3):
For co-brokerage listings (e.g., menteng.raywhite.co.id/properties.json):

```json
[
  {
    "id": "prop_001",
    "listingId": "508771",
    "title": "Luxurious Apartment at District 8 Infinity Tower",
    "location": "Apartemen, Jakarta Selatan, SCBD",
    "price": "Rp. 5 Milyar",
    "type": "Sale",
    "bedrooms": 3,
    "bathrooms": 2,
    "land_size": "150 m²",
    "building_size": "120 m²",
    "description": "Luxury apartment with stunning city views",
    "poi": "Near SCBD, shopping centers, international schools",
    "image": "https://aldilawibowo.raywhite.co.id/images/508771_main.jpg",
    "eflyer": "https://aldilawibowo.raywhite.co.id/eflyer/508771"
  }
]
```

**Important Field Descriptions:**

| Field | Required | Level 1 (Personal) | Level 2 & 3 (Co-broke) | Description |
|-------|----------|-------------------|------------------------|-------------|
| `id` | ✅ Yes | Yes | Yes | Unique property identifier |
| `listingId` | ❌ Optional | No | **Recommended** | Original listing ID from website (used in eflyer URL) |
| `title` | ✅ Yes | Yes | Yes | Property title/name |
| `location` | ✅ Yes | Yes | Yes | Full location string |
| `price` | ✅ Yes | Yes | Yes | Price in IDR format |
| `type` | ✅ Yes | Yes | Yes | "Sale" or "Rent" |
| `bedrooms` | ❌ Optional | Yes | Yes | Number of bedrooms |
| `bathrooms` | ❌ Optional | Yes | Yes | Number of bathrooms |
| `description` | ❌ Optional | Yes | Yes | Property description (max 2000 characters, auto-truncated) |
| `poi` | ❌ Optional | Yes | Yes | Points of interest nearby |
| `imageUrl` | ❌ Optional | **Use this** | Don't use | Main image for personal listings |
| `image` | ❌ Optional | Don't use | **Use this** | Main image for co-brokerage |
| `url` | ✅ Yes | **Required** | **Don't include** | Direct property page (personal only) |
| `eflyer` | ❌ Optional | Don't use | **Recommended** | Co-brokerage eflyer link (format: `{subdomain}/eflyer/{listingId}`) |

**Important Notes:**
- **Personal listings (Level 1):** MUST include `url` field for direct links, use `imageUrl` for images
- **Co-brokerage listings (Level 2 & 3):** Should include `image` and `eflyer` fields, do NOT include `url`
- **Eflyer format:** `https://{subdomain}.raywhite.co.id/eflyer/{listingId}`
  - Example: `https://aldilawibowo.raywhite.co.id/eflyer/508771`
  - Eflyer links remove agent contact info for co-brokerage purposes
- **Image field:** Visitors need to see property images to be interested, even for co-brokerage

---

## ⚙️ Configuration Options

### Enable/Disable Co-Brokerage:
```bash
# Disable for a tenant (only search own listings)
curl -X POST https://ai-agent-prop-678376481425.asia-southeast2.run.app/admin/cobrokerage/cernanlantang.raywhite.co.id \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: f32a0adfce9b814e9197c6ba6c90cf13fc41dd2c4b9fcd631217a61e9a21f373" \
  -d '{"enabled": false}'

# Enable co-brokerage (default)
curl -X POST https://ai-agent-prop-678376481425.asia-southeast2.run.app/admin/cobrokerage/cernanlantang.raywhite.co.id \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: f32a0adfce9b814e9197c6ba6c90cf13fc41dd2c4b9fcd631217a61e9a21f373" \
  -d '{"enabled": true}'
```

### View Current Hierarchy:
```bash
curl -H "X-Admin-Key: f32a0adfce9b814e9197c6ba6c90cf13fc41dd2c4b9fcd631217a61e9a21f373" \
  https://ai-agent-prop-678376481425.asia-southeast2.run.app/admin/hierarchy
```

---

## 🎯 Next Steps

1. **Upload Properties:**
   - Add properties to `menteng.raywhite.co.id/properties.json`
   - Add properties to `signaturekuningan.com/properties.json`
   - Add properties to `www.raywhite.co.id/properties.json`

2. **Test Priority Search:**
   - Chat with Cernanlantang agent
   - Try a search that doesn't match personal listings
   - Verify it searches office, then national

3. **Monitor in Dashboard:**
   - Check "Office Hierarchy" section
   - Verify priority levels are correct
   - Monitor which level provides most matches

4. **Add More Agents:**
   - Create new GCS buckets
   - Configure hierarchy via API or code
   - Embed widgets on agent websites

---

## 🆘 Troubleshooting

### Agent Not Finding Office Properties:
- Check GCS bucket exists: `gsutil ls gs://raywhite-properties/`
- Verify hierarchy configured in dashboard
- Check logs for "Level 2: Searching..." messages

### Properties Not Updating:
- Re-upload to GCS: `gsutil cp file.json gs://raywhite-properties/tenant/properties.json`
- Wait 1 hour (cache TTL) or restart service
- Check file format is valid JSON

### Co-Brokerage Not Working:
- Verify co-brokerage enabled in admin dashboard
- Check `cobrokerageConfig` in logs
- Test with API to see exact error messages

---

## 📞 Support

**Service URL:** https://ai-agent-prop-678376481425.asia-southeast2.run.app

**Admin Dashboard:** https://ai-agent-prop-678376481425.asia-southeast2.run.app/admin

**Project:** gen-lang-client-0734676219

**Region:** asia-southeast2

**GCS Bucket:** gs://raywhite-properties/
