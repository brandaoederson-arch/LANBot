const { fetchJson } = require('../services/http');

(async () => {
    try {
        const query = 'RTX 4060 Ti';
        const url = `https://versus.com/api/search?q=${encodeURIComponent(query)}&lang=br`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        const data = await res.json();
        console.log('Versus API Search Results:', JSON.stringify(data, null, 2).slice(0, 1000));
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
