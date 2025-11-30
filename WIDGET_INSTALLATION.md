# Chat Widget Installation Guide

## For aldilawibowo.raywhite.co.id

Add this code **before the closing `</body>` tag** on every page of aldilawibowo.raywhite.co.id:

```html
<!-- Ray White AI Chat Widget -->
<link rel="stylesheet" href="https://ai-agent-prop-678376481425.asia-southeast2.run.app/widget.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

<!-- Chat Toggle Button -->
<div id="chat-toggle">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="white"/>
    </svg>
</div>

<!-- Chat Widget -->
<div id="chat-widget" data-tenant-id="aldilawibowo.raywhite.co.id">
    <div class="chat-header">
        <h3>AI Property Assistant</h3>
        <button id="close-chat">&times;</button>
    </div>
    <div id="chat-body"></div>
    <div class="chat-input">
        <input type="text" id="chat-input" placeholder="Ask me about properties...">
        <button id="send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/>
            </svg>
        </button>
    </div>
</div>

<script src="https://ai-agent-prop-678376481425.asia-southeast2.run.app/chat-widget.js"></script>
```

---

## For cernanlantang.raywhite.co.id

Add this code **before the closing `</body>` tag** on every page of cernanlantang.raywhite.co.id:

```html
<!-- Ray White AI Chat Widget -->
<link rel="stylesheet" href="https://ai-agent-prop-678376481425.asia-southeast2.run.app/widget.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

<!-- Chat Toggle Button -->
<div id="chat-toggle">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="white"/>
    </svg>
</div>

<!-- Chat Widget -->
<div id="chat-widget" data-tenant-id="cernanlantang.raywhite.co.id">
    <div class="chat-header">
        <h3>AI Property Assistant</h3>
        <button id="close-chat">&times;</button>
    </div>
    <div id="chat-body"></div>
    <div class="chat-input">
        <input type="text" id="chat-input" placeholder="Ask me about properties...">
        <button id="send-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/>
            </svg>
        </button>
    </div>
</div>

<script src="https://ai-agent-prop-678376481425.asia-southeast2.run.app/chat-widget.js"></script>
```

---

## Important Notes

1. **CSS Isolation**: We use `widget.css` (NOT `style.css`) to prevent conflicts with your website
   - `widget.css` - Scoped styles for chat widget only ✅
   - `style.css` - Global styles that will break your website ❌

2. **Tenant ID**: Notice the `data-tenant-id` attribute is different for each website
   - aldilawibowo: `data-tenant-id="aldilawibowo.raywhite.co.id"`
   - cernanlantang: `data-tenant-id="cernanlantang.raywhite.co.id"`

3. **Properties Data**: Make sure each tenant has their properties scraped and uploaded:
   - aldilawibowo: `gs://raywhite-properties/aldilawibowo.raywhite.co.id/properties.json`
   - cernanlantang: `gs://raywhite-properties/cernanlantang.raywhite.co.id/properties.json`

4. **Testing Locally**: To test before adding to live websites, create HTML files with the code above

5. **WordPress/CMS**: If using WordPress or a CMS:
   - Add via **Theme Footer** settings
   - Or use a **Custom HTML** widget
   - Or add to `footer.php` template

---

## Verification

After installation, open the browser console (F12) and you should see:
```
[Chat Widget] Tenant ID: aldilawibowo.raywhite.co.id
[Chat Widget] Storage keys: {...}
```

Then test the chat functionality and check that:
- Messages persist when navigating between pages
- Language is maintained (Bahasa Indonesia)
- Properties are shown correctly
- Token usage appears in admin dashboard
