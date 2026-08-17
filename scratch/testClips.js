const puppeteer = require('puppeteer');
const reportLinks = require('../config/pubgReportLinks.json');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

(async () => {
    console.log('Testing PUBG Report scraping...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    // Test with first account: Aquilliz
    const [playerName, profileUrl] = Object.entries(reportLinks)[0];
    console.log(`Checking ${playerName}: ${profileUrl}`);

    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('api') || url.includes('json') || response.headers()['content-type']?.includes('json')) {
            console.log(`Response URL: ${url} (${response.status()})`);
            try {
                const text = await response.text();
                console.log(`Body snippet (first 200 chars): ${text.slice(0, 200)}`);
            } catch (e) {
                console.log(`Could not read text: ${e.message}`);
            }
        }
    });

    try {
        await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 5000));
        console.log('Page loaded. Document title:', await page.title());
    } catch (e) {
        console.error('Page error:', e.message);
    } finally {
        await browser.close();
    }
})();
