const Parser = require('rss-parser');
const parser = new Parser();

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
            const feed = await parser.parseURL(rssUrl);
            console.log(`✅ ${c.name}: ${feed.items?.length || 0} vídeo(s) encontrado(s)!`);
            if (feed.items && feed.items.length > 0) {
                console.log(`   👉 Último vídeo: "${feed.items[0].title}" (${feed.items[0].link})`);
            }
        } catch (e) {
            console.log(`❌ Erro para ${c.name}:`, e.message);
        }
    }
})();
