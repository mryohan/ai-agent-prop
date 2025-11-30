document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWidget = document.getElementById('chat-widget');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatBody = document.getElementById('chat-body');

    // Initialize chat history and messages
    let chatHistory = [];
    let chatMessages = [];

    // Get tenant ID for storage key
    const tenantId = document.getElementById('chat-widget')?.dataset?.tenantId || window.location.hostname;
    const historyKey = `chatHistory_${tenantId}`;
    const messagesKey = `chatMessages_${tenantId}`;
    console.log('[Chat Widget] Tenant ID:', tenantId);
    console.log('[Chat Widget] Storage keys:', { historyKey, messagesKey });

    // Save chat state to localStorage
    function saveChatState() {
        try {
            localStorage.setItem(historyKey, JSON.stringify(chatHistory));
            localStorage.setItem(messagesKey, JSON.stringify(chatMessages));
            console.log('Saved chat state:', chatHistory.length, 'history entries,', chatMessages.length, 'messages');
        } catch (e) {
            console.warn('Failed to save chat state:', e);
        }
    }

    // Toggle Chat
    chatToggle.addEventListener('click', () => {
        chatWidget.classList.add('active');
        chatToggle.style.display = 'none';
        if (chatHistory.length === 0) {
            // Optional: Play a sound or animation
        }
    });

    closeChat.addEventListener('click', () => {
        chatWidget.classList.remove('active');
        setTimeout(() => {
            chatToggle.style.display = 'flex';
        }, 300);
    });

    // Send Message
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add User Message
        addMessage(message, 'user');
        chatInput.value = '';

        // Show Typing Indicator
        showTypingIndicator();
        
        console.log('=== SENDING MESSAGE ===');
        console.log('Tenant ID:', tenantId);
        console.log('History entries:', chatHistory.length);
        console.log('Message:', message);
        
        // Set timeout warning
        const timeoutWarning = setTimeout(() => {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.innerHTML = '<div class="typing-indicator">Still searching... this is taking longer than usual</div>';
            }
        }, 8000); // Show warning after 8 seconds
        
        // Call API with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        fetch('https://ai-agent-prop-678376481425.asia-southeast2.run.app/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory,
                tenant: tenantId
            }),
            signal: controller.signal
        })
            .then(response => {
                clearTimeout(timeout);
                clearTimeout(timeoutWarning);
                
                // Handle quota errors
                if (response.status === 429) {
                    return response.json().then(data => {
                        throw { type: 'quota', data: data };
                    });
                }
                
                if (response.status === 503) {
                    return response.json().then(data => {
                        if (data.quota) {
                            throw { type: 'quota', data: data };
                        }
                        throw new Error(data.message || 'Service unavailable');
                    });
                }
                
                if (!response.ok) {
                    // For 500 errors, check if there's a helpful error message
                    if (response.status === 500) {
                        return response.json().then(data => {
                            if (data.text) {
                                // Server provided a user-friendly error message
                                return data;
                            }
                            throw new Error(data.message || `HTTP ${response.status}`);
                        }).catch(err => {
                            // If JSON parsing fails, throw generic error
                            if (err.message && err.message.includes('HTTP')) throw err;
                            throw new Error(`HTTP ${response.status}`);
                        });
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                
                return response.json();
            })
            .then(data => {
                console.log('Received data from API:', data);
                removeTypingIndicator();

                // Add Bot Message
                if (data.text) {
                    addMessage(data.text, 'bot');
                }

                // Render Properties if any
                if (data.properties && data.properties.length > 0) {
                    console.log('Rendering properties:', data.properties);
                    renderProperties(data.properties);
                } else {
                    console.log('No properties to render');
                }

                // Update History
                chatHistory.push({ role: 'user', parts: message });
                chatHistory.push({ role: 'model', parts: data.text || 'Here are some properties.' });
                saveChatState();
            })
            .catch(error => {
                console.error('Error:', error);
                clearTimeout(timeout);
                clearTimeout(timeoutWarning);
                removeTypingIndicator();
                
                if (error.type === 'quota') {
                    const message = error.data.message || 'Token quota exceeded. Please contact the website administrator to upgrade your plan.';
                    addMessage(`⚠️ ${message}`, 'bot');
                    
                    if (error.data.usage) {
                        console.warn('Quota details:', error.data.usage);
                    }
                } else if (error.name === 'AbortError') {
                    addMessage('Mohon maaf, permintaan memakan waktu terlalu lama. Silakan coba lagi dengan pertanyaan yang lebih sederhana.', 'bot');
                } else {
                    // Show error message or default
                    const errorMsg = error.message && error.message.startsWith('HTTP') 
                        ? 'Mohon tunggu sebentar, saya sedang mengalami kendala teknis. Bisa coba ulangi pertanyaan Anda?'
                        : error.message || 'Mohon tunggu sebentar, saya sedang mengalami kendala. Bisa ulangi pertanyaan Anda?';
                    addMessage(errorMsg, 'bot');
                }
            });
    }

    function addMessage(text, sender, shouldSave = true, messageId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        messageDiv.dataset.messageId = msgId;

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = text; // Text content to prevent XSS

        const timestamp = document.createElement('span');
        timestamp.classList.add('timestamp');
        timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timestamp);
        
        // Add feedback buttons for bot messages
        if (sender === 'bot') {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.classList.add('feedback-buttons');
            feedbackDiv.innerHTML = `
                <button class="feedback-btn thumbs-up" data-rating="thumbs_up" title="Helpful">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                </button>
                <button class="feedback-btn thumbs-down" data-rating="thumbs_down" title="Not helpful">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                    </svg>
                </button>
            `;
            
            // Add click handlers
            feedbackDiv.querySelectorAll('.feedback-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const rating = this.dataset.rating;
                    submitFeedback(msgId, rating, text);
                    
                    // Visual feedback
                    feedbackDiv.querySelectorAll('.feedback-btn').forEach(b => b.disabled = true);
                    this.classList.add('selected');
                    
                    // Show thank you message
                    const thankYou = document.createElement('span');
                    thankYou.classList.add('feedback-thank-you');
                    thankYou.textContent = 'Thank you for your feedback!';
                    feedbackDiv.appendChild(thankYou);
                });
            });
            
            messageDiv.appendChild(feedbackDiv);
        }

        chatBody.appendChild(messageDiv);
        scrollToBottom();
        
        // Save to messages array for persistence
        if (shouldSave) {
            chatMessages.push({ text, sender, messageId: msgId });
            saveChatState();
        }
        
        return msgId;
    }
    
    // Submit feedback to server
    function submitFeedback(messageId, rating, aiResponse) {
        const conversationId = `conv_${tenantId}_${Date.now()}`;
        const lastUserMessage = chatHistory.length > 0 ? 
            chatHistory[chatHistory.length - 1].parts : '';
        
        console.log('Submitting feedback:', { messageId, rating, aiResponse: aiResponse.substring(0, 50) });
        
        fetch('https://ai-agent-prop-678376481425.asia-southeast2.run.app/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantId
            },
            body: JSON.stringify({
                messageId,
                conversationId,
                rating,
                userMessage: lastUserMessage,
                aiResponse,
                tenantId
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Feedback submitted successfully:', data);
            
            // If thumbs down, optionally show feedback form
            if (rating === 'thumbs_down') {
                showFeedbackForm(messageId, conversationId, lastUserMessage, aiResponse);
            }
        })
        .catch(error => {
            console.error('Failed to submit feedback:', error);
        });
    }
    
    // Show feedback form for detailed feedback
    function showFeedbackForm(messageId, conversationId, userMessage, aiResponse) {
        const feedbackForm = document.createElement('div');
        feedbackForm.classList.add('message', 'bot', 'feedback-form');
        feedbackForm.innerHTML = `
            <div class="message-content">
                <p><strong>Help us improve!</strong> What went wrong?</p>
                <textarea id="detailed-feedback" placeholder="Tell us what was wrong with this response..." rows="3"></textarea>
                <button id="submit-detailed-feedback" class="send-btn">Submit Feedback</button>
            </div>
        `;
        
        chatBody.appendChild(feedbackForm);
        scrollToBottom();
        
        document.getElementById('submit-detailed-feedback').addEventListener('click', function() {
            const detailedFeedback = document.getElementById('detailed-feedback').value.trim();
            
            fetch('https://ai-agent-prop-678376481425.asia-southeast2.run.app/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId
                },
                body: JSON.stringify({
                    messageId,
                    conversationId,
                    rating: 'thumbs_down',
                    feedback: detailedFeedback,
                    userMessage,
                    aiResponse,
                    tenantId
                })
            })
            .then(() => {
                feedbackForm.remove();
                addMessage('Thank you for your detailed feedback! We\'ll use it to improve our service.', 'bot', false);
            })
            .catch(error => {
                console.error('Failed to submit detailed feedback:', error);
            });
        });
    }

    function renderProperties(properties) {
        const container = document.createElement('div');
        container.classList.add('message', 'bot');
        container.style.width = '100%'; // Full width for carousel-like feel if needed

        properties.forEach(prop => {
            const card = document.createElement('div');
            card.classList.add('property-card-chat');
            
            // Determine image source (use prop.image for co-brokerage, imageUrl for personal)
            const imageUrl = prop.image || prop.imageUrl || 'https://via.placeholder.com/250x140?text=No+Image';
            
            // Determine link and button text
            // If eflyer exists (co-brokerage), use that; otherwise use url (personal listing)
            const propertyLink = prop.eflyer || prop.url;
            const buttonText = prop.eflyer ? 'View Property Info' : 'View Details';
            const isCobroke = !!prop.eflyer;
            
            // Build HTML with conditional co-brokerage badge
            let cardHTML = `
                <img src="${imageUrl}" alt="${prop.title}" onerror="this.src='https://via.placeholder.com/250x140?text=No+Image'">
                <div class="info">
                    ${isCobroke ? '<div class="cobroke-badge" style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 8px; display: inline-block;">🤝 Co-Brokerage</div>' : ''}
                    <h4>${prop.title}</h4>
                    <div class="location"><i class="fas fa-map-marker-alt"></i> ${prop.location}</div>
                    <div class="price">${prop.price}</div>`;
            
            // Add bedrooms/bathrooms if available
            if (prop.bedrooms || prop.bathrooms) {
                cardHTML += `<div class="specs" style="font-size: 12px; color: #666; margin-top: 8px;">`;
                if (prop.bedrooms) cardHTML += `<span>🛏️ ${prop.bedrooms} KT</span> `;
                if (prop.bathrooms) cardHTML += `<span>🚿 ${prop.bathrooms} KM</span>`;
                cardHTML += `</div>`;
            }
            
            // Add link if available
            if (propertyLink) {
                cardHTML += `<a href="${propertyLink}" target="_blank" class="view-btn">${buttonText}</a>`;
            } else {
                // No link available - show contact message
                cardHTML += `<div class="view-btn" style="background: #666; cursor: default;">Contact agent for details</div>`;
            }
            
            cardHTML += `</div>`;
            
            card.innerHTML = cardHTML;
            container.appendChild(card);
        });

        chatBody.appendChild(container);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.classList.add('message', 'bot');
        indicator.innerHTML = `
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        chatBody.appendChild(indicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Restore chat history from localStorage
    try {
        const savedHistory = localStorage.getItem(historyKey);
        const savedMessages = localStorage.getItem(messagesKey);
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            console.log('Restored chat history:', chatHistory.length, 'entries');
        }
        if (savedMessages) {
            chatMessages = JSON.parse(savedMessages);
            console.log('Restoring chat messages:', chatMessages.length, 'messages');
            // Restore chat messages in the UI
            chatMessages.forEach(msg => {
                addMessage(msg.text, msg.sender, false); // false = don't save again
            });
        }
    } catch (e) {
        console.error('Failed to restore chat history:', e);
    }

    // Clear chat function
    function clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            chatHistory = [];
            chatMessages = [];
            localStorage.removeItem(historyKey);
            localStorage.removeItem(messagesKey);
            chatBody.innerHTML = '';
            console.log('Chat history cleared');
            addMessage('Chat history cleared. How can I help you today?', 'bot');
        }
    }

    // Add clear button to header if it doesn't exist
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader && !document.getElementById('clear-chat-btn')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clear-chat-btn';
        clearBtn.innerHTML = '🗑️';
        clearBtn.style.cssText = 'background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 10px; font-size: 16px;';
        clearBtn.title = 'Clear chat history';
        clearBtn.addEventListener('click', clearChat);
        
        const closeBtn = document.getElementById('close-chat');
        if (closeBtn) {
            closeBtn.parentNode.insertBefore(clearBtn, closeBtn);
        }
    }

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});
