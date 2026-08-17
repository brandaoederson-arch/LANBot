const { fetchJson } = require('../services/http');

function extractPubgComNews(html) {
    const articles = [];
    
    // Expressão regular para pegar objetos com postId e dados de notícia
    const postMatches = html.matchAll(/postId:(\d+),.*?,postContentId:(\d+).*?title:([a-zA-Z0-9_$]+).*?imageUrl:"([^"]+)"/g);
    
    // Vamos também mapear as variáveis do NUXT (ex: title:aq -> aq:"Notas de Atualização...")
    const varMap = {};
    const varMatches = html.matchAll(/,([a-zA-Z0-9_$]+):"([^"]*)"/g);
    for (const m of varMatches) {
        varMap[m[1]] = m[2];
    }

    // Pega todas as ocorrências de postId
    const idRegex = /postId:(\d+)/g;
    let match;
    const postIds = new Set();
    while ((match = idRegex.exec(html)) !== null) {
        postIds.add(match[1]);
    }

    // Pega os blocos de notícias
    for (const id of postIds) {
        const idIdx = html.indexOf(`postId:${id}`);
        if (idIdx === -1) continue;

        const slice = html.slice(idIdx, idIdx + 600);
        
        // Pega data
        const dateMatch = slice.match(/createdAt:"([^"]+)"/);
        const categoryMatch = slice.match(/category:([a-zA-Z0-9_$]+)/);
        const imageMatch = slice.match(/imageUrl:"([^"]+)"/);
        const titleMatch = slice.match(/title:([a-zA-Z0-9_$]+)/);

        const date = dateMatch ? dateMatch[1] : new Date().toISOString();
        const rawCategory = categoryMatch ? (varMap[categoryMatch[1]] || categoryMatch[1]) : 'news';
        const rawTitle = titleMatch ? (varMap[titleMatch[1]] || titleMatch[1]) : `Notícia PUBG #${id}`;
        let imageUrl = imageMatch ? imageMatch[1].replace(/\\u002F/g, '/') : null;

        articles.push({
            id,
            title: rawTitle,
            category: rawCategory,
            date,
            imageUrl,
            url: `https://www.pubg.com/pt-br/news/${id}`
        });
    }

    return articles;
}

(async () => {
    try {
        console.log('🔍 Testando extrator do pubg.com/pt-br/news...');
        const html = await fetchJson('https://www.pubg.com/pt-br/news', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const news = extractPubgComNews(html);
        console.log(`✅ ${news.length} notícias extraídas do portal oficial pubg.com!`);
        for (const item of news.slice(0, 8)) {
            console.log(`\n📌 [ID ${item.id}] [Cat: ${item.category}] ${item.title}`);
            console.log(`   Data: ${item.date}`);
            console.log(`   Image: ${item.imageUrl}`);
            console.log(`   Link: ${item.url}`);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
})();
