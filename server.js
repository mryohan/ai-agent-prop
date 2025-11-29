const express = require('express');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'your-project-id';
const LOCATION = 'us-central1';

// Initialize Vertex AI
const vertex_ai = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const model = 'gemini-2.5-flash-lite';

// Load properties
let properties = [];
try {
    properties = JSON.parse(fs.readFileSync('properties.json', 'utf8'));
    console.log(`Loaded ${properties.length} properties.`);
} catch (e) {
    console.log('properties.json not found or empty, starting with empty list.');
}

// Tool definitions
const tools = {
    function_declarations: [
        {
            name: "search_properties",
            description: "Search for properties based on user criteria. Returns detailed info including description and points of interest.",
            parameters: {
                type: "object",
                properties: {
                    location: { type: "string", description: "City, area, or POI (e.g., Kemang, near school)" },
                    max_price: { type: "number", description: "Maximum price in IDR" },
                    type: { type: "string", description: "Rent or Sale" },
                    min_bedrooms: { type: "number", description: "Minimum number of bedrooms" },
                    property_category: { type: "string", description: "Type of property: 'rumah' (house), 'apartemen' (apartment), 'ruko' (shophouse), 'tanah' (land), 'gedung' (building)" },
                    keyword: { type: "string", description: "Any specific feature or keyword (e.g., pool, garden, quiet)" }
                }
            }
        },
        {
            name: "schedule_viewing",
            description: "Schedule a property viewing appointment. Collects visitor details and sends confirmation emails.",
            parameters: {
                type: "object",
                properties: {
                    property_id: { type: "string", description: "ID of the property to view" },
                    visitor_name: { type: "string", description: "Visitor's full name" },
                    visitor_email: { type: "string", description: "Visitor's email address" },
                    visitor_phone: { type: "string", description: "Visitor's phone number" },
                    preferred_date: { type: "string", description: "Preferred viewing date (YYYY-MM-DD format)" },
                    preferred_time: { type: "string", description: "Preferred viewing time (HH:MM format)" },
                    message: { type: "string", description: "Optional message from visitor" }
                },
                required: ["property_id", "visitor_name", "visitor_email", "visitor_phone", "preferred_date", "preferred_time"]
            }
        }
    ]
};

// System instructions
const systemInstruction = `
You are a friendly, professional, and helpful real estate assistant for 'Ray White'. 
Your goal is to help visitors find their dream property from our listings.
You should sound natural, like a human agent, not a robot. 
Use emojis sparingly but effectively to be warm.

When you recommend properties:
1.  **Use the 'search_properties' tool** to find matches.
2.  **IMPORTANT - Property Type Handling**:
    - When user asks for "rumah" (house), FIRST search with property_category="rumah" (houses only)
    - If NO houses match, then suggest alternatives in this order:
      a) Search again with property_category="apartemen" (apartments)
      b) If still no match, search with property_category="ruko" (shophouses)
    - Tell the user: "I couldn't find any houses matching your criteria, but here are some apartments/shophouses you might like"
    - Property categories: "rumah" (house), "apartemen" (apartment), "ruko" (shophouse), "tanah" (land), "gedung" (building)
3.  **Highlight key features** from the property's description (e.g., "It has a spacious garden" or "Located in a quiet area").
4.  **Mention Points of Interest (POI)** if available (e.g., "It's close to the international school").
5.  Provide the title, price, and a direct link.
6.  Do NOT invent details. Only use what's in the tool output.

**Scheduling Property Viewings**:
- When a visitor expresses interest in viewing a property (e.g., "I want to visit", "Can I see this property", "Schedule a viewing"), use the 'schedule_viewing' tool.
- Ask for: name, email, phone number, preferred date, and preferred time.
- Be conversational when collecting this information - don't ask for everything at once.
- After scheduling, confirm the details and let them know they'll receive a confirmation email.

If the user asks about something else, politely guide them back to real estate or answer general questions briefly.
If no properties match after trying all alternatives, suggest broadening the search criteria (location, price, etc.).
`;

