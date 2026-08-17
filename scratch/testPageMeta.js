const { fetchJson } = require('../services/http');

async function getArticleDetails(url) {
    const html = await fetchJson(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9'
        }
    });

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title>(.*?)<\/title>/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    return {
        title: ogTitleMatch ? ogTitleMatch[1].replace(/ - PUBG: BATTLEGROUNDS/gi, '').trim() : 'Notícia PUBG',
        description: ogDescMatch ? ogDescMatch[1].trim() : '',
        imageUrl: ogImageMatch ? ogImageMatch[1] : null
    };
}

(async () => {
    try {
        console.log('🔍 Testando extração de detalhes da notícia 10828...');
        const details = await getArticleDetails('https://www.pubg.com/pt-br/news/10828');
        console.log('✅ Detalhes da Notícia 10828:');
        console.log(details);
    } catch (e) {
        console.log('Error:', e.message);
    }
})();
