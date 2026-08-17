const { fetchJson } = require('../services/http');

async function getChannelIdFromHandle(handle) {
    try {
        const url = `https://www.youtube.com/${handle}`;
        const html = await fetchJson(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const idMatch = html.match(/channel_id=([a-zA-Z0-9_-]+)/) ||
                        html.match(/<meta[^>]*itemprop=["']channelId["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/"channelId":"([^"]+)"/) ||
                        html.match(/href="https:\/\/www\.youtube\.com\/channel\/([a-zA-Z0-9_-]+)"/);

        if (idMatch) return idMatch[1];
    } catch (e) {
        console.log(`⚠ Erro ao buscar ${handle}:`, e.message);
    }
    return null;
}

(async () => {
    const handles = [
        { name: 'Éderson Brandão', handle: '@Aquillizz' },
        { name: 'Romanov Gamer', handle: '@RomanovGamer' },
        { name: 'Ivanz1to', handle: '@ivanz1to' },
        { name: 'Thauê Neves', handle: '@ThaueNeves' },
        { name: 'Netenho', handle: '@Netenho' }
    ];

    for (const h of handles) {
        const channelId = await getChannelIdFromHandle(h.handle);
        console.log(`📌 ${h.name} (${h.handle}) -> Channel ID: ${channelId}`);
    }
})();
