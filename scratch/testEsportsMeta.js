const { fetchJson } = require('../services/http');

async function scrapeEsportsNews() {
    const html = await fetchJson('https://pubgesports.com/pt-br/news', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9'
        }
    });

    const newsLinks = [...html.matchAll(/href=["'](\/pt-br\/news\/\d+)["']/g)].map(m => `https://pubgesports.com${m[1]}`);
    const uniqueLinks = [...new Set(newsLinks)];

    return uniqueLinks;
}

(async () => {
    try {
        console.log('🔍 Buscando notícias de PUBG Esports...');
        const links = await scrapeEsportsNews();
        console.log(`✅ ${links.length} links de Esports encontrados!`);
        console.log(links.slice(0, 5));
    } catch (e) {
        console.log('Error:', e.message);
    }
})();
