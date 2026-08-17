const { fetchJson } = require('../services/http');

async function searchYouTubeChannel(query) {
    try {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`;
        const html = await fetchJson(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const matches = [...html.matchAll(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/g)];
        if (matches.length > 0) {
            return matches[0][1];
        }
    } catch (e) {
        console.log(`⚠ Erro ao buscar ${query}:`, e.message);
    }
    return null;
}

(async () => {
    const romanovId = await searchYouTubeChannel('Romanov Gamer PUBG');
    const ivanz1toId = await searchYouTubeChannel('Ivanz1to PUBG');

    console.log(`📌 Romanov Gamer Channel ID: ${romanovId}`);
    console.log(`📌 Ivanz1to Channel ID: ${ivanz1toId}`);
})();