// Instantiate the model
const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: model,
    generation_config: {
        max_output_tokens: 2048,
        temperature: 0.7,
        top_p: 0.8,
        top_k: 40,
    },
    tools: [tools],
    system_instruction: {
        parts: [{ text: systemInstruction }]
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        const chatHistory = (history || []).map(h => ({
            role: h.role,
            parts: [{ text: h.parts }]
        }));

        const chat = generativeModel.startChat({
            history: chatHistory,
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const candidates = response.candidates;

        if (!candidates || candidates.length === 0) {
            throw new Error('No response from model');
        }

        const firstCandidate = candidates[0];
        const content = firstCandidate.content;
        const parts = content.parts;

        // Check for function calls
        const functionCalls = parts.filter(part => part.functionCall);

        if (functionCalls.length > 0) {
            const functionCall = functionCalls[0].functionCall;
            if (functionCall.name === 'search_properties') {
                const args = functionCall.args;
                console.log('Searching properties with args:', args);

                let results = properties;

                // Filter logic
                if (args.location) {
                    const loc = args.location.toLowerCase();
                    results = results.filter(p =>
                        (p.location && p.location.toLowerCase().includes(loc)) ||
                        (p.title && p.title.toLowerCase().includes(loc)) ||
                        (p.description && p.description.toLowerCase().includes(loc)) ||
                        (p.poi && p.poi.toLowerCase().includes(loc))
                    );
                }
                if (args.type) {
                    results = results.filter(p => p.type && p.type.toLowerCase() === args.type.toLowerCase());
                }
                if (args.keyword) {
                    const kw = args.keyword.toLowerCase();
                    results = results.filter(p =>
                        (p.description && p.description.toLowerCase().includes(kw)) ||
                        (p.title && p.title.toLowerCase().includes(kw))
                    );
                }

                // Property category filtering
                if (args.property_category) {
                    const category = args.property_category.toLowerCase();
                    results = results.filter(p => {
                        const locationLower = (p.location || '').toLowerCase();

                        if (category === 'rumah') {
                            // For house, include "rumah" but exclude apartments, shophouses, etc.
                            return locationLower.includes('rumah') &&
                                !locationLower.includes('apartemen') &&
                                !locationLower.includes('ruko') &&
                                !locationLower.includes('gedung') &&
                                !locationLower.includes('tanah');
                        } else if (category === 'apartemen') {
                            return locationLower.includes('apartemen');
                        } else if (category === 'ruko') {
                            return locationLower.includes('ruko');
                        } else if (category === 'tanah') {
                            return locationLower.includes('tanah');
                        } else if (category === 'gedung') {
                            return locationLower.includes('gedung');
                        }
                        return true;
                    });
                }

                // Price filtering
                if (args.max_price) {
                    results = results.filter(p => {
                        if (!p.price) return false;

                        // Parse Indonesian price format
                        // Examples: "Rp. 10 Milyar", "Rp. 1,4 Milyar (nego)", "Rp. 360 Juta/tahun", "Rp. 7.750.000.000"
                        const priceStr = p.price.toLowerCase();

                        // Extract numeric value
                        let numericValue = 0;

                        if (priceStr.includes('milyar') || priceStr.includes('miliar')) {
                            // Billion (text format)
                            const match = priceStr.match(/(\d+[\.,]?\d*)\s*(milyar|miliar)/);
                            if (match) {
                                numericValue = parseFloat(match[1].replace(',', '.')) * 1000000000;
                            }
                        } else if (priceStr.includes('juta')) {
                            // Million (text format)
                            const match = priceStr.match(/(\d+[\.,]?\d*)\s*juta/);
                            if (match) {
                                numericValue = parseFloat(match[1].replace(',', '.')) * 1000000;
                            }
                        } else if (priceStr.includes('m ')) {
                            // M for million
                            const match = priceStr.match(/(\d+[\.,]?\d*)\s*m\s/);
                            if (match) {
                                numericValue = parseFloat(match[1].replace(',', '.')) * 1000000;
                            }
                        } else {
                            // Try numeric format: "Rp. 7.750.000.000" or "Rp. 1,400,000,000"
                            // Remove "Rp.", spaces, and all dots/commas used as thousand separators
                            const cleanStr = priceStr.replace(/rp\.?\s*/g, '').replace(/\s/g, '');

                            // Count dots and commas to determine format
                            const dotCount = (cleanStr.match(/\./g) || []).length;
                            const commaCount = (cleanStr.match(/,/g) || []).length;

                            // If multiple dots (e.g., 7.750.000.000), they're thousand separators
                            if (dotCount > 1) {
                                numericValue = parseFloat(cleanStr.replace(/\./g, ''));
                            }
                            // If multiple commas (e.g., 1,400,000,000), they're thousand separators
                            else if (commaCount > 1) {
                                numericValue = parseFloat(cleanStr.replace(/,/g, ''));
                            }
                            // Single dot or comma might be decimal, but for prices it's likely a thousand separator
                            else if (dotCount === 1 || commaCount === 1) {
                                const num = cleanStr.replace(/[.,]/g, '');
                                numericValue = parseFloat(num);
                            }
                        }

                        // If we couldn't parse or it's "Contact for price", skip filtering
                        if (numericValue === 0) return true;

                        return numericValue <= args.max_price;
                    });
                }

                // Return top 3 results
                console.log(`After all filters: ${results.length} properties found`);
                if (results.length > 0) {
                    console.log('Sample results:', results.slice(0, 3).map(p => ({ id: p.id, location: p.location, price: p.price })));
                }

                let topResults = results.slice(0, 3);
                let fallbackMessage = '';

                // Fallback logic: if searching for "rumah" and no results, try apartments then shophouses
                if (topResults.length === 0 && args.property_category === 'rumah') {
                    console.log('No houses found, trying apartments...');

                    // Try apartments
                    let apartmentResults = properties;

                    // Re-apply all filters except property_category
                    if (args.location) {
                        const loc = args.location.toLowerCase();
                        apartmentResults = apartmentResults.filter(p =>
                            (p.location && p.location.toLowerCase().includes(loc)) ||
                            (p.title && p.title.toLowerCase().includes(loc)) ||
                            (p.description && p.description.toLowerCase().includes(loc)) ||
                            (p.poi && p.poi.toLowerCase().includes(loc))
                        );
                    }
                    if (args.type) {
                        apartmentResults = apartmentResults.filter(p => p.type && p.type.toLowerCase() === args.type.toLowerCase());
                    }
                    if (args.keyword) {
                        const kw = args.keyword.toLowerCase();
                        apartmentResults = apartmentResults.filter(p =>
                            (p.description && p.description.toLowerCase().includes(kw)) ||
                            (p.title && p.title.toLowerCase().includes(kw))
                        );
                    }

                    // Filter for apartments
                    apartmentResults = apartmentResults.filter(p => {
                        const locationLower = (p.location || '').toLowerCase();
                        return locationLower.includes('apartemen');
                    });

                    // Apply price filter
                    if (args.max_price) {
                        apartmentResults = apartmentResults.filter(p => {
                            if (!p.price) return false;
                            const priceStr = p.price.toLowerCase();
                            let numericValue = 0;

                            if (priceStr.includes('milyar') || priceStr.includes('miliar')) {
                                const match = priceStr.match(/(\d+[\.,]?\d*)\s*(milyar|miliar)/);
                                if (match) numericValue = parseFloat(match[1].replace(',', '.')) * 1000000000;
                            } else if (priceStr.includes('juta')) {
                                const match = priceStr.match(/(\d+[\.,]?\d*)\s*juta/);
                                if (match) numericValue = parseFloat(match[1].replace(',', '.')) * 1000000;
                            } else {
                                const cleanStr = priceStr.replace(/rp\.?\s*/g, '').replace(/\s/g, '');
                                const dotCount = (cleanStr.match(/\./g) || []).length;
                                const commaCount = (cleanStr.match(/,/g) || []).length;

                                if (dotCount > 1) {
                                    numericValue = parseFloat(cleanStr.replace(/\./g, ''));
                                } else if (commaCount > 1) {
                                    numericValue = parseFloat(cleanStr.replace(/,/g, ''));
                                } else if (dotCount === 1 || commaCount === 1) {
                                    numericValue = parseFloat(cleanStr.replace(/[.,]/g, ''));
                                }
                            }

                            if (numericValue === 0) return true;
                            return numericValue <= args.max_price;
                        });
                    }

                    console.log(`Found ${apartmentResults.length} apartments`);

                    if (apartmentResults.length > 0) {
                        topResults = apartmentResults.slice(0, 3);
                        fallbackMessage = '\n\nNote: I couldn\'t find any houses matching your criteria, so I\'m showing you apartments instead.';
                    } else {
                        // Try shophouses if no apartments
                        console.log('No apartments found, trying shophouses...');
                        let rukoResults = properties;

                        // Re-apply filters for ruko
                        if (args.location) {
                            const loc = args.location.toLowerCase();
                            rukoResults = rukoResults.filter(p =>
                                (p.location && p.location.toLowerCase().includes(loc)) ||
                                (p.title && p.title.toLowerCase().includes(loc)) ||
                                (p.description && p.description.toLowerCase().includes(loc)) ||
                                (p.poi && p.poi.toLowerCase().includes(loc))
                            );
                        }
                        if (args.type) {
                            rukoResults = rukoResults.filter(p => p.type && p.type.toLowerCase() === args.type.toLowerCase());
                        }

                        rukoResults = rukoResults.filter(p => {
                            const locationLower = (p.location || '').toLowerCase();
                            return locationLower.includes('ruko');
                        });

                        // Apply price filter (same as above)
                        if (args.max_price) {
                            rukoResults = rukoResults.filter(p => {
                                if (!p.price) return false;
                                const priceStr = p.price.toLowerCase();
                                let numericValue = 0;

                                if (priceStr.includes('milyar') || priceStr.includes('miliar')) {
                                    const match = priceStr.match(/(\d+[\.,]?\d*)\s*(milyar|miliar)/);
                                    if (match) numericValue = parseFloat(match[1].replace(',', '.')) * 1000000000;
                                } else if (priceStr.includes('juta')) {
                                    const match = priceStr.match(/(\d+[\.,]?\d*)\s*juta/);
                                    if (match) numericValue = parseFloat(match[1].replace(',', '.')) * 1000000;
                                } else {
                                    const cleanStr = priceStr.replace(/rp\.?\s*/g, '').replace(/\s/g, '');
                                    const dotCount = (cleanStr.match(/\./g) || []).length;
                                    const commaCount = (cleanStr.match(/,/g) || []).length;

                                    if (dotCount > 1) {
                                        numericValue = parseFloat(cleanStr.replace(/\./g, ''));
                                    } else if (commaCount > 1) {
                                        numericValue = parseFloat(cleanStr.replace(/,/g, ''));
                                    } else if (dotCount === 1 || commaCount === 1) {
                                        numericValue = parseFloat(cleanStr.replace(/[.,]/g, ''));
                                    }
                                }

                                if (numericValue === 0) return true;
                                return numericValue <= args.max_price;
                            });
                        }

                        console.log(`Found ${rukoResults.length} shophouses`);

                        if (rukoResults.length > 0) {
                            topResults = rukoResults.slice(0, 3);
                            fallbackMessage = '\n\nNote: I couldn\'t find any houses or apartments matching your criteria, so I\'m showing you shophouses instead.';
                        }
                    }
                }

                const functionResponse = {
                    functionResponse: {
                        name: 'search_properties',
                        response: {
                            properties: topResults
                        }
                    }
                };

                const result2 = await chat.sendMessage([functionResponse]);
                const response2 = await result2.response;
                let textResponse = response2.candidates[0].content.parts[0].text;

                // Append fallback message if we showed alternative property types
                if (fallbackMessage) {
                    textResponse += fallbackMessage;
                }

                res.json({
                    text: textResponse,
                    properties: topResults
                });
                return;
            }
        }

        res.json({ text: parts[0].text });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
