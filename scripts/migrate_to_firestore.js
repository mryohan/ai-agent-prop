const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');
require('dotenv').config();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const COLLECTION = process.env.PROPERTIES_FIRESTORE_COLLECTION || 'properties';

async function main() {
    const firestore = new Firestore({ projectId: PROJECT_ID });

    if (!fs.existsSync('properties.json')) {
        console.error('properties.json not found!');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync('properties.json', 'utf8'));
    console.log(`Migrating ${data.length} properties to Firestore collection: ${COLLECTION}`);

    const batchSize = 500;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = firestore.batch();
        const chunk = data.slice(i, i + batchSize);
        chunk.forEach((p) => {
            const docRef = firestore.collection(COLLECTION).doc(String(p.id));
            batch.set(docRef, p, { merge: true });
        });
        await batch.commit();
        console.log(`Committed ${Math.min(i + batchSize, data.length)} / ${data.length}`);
    }

    console.log('Done migrating properties to Firestore.');
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
