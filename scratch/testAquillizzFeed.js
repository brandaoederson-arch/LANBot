const Parser = require('rss-parser');
const parser = new Parser();

(async () => {
    console.log('🔍 Testando feed do canal @Aquillizz no YouTube...');
    const urls = [
        'https://www.youtube.com/feeds/videos.xml?user=Aquillizz',
        'https://www.youtube.com/feeds/videos.xml?user=edersonbrandao'
    ];

    for (const url of urls) {
        try {
            console.log(`Buscando: ${url}`);
            const feed = await parser.parseURL(url);
            console.log(`✅ Sucesso! Título do Canal: ${feed.title}`);
            for (const item of (feed.items || []).slice(0, 3)) {
                console.log(` - [${item.pubDate}] ${item.title} (${item.link})`);
            }
        } catch (e) {
            console.log(`⚠ Falhou: ${e.message}`);
        }
    }
})();
