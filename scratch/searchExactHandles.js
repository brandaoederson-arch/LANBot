const { fetchJson } = require('../services/http');

async function findExactYoutubeUrl(query) {
    try {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const html = await fetchJson(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const handles = [...html.matchAll(/"navigationEndpoint":\{"clickTrackingParams":".*?","commandMetadata":\{"webCommandMetadata":\{"url":"(\/@[^"]+)"/g)];
        if (handles.length > 0) {
            return handles[0][1];
        }
    } catch (e) {
        console.log(`⚠ Erro ao buscar ${query}:`, e.message);
    }
    return null;
}

(async () => {
    const queries = ['Romanov Gamer', 'Ivanz1to', 'Thaue Neves', 'Netenho', 'Aquillizz'];
    for (const q of queries) {
        const handle = await findExactYoutubeUrl(q);
        console.log(`🔎 Busca "${q}" -> Handle: https://www.youtube.com${handle}`);
    }
})();
