(async () => {
    try {
        const nameUrl = 'amd-ryzen-5-7600';
        const url = `https://versus.com/br/${nameUrl}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const html = await res.text();
        const scoreMatch = html.match(/"points":(\d+)/) || html.match(/(\d{1,3})\s*pontos/i) || html.match(/pointsScore">(\d+)/);
        console.log('Score Match:', scoreMatch ? scoreMatch[1] : 'Not found');
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
