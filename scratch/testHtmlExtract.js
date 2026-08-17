const { fetchJson } = require('../services/http');

(async () => {
    try {
        console.log('🔍 Extraindo artigos do HTML de pubg.com/pt-br/news...');
        const html = await fetchJson('https://www.pubg.com/pt-br/news', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        // Testar busca por links /news/
        const newsLinks = [...html.matchAll(/href=["'](\/pt-br\/news\/\d+)["']/g)].map(m => m[1]);
        const uniqueLinks = [...new Set(newsLinks)];
        console.log(`📌 Links de notícias encontrados (${uniqueLinks.length}):`, uniqueLinks);

        // Testar busca por objetos de notícias no HTML (ex: títulos, categorias, imagens)
        const titles = [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        console.log(`📌 Títulos H3 encontrados (${titles.length}):`, titles.slice(0, 5));

    } catch (e) {
        console.log('❌ Erro:', e.message);
    }
})();
