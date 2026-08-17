(async () => {
    const raw = 'RTX 4060 Ti';
    const url = `https://versus.com/api/search?q=${encodeURIComponent(raw)}&lang=br`;
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        const text = await res.text();
        console.log('Response length:', text.length, 'Start:', text.slice(0, 100));
    } catch (e) {
        console.error('Err:', e.message);
    }
})();
