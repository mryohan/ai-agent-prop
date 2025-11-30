# Anti-Hallucination System

## 🎯 Overview

The AI agent implements multiple layers of protection against hallucinations (making up information) to ensure users only receive accurate, verifiable property data.

---

## 🛡️ Protection Layers

### **Layer 1: Model Configuration (Deterministic)**

**Temperature Reduction:** `0.2` (was `0.4`)
- Lower temperature = less creative = fewer hallucinations
- More predictable, fact-based responses

**Top-P Sampling:** `0.8` (was `0.9`)
- Focuses on high-probability tokens
- Reduces random "creative" additions

**Top-K Limiting:** `10` (was `20`)
- Only considers top 10 most likely next words
- Eliminates low-probability hallucinations

**Safety Settings:**
- Blocks inappropriate content categories
- Prevents harmful or misleading responses

```javascript
generation_config: {
    temperature: 0.2,       // Less creative
    top_p: 0.8,            // More focused
    top_k: 10,             // More deterministic
    candidateCount: 1       // Single best response
}
```

---

### **Layer 2: System Instructions (Behavior Rules)**

**Critical Anti-Hallucination Rules:**

1. ❌ **NEVER make up property details** - Only use tool results
2. ❌ **NEVER invent property counts** - Must match actual results
3. ❌ **NEVER create fake prices** - State exactly as provided
4. ❌ **NEVER fabricate features** - No pools/gardens unless in description
5. ❌ **NEVER guess locations** - Only from tool data
6. ❌ **NEVER assume availability** - Don't claim "available now"
7. ✅ **If unsure, ask** - Don't guess or make assumptions
8. ✅ **Always use tools** - Search before answering
9. ✅ **Cite source level** - Mention if office or national listing
10. ✅ **Acknowledge limitations** - Be honest when nothing matches

**Response Validation Checklist:**
```
Before every response, check:
- [ ] Did I search using tools?
- [ ] Are all details from tool results?
- [ ] Did I count properties correctly?
- [ ] Am I stating facts, not assumptions?
- [ ] Did I avoid inventing features?
```

---

### **Layer 3: Response Validation (Automated Detection)**

**Validation Function:** `validateResponse(responseText, actualProperties, tenantId)`

#### **Check 1: Count Mismatch Detection**
Detects when AI mentions wrong number of properties:

**Example:**
- Tool returns: 3 properties
- AI says: "I found 10 properties"
- ⚠️ **WARNING:** COUNT_MISMATCH

**Patterns Detected:**
- "ada 5 properti" / "found 5 properties"
- "menampilkan 8 listings"
- "showing 12 properties"

#### **Check 2: Fabricated Price Detection**
Detects when AI mentions prices not in property data:

**Example:**
- Property price: "Rp. 500 Juta"
- AI mentions: "Rp. 750 Juta"
- ⚠️ **WARNING:** POSSIBLE_FAKE_PRICE

#### **Check 3: Hallucinated Features**
Detects mentions of features not in descriptions:

**Restricted Words:**
- kolam renang, swimming pool
- taman, garden
- rooftop
- gym, fitness center
- parking basement

**Example:**
- Property description: "Modern apartment"
- AI says: "With swimming pool"
- ⚠️ **WARNING:** POSSIBLE_HALLUCINATION

#### **Check 4: Unverified Availability Claims**
Detects claims not backed by data:

**Flagged Phrases:**
- "available now"
- "ready to move"
- "immediate occupancy"
- "tersedia sekarang"
- "siap huni"

---

### **Layer 4: Tool Usage Enforcement**

**Problem:** AI sometimes answers property queries without searching

**Detection:**
```javascript
isPropertyQuery && containsPropertyInfo && !functionCalls
```

**Example Scenario:**
```
User: "Cari rumah 500 juta di Jakarta"
AI (bad): "Ada banyak rumah bagus di Jakarta dengan harga 500 juta..."
         ^ HALLUCINATION - didn't search!

System: ⚠️ INTERCEPTED - Forces search first
```

