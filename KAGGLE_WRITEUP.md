# Kaggle Competition Submission: Ray White AI Agent

## 1. The Pitch

### Problem Statement
Real estate agents are overwhelmed. They miss 40% of calls, take hours to respond to leads, and spend valuable time answering repetitive questions about property specs. For clients, this means frustration and lost opportunities. Existing chatbots are rigid, often hallucinate property details, and lack the context to handle complex, multi-turn negotiations or scheduling.

### Solution
The **Ray White AI Agent** is an enterprise-grade, multi-tenant conversational assistant powered by **Gemini 1.5 Flash**. It doesn't just chat; it acts. It integrates directly with real estate databases to provide accurate, real-time property data, qualifies leads, and automates viewing scheduling.

**Key Value Props:**
*   **Zero Hallucinations**: A 5-layer verification system ensures the AI never invents property details.
*   **24/7 Instant Response**: Handles inquiries, schedules viewings, and captures leads instantly.
*   **Multi-Tenant Architecture**: A single deployment serves hundreds of agent websites with strict data isolation.
*   **Seamless Action**: Moves beyond text to perform actions like sending branded HTML emails and booking calendar slots.

---

## 2. The Implementation

### Architecture
The system is built on a serverless, event-driven architecture designed for scale and security.

*   **Core Brain**: Google Vertex AI (Gemini 1.5 Flash) for reasoning and natural language understanding.
*   **Backend**: Node.js/Express server hosted on **Google Cloud Run**.
*   **Data Layer**:
    *   **Google Cloud Storage (GCS)**: Stores property JSON data for high-performance retrieval.
    *   **Firestore**: Manages conversation state, feedback logs, and security incidents.
*   **Integration**:
    *   **Brevo API**: For transactional email delivery (Visitor Confirmations & Agent Alerts).
    *   **Custom Tools**: Function calling for property search, scheduling, and lead capture.

### Key Features & Concepts Applied

#### 1. Agent Powered by an LLM (Gemini 1.5 Flash)
We utilize Gemini 1.5 Flash for its speed and long-context window. The agent is configured with a low temperature (0.2) for factual accuracy and uses a comprehensive system prompt that defines its persona as a professional Ray White representative.

#### 2. Tools & Function Calling
The agent is equipped with custom tools defined via the Gemini API:
*   `search_properties`: Queries the GCS/Firestore database with filters (location, price, beds).
*   `schedule_viewing`: Validates dates/times and triggers the email workflow.
*   `collect_visitor_info`: intelligently extracts contact details from natural conversation.

#### 3. Observability & Feedback Loops
We implemented a robust observability stack:
*   **Firestore Logging**: Every interaction, feedback rating (thumbs up/down), and security incident is logged.
*   **RAG Feedback Loop**: Negative feedback triggers an alert to admins, allowing for continuous prompt refinement.
*   **Security Monitoring**: A dedicated dashboard tracks attempts at prompt injection or PII extraction.

#### 4. Sessions & State Management
The system maintains conversation history to support multi-turn context.
*   **Context Awareness**: If a user asks "how much is it?" after viewing a property, the agent knows "it" refers to the previously discussed listing.
*   **URL Context Injection**: The agent detects the property page the user is browsing and injects that context into the start of the session.

### Deployment
The agent is fully deployed and production-ready on **Google Cloud Run**.
*   **Live Demo**: [https://cernanlantang.raywhite.co.id](https://cernanlantang.raywhite.co.id)
*   **Containerization**: Dockerized application with optimized Node.js runtime.
*   **CI/CD**: Automated deployment scripts (`deploy_production.sh`) handle environment variable injection and revision management.

---

## 3. How to Run Locally

1.  **Clone the Repo**
    ```bash
    git clone https://github.com/mryohan/ai-agent-prop.git
    cd ai-agent-prop
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file:
    ```env
    GOOGLE_CLOUD_PROJECT_ID=your-project-id
    EMAIL_PROVIDER=BREVO
    BREVO_API_KEY=your-key
    MULTI_TENANT_MODE=true
    ```

4.  **Run the Server**
    ```bash
    npm start
    ```

5.  **Access the Widget**
    Open `embeddable-chat.html` in your browser to test the interface.
