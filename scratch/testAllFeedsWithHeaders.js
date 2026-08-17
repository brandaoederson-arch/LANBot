const Parser = require('rss-parser');
const { fetchJson } = require('../services/http');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9'
    }
});

const creators = [
    { name: 'Éderson Brandão (YouTube)', channelId: 'UC3nfKaWzEHk3MR8ylQhYYWg' },
    { name: 'Romanov Gamer', channelId: 'UC-4_sJukWTmHh1kx9_KScEA' },
    { name: 'Ivanz1to', channelId: 'UCms3ZQyrvmP3VjpfY04XZQg' },
    { name: 'Thauê Neves', channelId: 'UCCMy8FH2rVKcK4Ib0JYJFGQ' },
    { name: 'Netenho', channelId: 'UCzTfypZ1udobIqNsC0ddB5w' }
];

(async () => {
    for (const c of creators) {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${c.channelId}`;
        try {
            const xml = await fetchJson(rssUrl, { timeout: 8000 });
            const feed = await parser.parseString(xml);
            console.log(`✅ ${c.name}: ${feed.items?.length || 0} vídeo(s) encontrado(s)!`);
            if (feed.items && feed.items.length > 0) {
                console.log(`   👉 Último vídeo: "${feed.items[0].title}" (${feed.items[0].link})`);
            }
        } catch (e) {
            console.log(`❌ Erro para ${c.name}:`, e.message);
        }
    }
})();