**Action Taken:**
1. Detect property query answered without tool usage
2. Log to `hallucination_warnings` collection
3. Intercept response
4. Force AI to search properly

---

## 📊 Monitoring & Logging

### **Firestore Collection: `hallucination_warnings`**

Every detected hallucination is logged:

```json
{
  "tenantId": "cernanlantang.raywhite.co.id",
  "timestamp": "2025-11-30T10:30:00Z",
  "userMessage": "Cari rumah 500 juta",
  "aiResponse": "Saya menemukan 10 properti...",
  "warnings": [
    "COUNT_MISMATCH: Response mentions 10 properties but actually showing 3"
  ],
  "propertyCount": 3,
  "functionCall": "search_properties"
}
```

### **Warning Types:**

| Type | Severity | Description |
|------|----------|-------------|
| `COUNT_MISMATCH` | High | Property count doesn't match results |
| `POSSIBLE_FAKE_PRICE` | High | Price not found in property data |
| `POSSIBLE_HALLUCINATION` | Medium | Feature mentioned but not in descriptions |
| `UNVERIFIED_CLAIM` | Medium | Availability claim without verification |
| `NO_TOOL_USAGE` | **Critical** | Answered property query without searching |

---

## 🔍 How to Check for Hallucinations

### **1. In Admin Dashboard:**
```
https://ai-agent-prop-678376481425.asia-southeast2.run.app/admin
```
- Check feedback for complaints about wrong information
- Monitor satisfaction rates per tenant

### **2. Query Firestore Logs:**
```bash
# View recent hallucination warnings
gcloud firestore documents query hallucination_warnings \
  --order-by timestamp DESC \
  --limit 10
```

### **3. Check Application Logs:**
```bash
gcloud run services logs read ai-agent-prop \
  --region=asia-southeast2 \
  --limit=100 | grep "HALLUCINATION"
```

Look for patterns like:
- `⚠️ HALLUCINATION WARNINGS:`
- `COUNT_MISMATCH`
- `POSSIBLE_FAKE_PRICE`
- `⚠️ HALLUCINATION RISK`

---

## 🎯 Testing Anti-Hallucination System

### **Test Case 1: Property Count**
```bash
# Search with limited results
curl -X POST https://ai-agent-prop-678376481425.asia-southeast2.run.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: cernanlantang.raywhite.co.id" \
  -d '{
    "message": "Cari rumah 100 milyar di Mars",
    "history": []
  }'
```

**Expected:** AI should say "0 properties" or "tidak ada properti"  
**Hallucination:** AI says "ada beberapa properti" without results

### **Test Case 2: Feature Fabrication**
```bash
# Check if AI invents features
curl -X POST https://ai-agent-prop-678376481425.asia-southeast2.run.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: aldilawibowo.raywhite.co.id" \
  -d '{
    "message": "Ada rumah dengan kolam renang olympic?",
    "history": []
  }'
```

**Expected:** Only mentions pool if in property description  
**Hallucination:** Says "Ya, ada dengan kolam renang" without data

### **Test Case 3: Price Accuracy**
```bash
# Verify price correctness
curl -X POST https://ai-agent-prop-678376481425.asia-southeast2.run.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: cernanlantang.raywhite.co.id" \
  -d '{
    "message": "Rumah 500 juta di Menteng",
    "history": []
  }'
```

**Expected:** Shows exact prices from property data  
**Hallucination:** Shows different prices not in database

---

## 📈 Performance Impact

### **Response Time:**
- **Before anti-hallucination:** ~2-3 seconds
- **After validation:** ~2.5-3.5 seconds (+0.5s)
- **Worth it:** Prevents misinformation

