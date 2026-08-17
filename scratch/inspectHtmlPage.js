const { fetchJson } = require('../services/http');

(async () => {
    try {
        console.log('🔍 Inspecionando scripts e payloads no pubg.com/pt-br/news...');
        const html = await fetchJson('https://www.pubg.com/pt-br/news', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        // Procurar por tags <script> com dados ou JSON
        const scripts = [...html.matchAll(/<script[^>]*>(.*?)<\/script>/gs)].map(m => m[1]);
        console.log(`📌 Total de scripts no HTML: ${scripts.length}`);

        for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            if (script.includes('news') || script.includes('category') || script.includes('patch')) {
                console.log(`\nScript #${i} (tamanho ${script.length}):`);
                console.log(script.slice(0, 300));
            }
        }

    } catch (e) {
        console.log('❌ Erro:', e.message);
    }
})();
