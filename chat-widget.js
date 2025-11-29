document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWidget = document.getElementById('chat-widget');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatBody = document.getElementById('chat-body');

    let chatHistory = [];

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

        // Call API
        fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory
            })
        })
            .then(response => response.json())
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
            })
            .catch(error => {
                console.error('Error:', error);
                removeTypingIndicator();
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            });
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = text; // Text content to prevent XSS

        const timestamp = document.createElement('span');
        timestamp.classList.add('timestamp');
        timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timestamp);

        chatBody.appendChild(messageDiv);
        scrollToBottom();
    }

    function renderProperties(properties) {
        const container = document.createElement('div');
        container.classList.add('message', 'bot');
        container.style.width = '100%'; // Full width for carousel-like feel if needed

        properties.forEach(prop => {
            const card = document.createElement('div');
            card.classList.add('property-card-chat');

            card.innerHTML = `
                <img src="${prop.imageUrl}" alt="${prop.title}" onerror="this.src='https://via.placeholder.com/250x140?text=No+Image'">
                <div class="info">
                    <h4>${prop.title}</h4>
                    <div class="location"><i class="fas fa-map-marker-alt"></i> ${prop.location}</div>
                    <div class="price">${prop.price}</div>
                    <a href="${prop.url}" target="_blank" class="view-btn">View Details</a>
                </div>
            `;

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
});
