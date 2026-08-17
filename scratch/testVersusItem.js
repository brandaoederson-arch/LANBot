(async () => {
    try {
        const query = 'NVIDIA GeForce RTX 4060 Ti';
        const url = `https://versus.com/api/search?q=${encodeURIComponent(query)}&lang=br`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        const data = await res.json();
        const item = data.find(i => i.categories?.includes('graphics_card') || i.cat === 'Placas de vídeo') || data[0];
        console.log('Found Item:', item.name, '| Category:', item.cat, '| Points:', item.pts);
    } catch (e) {
        console.error('Error:', e.message);
    }
})();
