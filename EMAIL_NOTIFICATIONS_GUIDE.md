# Email Notifications Guide

## Overview
The AI Agent automatically sends professional HTML email notifications to both visitors and agents for property inquiries and viewing requests.

## Features

### 1. **Visitor Email Confirmations** 
Beautiful HTML emails sent to visitors when they:
- Schedule a property viewing
- Express interest in a property
- Provide contact information

**Visitor Email Includes:**
- ✅ Viewing confirmation with date/time
- 🏠 Property image and details
- 📍 Property link (if available)
- 👤 Agent contact information
- 💬 Their message/notes

### 2. **Agent Lead Notifications**
Instant alerts sent to agents when:
- New viewing request received
- Visitor provides contact information
- Property interest expressed

**Agent Email Includes:**
- 🔥 New lead alert header
- 👤 Complete visitor contact info (name, email, phone)
- 🏠 Property details and link
- 📅 Requested viewing date/time
- 💬 Visitor's message
- 📞 Quick action buttons (Email & Call)

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email Provider (SendGrid or SMTP)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=no-reply@yourwebsite.raywhite.co.id

# Agent Information
AGENT_NOTIFICATION_EMAIL=agent@raywhite.co.id
AGENT_NAME=John Doe
AGENT_PHONE=+62 812 3456 7890
```

### SendGrid Setup (Recommended)

1. **Create SendGrid Account**: https://sendgrid.com
2. **Get API Key**: Settings → API Keys → Create API Key
3. **Verify Sender**: Settings → Sender Authentication
4. **Add to .env**: `SENDGRID_API_KEY=SG.xxxxx`

### Alternative: Gmail SMTP

If not using SendGrid, configure Gmail SMTP in `server.js`:

```javascript
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});
```

Add to `.env`:
```env
EMAIL_PROVIDER=smtp
EMAIL_USER=youragent@gmail.com
EMAIL_PASSWORD=your-app-password
```

## Email Templates

### Visitor Confirmation Email

**Subject**: `📅 Viewing Confirmed: [Property Title]`

**Features**:
- Professional gradient header
- Property image card
- Viewing date/time in formatted table
- Agent contact information
- Call-to-action for property details
- Mobile-responsive design

**Preview**:
```
┌─────────────────────────────────┐
│   📅 Viewing Confirmed!         │
│   (Purple gradient header)      │
├─────────────────────────────────┤
│ Dear John,                      │
│                                 │
│ [Property Image]                │
│ Luxury Apartment in SCBD        │
│                                 │
│ 📅 Date: December 15, 2024     │
│ 🕐 Time: 14:00                 │
│                                 │
│ ✓ Your request sent to agent   │
│                                 │
│ Your Agent: Ray White Agent     │
│ 📞 +62 812 3456 7890           │
└─────────────────────────────────┘
```

### Agent Lead Notification Email

**Subject**: `🔥 New Viewing Request: [Visitor Name] - [Property Title]`

**Features**:
- Urgent red alert header
- Action required notification
- Visitor contact card (name, email, phone)
- Property details with link
- Requested viewing date/time
- Visitor's message
- Quick action buttons (Email & Call)
- Lead generation timestamp

**Preview**:
```
┌─────────────────────────────────┐
│   🔥 New Lead Alert!            │
│   Viewing Request               │
│   (Red gradient header)         │
├─────────────────────────────────┤
│ ⚡ Action Required              │
│ Follow up within 24 hours       │
│                                 │
│ 👤 Contact Information          │
│ Name: John Doe                  │
│ Email: john@example.com         │
│ Phone: +62 812 xxxx xxxx        │
│                                 │
│ 🏠 Property of Interest         │
│ Luxury Apartment in SCBD        │
│                                 │
│ 📅 Requested Viewing Time       │
│ Date: December 15, 2024         │
│ Time: 14:00                     │
│                                 │
│ [✉️ Email John] [📞 Call John] │
└─────────────────────────────────┘
```

## Automated Triggers

### 1. Viewing Schedule
**Trigger**: Visitor requests property viewing via chat
**Emails Sent**:
- ✅ Confirmation to visitor
- 🔥 Lead alert to agent

**Example Chat Flow**:
```
User: "I want to visit this apartment on December 15 at 2pm"
Agent: "Sure! May I have your name, email, and phone number?"
User: "John Doe, john@example.com, +62 812 3456 7890"
→ Emails automatically sent
```

### 2. Contact Information Collection
**Trigger**: Visitor provides contact details
**Emails Sent**:
- 🔥 Lead alert to agent

**Example Chat Flow**:
```
User: "I'm interested in your properties"
Agent: "Great! May I have your contact details?"
User: "John Doe, john@example.com, +62 812 3456 7890"
→ Lead notification sent to agent
```

### 3. Property Interest
**Trigger**: Visitor expresses interest in specific property
**Emails Sent**:
- 🔥 Lead alert with property details

## Testing

### Test Viewing Schedule

```bash
curl -X POST https://your-service.run.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: yoursite.raywhite.co.id" \
  -d '{
    "message": "I want to schedule a viewing for property ID 123 on December 15 at 14:00. My name is John Doe, email john@example.com, phone +62 812 3456 7890",
    "history": []
  }'
