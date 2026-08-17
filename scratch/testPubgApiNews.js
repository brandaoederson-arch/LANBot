(async () => {
    try {
        console.log('🔍 Testando API Oficial de Notícias do PUBG na Steam (GetNewsForApp AppID 578080)...');
        const url = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=578080&count=10&maxlength=300&format=json';
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await res.json();
        const newsItems = data?.appnews?.newsitems || [];

        console.log(`Recebidas ${newsItems.length} notícias oficiais do PUBG!`);
        for (const item of newsItems) {
            const dateStr = new Date(item.date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            console.log(`\n📌 [${dateStr}] Título: ${item.title}`);
            console.log(`   Fonte/Autor: ${item.feedlabel || item.author}`);
            console.log(`   Link: ${item.url}`);
            console.log(`   Resumo: ${(item.contents || '').slice(0, 120)}...`);
        }
    } catch (e) {
        console.error('Erro:', e.message);
    }
})();
