(async () => {
    try {
        const query = 'AMD Ryzen 5 7600';
        const url = `https://versus.com/api/search?q=${encodeURIComponent(query)}&lang=br`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        const data = await res.json();
        console.log('Results for AMD Ryzen 5 7600:', data.slice(0, 3));
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
