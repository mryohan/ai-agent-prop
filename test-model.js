const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = 'us-central1';

const vertex_ai = new VertexAI({ project: PROJECT_ID, location: LOCATION });

async function listModels() {
    try {
        const model = vertex_ai.preview.getGenerativeModel({
            model: 'gemini-1.5-flash-001'
        });
        console.log("Trying gemini-1.5-flash-001...");
        const resp = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash-001:", resp.response.candidates[0].content.parts[0].text);
    } catch (e) {
        console.error("Error with gemini-1.5-flash-001:", e.message);
    }

    try {
        const model = vertex_ai.preview.getGenerativeModel({
            model: 'gemini-pro'
        });
        console.log("Trying gemini-pro...");
        const resp = await model.generateContent("Hello");
        console.log("Success with gemini-pro:", resp.response.candidates[0].content.parts[0].text);
    } catch (e) {
        console.error("Error with gemini-pro:", e.message);
    }
}

listModels();
