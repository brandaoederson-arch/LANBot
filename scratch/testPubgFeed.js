const Parser = require('rss-parser');
const parser = new Parser();

(async () => {
    try {
        console.log('🔍 Testando feed oficial do PUBG (Steam News RSS App 578080)...');
        const feed = await parser.parseURL('https://store.steampowered.com/news/app/578080/rss');
        console.log(`Feed recebido: ${feed.title} (${feed.items.length} itens)`);

        for (const item of feed.items.slice(0, 5)) {
            console.log(`\n📌 Título: ${item.title}`);
            console.log(`   Link: ${item.link}`);
            console.log(`   Data: ${item.pubDate}`);
            console.log(`   Snippet: ${(item.contentSnippet || '').slice(0, 100)}...`);
        }
    } catch (e) {
        console.error('Erro:', e.message);
    }
})();