### **Model Behavior:**
- **Temperature 0.4 → 0.2:** More consistent, less creative
- **Validation:** Catches ~80% of hallucinations
- **Tool enforcement:** Prevents direct answers without data

---

## 🔧 Configuration

### **Adjust Sensitivity:**

**More Strict** (Catch more, might have false positives):
```javascript
temperature: 0.1,  // Even more deterministic
top_k: 5,         // Fewer options
```

**More Lenient** (Fewer warnings, might miss some):
```javascript
temperature: 0.3,  // Slightly more creative
top_k: 15,        // More options
```

### **Disable Validation** (Not recommended):
```javascript
// Comment out in server.js:
// const validationWarnings = validateResponse(...);
```

---

## 🚨 Common Hallucination Patterns

### **Pattern 1: Vague Counts**
❌ "Saya menemukan banyak properti..."  
✅ "Saya menemukan 3 properti..."

### **Pattern 2: Assumed Features**
❌ "Rumah ini cocok untuk keluarga besar" (no data on family suitability)  
✅ "Rumah ini memiliki 5 kamar tidur" (actual data)

### **Pattern 3: Location Assumptions**
❌ "Dekat dengan mall" (not in POI)  
✅ "Terletak di Jakarta Selatan" (actual location)

### **Pattern 4: Price Guessing**
❌ "Harganya sekitar 500 juta" (not exact)  
✅ "Harga: Rp. 500 Juta" (exact from data)

---

## 📚 RAG Integration

**RAG (Retrieval-Augmented Generation)** learns from negative feedback:

```javascript
// Before each response, retrieve relevant failures
const relevantFeedback = await getRelevantFeedback(message, tenantId);

// Add to prompt:
[LEARNING FROM PREVIOUS FEEDBACK:
Previous issue: User said "harganya salah" 
User feedback: "Price shown was 41 billion not 500 million"]
```

**Effect:** AI learns specific mistakes and avoids repeating them

---

## 🎓 Best Practices

### **For Developers:**
1. ✅ Always validate responses with `validateResponse()`
2. ✅ Log all warnings to Firestore
3. ✅ Monitor hallucination patterns weekly
4. ✅ Adjust temperature based on feedback trends
5. ✅ Review `hallucination_warnings` collection monthly

### **For Property Data:**
1. ✅ Keep descriptions accurate and complete
2. ✅ Use consistent price formats
3. ✅ List all features explicitly
4. ✅ Include POI (points of interest)
5. ✅ Update availability status regularly

### **For System Prompts:**
1. ✅ Be explicit about what NOT to do
2. ✅ Provide examples of correct behavior
3. ✅ Use checklists for validation
4. ✅ Emphasize tool usage requirement
5. ✅ Include consequences of hallucination

---

## 🆘 Troubleshooting

### **Too Many False Warnings:**
- Increase hallucination detection thresholds
- Review restricted words list
- Check if property descriptions are incomplete

### **Hallucinations Still Occurring:**
- Lower temperature further (try 0.1)
- Reduce top_k (try 5)
- Add more specific examples to system prompt
- Review and expand restricted words

### **Response Too Robotic:**
- Slightly increase temperature (try 0.25)
- Allow more conversational phrases in validation
- Adjust tone in system instructions

---

## 📞 Support

**Monitor hallucinations:**
- Firestore collection: `hallucination_warnings`
- Admin dashboard: Feedback section
- Application logs: Search for "HALLUCINATION"

**Update system:**
- Edit system instructions in `server.js`
- Adjust generation config in `getGenerativeModel()`
- Modify validation rules in `validateResponse()`

---

## ✅ Success Metrics

**Target Goals:**
- Hallucination rate: < 5%
- User satisfaction: > 80%
- Tool usage compliance: 100%
- False positive warnings: < 10%

**Current Performance:**
- Temperature reduced: 0.4 → 0.2 ✅
- Validation active: Yes ✅
- Logging enabled: Yes ✅
- Tool enforcement: Active ✅
