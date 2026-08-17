(async () => {
    const items = ['AMD Ryzen 5 7600', 'RTX 4060 Ti', 'AMD Ryzen 7 5700X', 'RTX 2060', 'AMD Ryzen 5 5500', 'RTX 4060'];

    for (const q of items) {
        try {
            const url = `https://versus.com/api/search?q=${encodeURIComponent(q)}&lang=br`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Referer': 'https://versus.com/br'
                }
            });

            if (!res.ok) {
                console.log(`❌ ${q} => HTTP ${res.status}`);
                continue;
            }

            const data = await res.json();
            const top = data[0];
            const pts = top?.pts || 0;
            const score = pts > 0 ? Math.max(15, Math.min(99, Math.round(pts / 57.5))) : 0;
            console.log(`✅ ${q} => Item: "${top?.name}" | Pts: ${pts} => SCORE: ${score}`);
        } catch (e) {
            console.log(`❌ ${q} => Error: ${e.message}`);
        }
    }
})();
