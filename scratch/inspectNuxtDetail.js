const { fetchJson } = require('../services/http');

(async () => {
    try {
        const html = await fetchJson('https://www.pubg.com/pt-br/news', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        // Procurar por "10828" ou "patch" no HTML
        const pos = html.indexOf('10828');
        if (pos !== -1) {
            console.log('✅ Notícia 10828 encontrada no HTML! Trecho:');
            console.log(html.slice(Math.max(0, pos - 150), pos + 300));
        } else {
            console.log('⚠ ID 10828 não encontrado na página 1. Procurando títulos recentes...');
            const titles = [...html.matchAll(/"title":"([^"]+)"/g)].map(m => m[1]);
            console.log('Títulos no JSON:', titles.slice(0, 10));
        }

        // Buscar imagens e URLs /news/
        const newsUrls = [...html.matchAll(/\/news\/(\d+)/g)].map(m => m[1]);
        console.log('IDs de Notícias encontrados:', [...new Set(newsUrls)]);

    } catch (e) {
        console.log('Error:', e.message);
    }
})();
