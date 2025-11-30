# Chat History Persistence Implementation

## Problem
When users navigate between property pages (e.g., clicking on property links sent by the AI agent), the chat conversation was being reset, causing a poor user experience.

## Solution
Implemented sessionStorage-based persistence to maintain chat history across page navigations within the same domain/session.

## Implementation Details

### Data Stored
Two arrays are persisted in sessionStorage:

1. **chatHistory** - API conversation history in Vertex AI format:
   ```javascript
   [
     { role: 'user', parts: 'Show me properties in Denpasar' },
     { role: 'model', parts: 'Here are some properties...' }
   ]
   ```

2. **chatMessages** - UI messages for visual restoration:
   ```javascript
   [
     { text: 'Show me properties in Denpasar', sender: 'user' },
     { text: 'Here are some properties...', sender: 'bot' }
   ]
   ```

### Key Functions

#### `saveChatState()`
- Saves both arrays to sessionStorage
- Called automatically after each message exchange
- Handles errors gracefully with console warnings

#### `addMessage(text, sender, shouldSave = true)`
- Adds message to UI
- If `shouldSave` is true:
  - Pushes message to `chatMessages` array
  - Calls `saveChatState()` to persist
- Use `shouldSave = false` when restoring from storage

#### Restoration on Load
On `DOMContentLoaded`:
1. Reads `chatHistory` and `chatMessages` from sessionStorage
2. Parses JSON data
3. Loops through `chatMessages` and calls `addMessage(msg.text, msg.sender, false)`
4. Chat widget shows full conversation history immediately

### API Integration
After successful API response:
```javascript
chatHistory.push({ role: 'user', parts: message });
chatHistory.push({ role: 'model', parts: data.text });
saveChatState(); // Persist immediately
```

## Behavior

### Persistence Scope
- **Within same domain**: Chat persists across all pages
- **Same browser tab/window**: History shared
- **sessionStorage**: Cleared when tab/window closes (not after page refresh)
- **Per-tenant**: Each tenant can have separate storage keys if needed

### User Experience
1. User asks: "Show me 3-bedroom villas in Seminyak"
2. AI responds with property cards
3. User clicks "View Details" on a property → navigates to property page
4. Chat widget on new page shows full conversation history
5. User can continue: "Show me similar properties"
6. AI has full context from previous conversation

## Testing

### Local Testing
1. Serve the project:
   ```bash
   node server.js
   ```

2. Open test pages:
   - `test-persistence.html` - First page
   - `test-persistence-2.html` - Second page

3. Test flow:
   - Open `test-persistence.html`
   - Open chat widget
   - Send a few messages
   - Click link to navigate to `test-persistence-2.html`
   - Verify chat history appears in widget
   - Send more messages
   - Navigate back to page 1
   - Verify full conversation is preserved

### Production Testing
1. Deploy updated widget to production websites
2. Test on actual property listing pages:
   - https://aldilawibowo.raywhite.co.id
   - https://cernanlantang.raywhite.co.id

3. Test scenario:
   - Ask AI for property recommendations
   - Click on property links in chat responses
   - Verify chat persists on property detail pages
   - Navigate between multiple properties
   - Confirm conversation context is maintained

## Optional Enhancements

### Clear Chat Button
Add a button to clear chat history:
```javascript
function clearChatHistory() {
    chatHistory = [];
    chatMessages = [];
    sessionStorage.removeItem('chatHistory');
    sessionStorage.removeItem('chatMessages');
    chatBody.innerHTML = '';
    addMessage('Chat history cleared. How can I help you?', 'bot');
}
```

### Per-Tenant Storage
Use tenant-specific storage keys:
```javascript
const storageKey = `chatHistory_${tenantId}`;
sessionStorage.setItem(storageKey, JSON.stringify(chatHistory));
```

### Storage Limits
Handle storage quota errors:
```javascript
function saveChatState() {
    try {
        // Limit to last 50 messages to avoid quota issues
        const recentMessages = chatMessages.slice(-50);
        sessionStorage.setItem('chatMessages', JSON.stringify(recentMessages));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            // Clear old data and retry
            sessionStorage.clear();
            sessionStorage.setItem('chatMessages', JSON.stringify(chatMessages.slice(-20)));
        }
    }
}
```

## Files Modified
- `chat-widget.js`:
  - Added sessionStorage restoration on load
  - Added `saveChatState()` function
  - Updated `addMessage()` with `shouldSave` parameter
  - Added persistence after API responses
  - Updated API URL to production endpoint

## Production Deployment
The updated widget is ready for deployment. Update the widget script on your websites:

```html
<!-- For aldilawibowo.raywhite.co.id -->
<script src="https://ai-agent-prop-678376481425.asia-southeast2.run.app/chat-widget.js"></script>
<div id="chat-widget" data-tenant-id="aldilawibowo.raywhite.co.id"></div>

<!-- For cernanlantang.raywhite.co.id -->
<script src="https://ai-agent-prop-678376481425.asia-southeast2.run.app/chat-widget.js"></script>
<div id="chat-widget" data-tenant-id="cernanlantang.raywhite.co.id"></div>
```

Or host the widget files on your own CDN/server for better caching and control.
