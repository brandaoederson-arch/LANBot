const { fetchJson } = require('../services/http');

async function getLatestVideosFromHandle(handle) {
    try {
        const url = `https://www.youtube.com/${handle}/videos`;
        const html = await fetchJson(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const videos = [];
        const videoMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})","thumbnail":.*?,"title":{"runs":\[{"text":"([^"]+)"}/g)];

        const seenIds = new Set();
        for (const match of videoMatches) {
            const videoId = match[1];
            const title = match[2];
            if (!seenIds.has(videoId)) {
                seenIds.add(videoId);
                videos.push({
                    id: videoId,
                    title: title,
                    url: `https://www.youtube.com/watch?v=${videoId}`
                });
            }
        }

        return videos;
    } catch (e) {
        console.log(`⚠ Erro ao buscar vídeos de ${handle}:`, e.message);
        return [];
    }
}

(async () => {
    const creators = [
        { name: 'Éderson Brandão', handle: '@Aquillizz' },
        { name: 'Romanov Gamer', handle: '@RomanovGamer' },
        { name: 'Ivanz1to', handle: '@ivanz1to' },
        { name: 'Thauê Neves', handle: '@ThaueNeves' },
        { name: 'Netenho', handle: '@Netenho' }
    ];

    for (const c of creators) {
        const videos = await getLatestVideosFromHandle(c.handle);
        console.log(`📌 ${c.name} (${c.handle}): ${videos.length} vídeo(s) encontrado(s)!`);
        if (videos.length > 0) {
            console.log(`   👉 Último vídeo: "${videos[0].title}" (${videos[0].url})`);
        }
    }
})();