```

**Expected Result**:
1. ✅ Visitor receives HTML confirmation email
2. 🔥 Agent receives lead notification email
3. 💬 Chat responds with confirmation message

### Check Email Logs

```bash
# View Cloud Run logs
gcloud run services logs read ai-agent-prop \
  --region=asia-southeast2 \
  --limit=50 | grep -i "email\|viewing\|lead"
```

Look for:
- `✓ Viewing confirmation sent to [email]`
- `✓ Viewing notification sent to agent [email]`
- `✓ Lead notification sent to agent for [name]`

## Customization

### Modify Email Templates

Edit functions in `server.js`:

**Visitor Email**: `generateVisitorEmailHTML()`
**Agent Email**: `generateAgentLeadEmailHTML()`

### Change Colors

In email templates:
- **Primary**: `#667eea` (purple)
- **Success**: `#27ae60` (green)
- **Alert**: `#e74c3c` (red)
- **Warning**: `#f39c12` (orange)

### Add Logo

Add your Ray White logo URL:
```javascript
<img src="https://yoursite.raywhite.co.id/logo.png" alt="Ray White" style="width: 150px;" />
```

## Troubleshooting

### Emails Not Sending

**Issue**: No emails received
**Solutions**:
1. Check `EMAIL_PROVIDER` is set (`sendgrid` or `smtp`)
2. Verify API key/credentials in `.env`
3. Check SendGrid sender verification
4. Review Cloud Run logs for errors
5. Test with a simple email:
   ```bash
   curl -X POST https://your-service.run.app/test-email
   ```

### Agent Not Receiving Notifications

**Issue**: Visitor gets email, agent doesn't
**Solutions**:
1. Verify `AGENT_NOTIFICATION_EMAIL` in `.env`
2. Check spam folder
3. Review logs: `grep "agent" in Cloud Run logs`
4. Ensure agent email is verified in SendGrid

### HTML Not Rendering

**Issue**: Email shows plain text instead of HTML
**Solutions**:
1. Check email client supports HTML
2. Ensure `html` parameter is passed to `sendEmail()`
3. Test in Gmail/Outlook web
4. Check for HTML syntax errors in template

### Wrong Agent Information

**Issue**: Email shows incorrect agent name/phone
**Solutions**:
1. Update `AGENT_NAME` and `AGENT_PHONE` in `.env`
2. Redeploy with new environment variables:
   ```bash
   gcloud run deploy ai-agent-prop --update-env-vars AGENT_NAME="Your Name"
   ```
3. Verify deployment: Check Cloud Run console → Service details → Environment variables

## Best Practices

### 1. **Professional From Address**
Use a professional sender address:
```
EMAIL_FROM=noreply@yourname.raywhite.co.id
```
Not: `gmail.com` or personal emails

### 2. **Quick Response Time**
- Set up mobile notifications for `AGENT_NOTIFICATION_EMAIL`
- Respond to leads within 1-24 hours
- Use quick action buttons in agent emails

### 3. **Personalization**
- Always use visitor's name in emails
- Include property images when available
- Add specific property details

### 4. **Testing**
- Test email flow before going live
- Send test emails to yourself
- Check on multiple devices (desktop, mobile)
- Test in different email clients (Gmail, Outlook)

### 5. **Compliance**
- Include unsubscribe link (if sending marketing emails)
- Add physical address in footer (required by some regions)
- Follow CAN-SPAM Act / GDPR requirements

## Analytics

Track email performance in SendGrid dashboard:
- **Open Rate**: % of recipients who opened
- **Click Rate**: % who clicked links
- **Bounce Rate**: Failed deliveries
- **Spam Reports**: Marked as spam

**Target Metrics**:
- Open Rate: >50%
- Click Rate: >20%
- Bounce Rate: <5%
- Spam Rate: <0.1%

## Advanced Features

### Email Scheduling

To send reminder emails before viewing:
```javascript
// Schedule reminder 24h before viewing
const reminderDate = new Date(preferredDate);
reminderDate.setDate(reminderDate.getDate() - 1);
// Use Cloud Scheduler to trigger reminder
```

### Email Tracking

Add tracking pixels to monitor opens:
```javascript
html: emailHTML + '<img src="https://track.yoursite.com/pixel.gif?id=' + leadId + '" width="1" height="1" />'
```

### CRM Integration

Save leads to Firestore for CRM:
```javascript
const firestore = new Firestore({ projectId: PROJECT_ID });
await firestore.collection('leads').add({
    visitorName,
    visitorEmail,
    visitorPhone,
    propertyId,
    date: preferredDate,
    timestamp: new Date(),
    status: 'new'
});
```

## Support

**Issues with emails?**
- Check Cloud Run logs: `gcloud run services logs read ai-agent-prop`
- Review SendGrid dashboard: https://sendgrid.com/dashboard
- Test email functionality: Send test messages via chat widget

**Need help?**
- SendGrid Support: https://support.sendgrid.com
- Ray White IT Support: [Your IT contact]

---

**Last Updated**: November 30, 2024
**Version**: 1.0
**Deployed Revision**: ai-agent-prop-00042-qz5
