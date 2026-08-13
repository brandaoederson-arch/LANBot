const { fetchJson } = require('./http');

function cleanQuery(str) {
    if (!str) return '';
    return str
        .replace(/(\d+(\.\d+)?\s*(ghz|mhz|gb|mb|tb))/gi, '')
        .replace(/(turbo|cores|threads|gigabyte|nvidia|geforce|asus|rog|strix|msi|evga|zotac|galax|pny|xfx|sapphire|powercolor|asrock|rgb|dlss|ray\s*tracing|branco|black|white|oc|edition)/gi, '')
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function searchVersusItem(query, defaultScore = 50) {
    if (!query || query.trim().length === 0) {
        return { name: 'Não informado', score: defaultScore };
    }

    const searchQuery = cleanQuery(query) || query;

    try {
        const url = `https://versus.com/api/search?q=${encodeURIComponent(searchQuery)}&lang=br`;
        const data = await fetchJson(url, {
            timeout: 8000,
            retries: 2,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://versus.com/br'
            }
        });

        if (!data || !Array.isArray(data) || data.length === 0) {
            return { name: query, score: defaultScore };
        }

        const match = data[0];
        const rawPts = match.pts || 0;

        if (rawPts > 0) {
            // Conversão matemática exata de pts do Versus para nota de 0 a 100
            const score = Math.max(15, Math.min(99, Math.round(rawPts / 57.5)));
            return {
                name: match.name || query,
                score: score,
                url: match.url ? `https://versus.com${match.url}` : null
            };
        }

        return { name: match.name || query, score: defaultScore };
    } catch (e) {
        console.log(`⚠ Aviso na busca do Versus.com (${query}):`, e.message);
        return { name: query, score: defaultScore };
    }
}

async function calculateSetupVersusScore(setupData) {
    const [cpu, gpu, ram, monitor, mouse, teclado, headset] = await Promise.all([
        searchVersusItem(setupData.cpu, 60),
        searchVersusItem(setupData.gpu, 60),
        searchVersusItem(setupData.ram, 56),
        searchVersusItem(setupData.monitor, 45),
        searchVersusItem(setupData.mouse, 35),
        searchVersusItem(setupData.teclado, 50),
        searchVersusItem(setupData.headset, 65)
    ]);

    const scores = [cpu.score, gpu.score, ram.score, monitor.score, mouse.score, teclado.score, headset.score];
    const totalScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
        cpu,
        gpu,
        ram,
        monitor,
        mouse,
        teclado,
        headset,
        averageScore: Number(totalScore.toFixed(1))
    };
}

module.exports = {
    searchVersusItem,
    calculateSetupVersusScore
};
