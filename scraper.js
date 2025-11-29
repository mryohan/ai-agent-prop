const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://cernanlantang.raywhite.co.id';
const OUTPUT_FILE = 'properties.json';

async function scrapeProperties() {
    console.log('Starting deep scrape...');
    let properties = [];
    const maxPages = 30; // Estimate for ~255 listings (approx 10 per page)

    // Step 1: Get all listing URLs
    for (let page = 1; page <= maxPages; page++) {
        const url = `${BASE_URL}/?page=${page}`;
        console.log(`Fetching list page ${page}...`);

        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);
            let pageProps = 0;

            $('a[href*="/properti/"]').each((i, element) => {
                const href = $(element).attr('href');
                const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

                if (properties.some(p => p.url === fullUrl)) return;

                const text = $(element).text().trim();
                const lines = text.split('\n').map(l => l.trim()).filter(l => l);

                let imageUrl = $(element).find('img').attr('src');
                if (!imageUrl) {
                    const style = $(element).find('[style*="background-image"]').attr('style');
                    if (style) {
                        const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                        if (match) imageUrl = match[1];
                    }
                }

                if (lines.length > 3) {
                    const title = lines[0];
                    const location = lines[1];
                    const priceLine = lines.find(l => l.includes('Rp.'));

                    properties.push({
                        id: href.split('/')[4],
                        title: title,
                        location: location,
                        price: priceLine || 'Contact for price',
                        url: fullUrl,
                        imageUrl: imageUrl || 'https://via.placeholder.com/150',
                        type: title.toLowerCase().includes('sewa') ? 'Rent' : 'Sale',
                        description: '', // To be filled
                        poi: '' // To be filled
                    });
                    pageProps++;
                }
            });

            if (pageProps === 0) {
                console.log('No more properties found on this page. Stopping list scrape.');
                break;
            }

        } catch (error) {
            console.error(`Error scraping page ${page}:`, error.message);
        }
    }

    console.log(`Found ${properties.length} properties. Starting detail scrape...`);

    // Step 2: Visit each property to get details
    // We'll do this in chunks to be polite
    const chunkSize = 5;
    for (let i = 0; i < properties.length; i += chunkSize) {
        const chunk = properties.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (prop) => {
            try {
                // console.log(`Fetching details for ${prop.id}...`);
                const response = await axios.get(prop.url);
                const $ = cheerio.load(response.data);

                // Extract description
                // Based on previous chunk view, description is in the main text body.
                // We'll look for a container that looks like the description.
                // Often it's a div with class 'detail-desc' or similar, or just paragraphs.
                // Let's grab all paragraphs in the main content area if possible.
                // Or just the raw text of the main container.

                // From the chunk dump: "Disewakan rumah mewah dan luas..."
                // It seems to be just text nodes or p tags.
                // Let's try to find the element containing "Disewakan" or "Dijual" that is long.

                let description = '';
                // Strategy: Get all text from the main content div. 
                // Since we don't know the class, we'll guess or just grab generic paragraphs.
                // A safe bet is usually identifying the container by some known text like "Spesifikasi Properti"
                // and taking the text *before* it.

                const bodyText = $('body').text();
                // This is too messy.

                // Let's try to find the specific container. 
                // In many templates, it's .property-description or #description.
                // Let's try a few common selectors.
                const descSelectors = ['.property-detail', '.description', '#description', '.content', '.entry-content'];
                for (const sel of descSelectors) {
                    if ($(sel).length) {
                        description = $(sel).text().trim();
                        break;
                    }
                }

                // Fallback: Use the meta description or OG description if body fail
                if (!description || description.length < 50) {
                    description = $('meta[property="og:description"]').attr('content') || '';
                }

                // Clean up description
                description = description.replace(/\s+/g, ' ').trim();

                // Extract POI
                // Look for keywords like "Dekat", "Minutes to", "Access"
                // We can just store the whole description and let the LLM parse it, 
                // but extracting a specific POI string might be helpful if there's a list.
                // The chunk showed "Lokasi Strategis" followed by a list.
                const poiMatch = description.match(/Lokasi Strategis.*?(?=\.|$)/i) || description.match(/Dekat.*?(?=\.|$)/i);
                const poi = poiMatch ? poiMatch[0] : '';

                prop.description = description;
                prop.poi = poi;

            } catch (e) {
                console.error(`Failed to fetch details for ${prop.id}: ${e.message}`);
            }
        }));

        // Small delay between chunks
        await new Promise(r => setTimeout(r, 500));
        process.stdout.write(`\rScraped ${Math.min(i + chunkSize, properties.length)}/${properties.length} details...`);
    }

    console.log('\nScrape complete.');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(properties, null, 2));
    console.log(`Saved enriched data to ${OUTPUT_FILE}`);
}

scrapeProperties();
