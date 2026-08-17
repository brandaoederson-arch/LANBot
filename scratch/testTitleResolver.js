const { fetchJson } = require('../services/http');

function parseNuxtPayload(html) {
    const scriptMatch = html.match(/window\.__NUXT__=\(function\(([^)]+)\)\{return\s*([\s\S]+?)\}\(([^)]+)\)\);/);
    if (!scriptMatch) return null;

    const paramNames = scriptMatch[1].split(',').map(s => s.trim());
    const argValuesRaw = scriptMatch[3];
    
    // Parse os valores dos argumentos de forma segura
    const argValues = [];
    const argRegex = /"(?:[^"\\]|\\.)*"|[^,]+/g;
    let m;
    while ((m = argRegex.exec(argValuesRaw)) !== null) {
        let val = m[0].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\u002F/g, '/');
        }
        argValues.push(val);
    }

    const dict = {};
    for (let i = 0; i < paramNames.length; i++) {
        dict[paramNames[i]] = argValues[i] !== undefined ? argValues[i] : paramNames[i];
    }

    // Pega todas as ocorrências de postId
    const articles = [];
    const idRegex = /postId:(\d+)/g;
    let match;
    const postIds = new Set();
    while ((match = idRegex.exec(html)) !== null) {
        postIds.add(match[1]);
    }

    for (const id of postIds) {
        const idIdx = html.indexOf(`postId:${id}`);
        if (idIdx === -1) continue;

        const slice = html.slice(idIdx, idIdx + 800);
        
        const titleMatch = slice.match(/title:([a-zA-Z0-9_$]+)/);
        const categoryMatch = slice.match(/category:([a-zA-Z0-9_$]+)/);
        const dateMatch = slice.match(/createdAt:"([^"]+)"/);
        const imageMatch = slice.match(/imageUrl:"([^"]+)"/);

        const titleVar = titleMatch ? titleMatch[1] : null;
        const categoryVar = categoryMatch ? categoryMatch[1] : null;

        const title = titleVar ? (dict[titleVar] || titleVar) : `Notícia PUBG #${id}`;
        const category = categoryVar ? (dict[categoryVar] || categoryVar) : 'news';
        const date = dateMatch ? dateMatch[1] : 'Recente';
        const imageUrl = imageMatch ? imageMatch[1].replace(/\\u002F/g, '/') : null;

        articles.push({
            id,
            title,
            category,
            date,
            imageUrl,
            url: `https://www.pubg.com/pt-br/news/${id}`
        });
    }

    return articles;
}

(async () => {
    try {
        console.log('🔍 Testando extrator resolvido do pubg.com/pt-br/news...');
        const html = await fetchJson('https://www.pubg.com/pt-br/news', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const news = parseNuxtPayload(html);
        console.log(`✅ ${news?.length || 0} notícias resolvidas com título real!`);
        for (const item of (news || []).slice(0, 8)) {
            console.log(`\n📌 [ID ${item.id}] [Cat: ${item.category}]`);
            console.log(`   Título: ${item.title}`);
            console.log(`   Data: ${item.date}`);
            console.log(`   Image: ${item.imageUrl}`);
            console.log(`   Link: ${item.url}`);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
})();
