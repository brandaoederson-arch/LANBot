const Parser = require('rss-parser');
const { fetchJson } = require('../services/http');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
});

async function resolveYouTubeChannelId(handle) {
    try {
        const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
        const url = `https://www.youtube.com/${cleanHandle}`;
        const html = await fetchJson(url, { timeout: 8000 });
        const match = html.match(/"channelId":"([^"]+)"/) || html.match(/<meta[^>]*itemprop=["']channelId["'][^>]*content=["']([^"']+)["']/i);
        if (match) {
            return match[1];
        }
    } catch (e) {
        console.log(`⚠ Não foi possível resolver ID para ${handle}:`, e.message);
    }
    return null;
}

(async () => {
    const creators = [
        { name: 'Éderson Brandão', handle: '@Aquillizz' },
        { name: 'Romanov Gamer', handle: '@RomanovGamer' },
        { name: 'Ivanz1to', handle: '@ivanz1to' },
        { name: 'Thauê Neves', handle: '@ThaueNeves' },
        { name: 'Netenho', handle: '@Netenho' }
    ];

    for (const c of creators) {
        const channelId = await resolveYouTubeChannelId(c.handle);
        console.log(`Criador: ${c.name} (${c.handle}) -> Channel ID: ${channelId}`);
        if (channelId) {
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
            try {
                const feed = await parser.parseURL(rssUrl);
                console.log(`  ✅ Feed OK! Título: ${feed.title} | ${feed.items?.length || 0} vídeo(s)`);
                if (feed.items && feed.items.length > 0) {
                    console.log(`     Último vídeo: ${feed.items[0].title} (${feed.items[0].link})`);
                }
            } catch (e) {
                console.log(`  ❌ Erro ao ler RSS: ${e.message}`);
            }
        }
    }
})();
