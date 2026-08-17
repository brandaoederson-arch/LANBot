const { fetchJson } = require('../services/http');

(async () => {
    try {
        console.log('🔍 Extraindo notícias do __NUXT__ de pubg.com/pt-br/news...');
        const html = await fetchJson('https://www.pubg.com/pt-br/news', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        // Buscar blocos JSON ou strings de notícias
        const matches = [...html.matchAll(/id["']?:\s*(\d+).*?title["']?:\s*["']([^"']+)["'].*?category["']?:\s*["']([^"']+)["']/g)];
        console.log(`📌 Notícias encontradas via Regex: ${matches.length}`);

        // Vamos extrair todos os links de matérias /news/XXXX
        const newsItems = [];
        const regex = /"id":(\d+).*?"title":"([^"]+)".*?"date":"([^"]+)".*?"category":"([^"]+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            newsItems.push({
                id: match[1],
                title: match[2],
                date: match[3],
                category: match[4],
                url: `https://www.pubg.com/pt-br/news/${match[1]}`
            });
        }

        console.log('✅ Exemplos de Notícias Extraídas:');
        console.log(newsItems.slice(0, 5));

    } catch (e) {
        console.log('❌ Erro:', e.message);
    }
})();
