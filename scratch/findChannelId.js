const { fetchJson } = require('../services/http');

(async () => {
    try {
        console.log('🔍 Buscando o Channel ID do canal @Aquillizz no YouTube...');
        const url = 'https://www.youtube.com/@Aquillizz';
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const html = await res.text();
        const match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/);
        if (match) {
            console.log(`✅ Channel ID encontrado: ${match[1]}`);
            console.log(`URL RSS Oficial: https://www.youtube.com/feeds/videos.xml?channel_id=${match[1]}`);
        } else {
            console.log('⚠ Não foi possível extrair o Channel ID diretamente da página.');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
})();
