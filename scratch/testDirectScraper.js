const { fetchJson } = require('../services/http');

async function scrapePubgWebNews() {
    const html = await fetchJson('https://www.pubg.com/pt-br/news', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9'
        }
    });

    const articles = [];
    const postMatches = html.matchAll(/postId:(\d+).*?createdAt:"([^"]+)".*?imageUrl:"([^"]+)"/g);
    
    // Extrai os blocos do NUXT
    const nuxtText = html.slice(html.indexOf('window.__NUXT__'), html.indexOf('</script>'));
    
    // Mapeia todas as strings entre aspas
    const strings = [...nuxtText.matchAll(/"([^"]{3,200})"/g)].map(m => m[1]);

    const postIds = new Set();
    const idRegex = /postId:(\d+)/g;
    let match;
    while ((match = idRegex.exec(html)) !== null) {
        postIds.add(match[1]);
    }

    for (const id of postIds) {
        const idPos = html.indexOf(`postId:${id}`);
        const block = html.slice(Math.max(0, idPos - 100), idPos + 500);

        const imgMatch = block.match(/imageUrl:"([^"]+)"/);
        const dateMatch = block.match(/createdAt:"([^"]+)"/);
        const catMatch = block.match(/category:"([^"]+)"/);

        // Busca o título aproximado próximo ao ID no HTML
        const url = `https://www.pubg.com/pt-br/news/${id}`;
        const imageUrl = imgMatch ? imgMatch[1].replace(/\\u002F/g, '/') : null;
        const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);
        const category = catMatch ? catMatch[1] : 'notice';

        articles.push({
            id,
            url,
            imageUrl,
            date,
            category
        });
    }

    return articles;
}

(async () => {
    try {
        console.log('🔍 Executando teste do extrator pubg.com...');
        const news = await scrapePubgWebNews();
        console.log(`✅ Extraídos ${news.length} artigos!`);
        console.log(news.slice(0, 5));
    } catch (e) {
        console.log('Error:', e.message);
    }
})();
