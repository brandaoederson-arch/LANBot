const Parser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const ids = require('../config/ids.json');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
});

const DATA_FILE = path.join(__dirname, '../data/publishedTikToks.json');
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

const TIKTOK_ACCOUNTS = [
    {
        name: 'Éderson Brandão',
        handle: '@edersonbrandao',
        url: 'https://www.tiktok.com/@edersonbrandao',
        rssUrl: 'https://rsshub.app/tiktok/user/edersonbrandao',
        type: 'user'
    }
];

// Hashtags Aprovadas para busca de clipes e destaques de games/PUBG
const GAMING_HASHTAGS = [
    { tag: 'pubg', label: '#pubg', rssUrl: 'https://rsshub.app/tiktok/tag/pubg' },
    { tag: 'fpsbrasil', label: '#fpsbrasil', rssUrl: 'https://rsshub.app/tiktok/tag/fpsbrasil' },
    { tag: 'battleroyale', label: '#battleroyale', rssUrl: 'https://rsshub.app/tiktok/tag/battleroyale' },
    { tag: 'TikTokGaming', label: '#TikTokGaming', rssUrl: 'https://rsshub.app/tiktok/tag/tiktokgaming' },
    { tag: 'cortes', label: '#cortes', rssUrl: 'https://rsshub.app/tiktok/tag/cortes' }
];

let publishedTikToks = new Set();

async function loadHistory() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            await fsp.writeFile(DATA_FILE, JSON.stringify([], null, 4), 'utf8');
        }
        const raw = await fsp.readFile(DATA_FILE, 'utf8');
        publishedTikToks = new Set(JSON.parse(raw));
    } catch (e) {
        publishedTikToks = new Set();
    }
}

async function saveHistory() {
    try {
        await fsp.writeFile(DATA_FILE, JSON.stringify([...publishedTikToks], null, 4), 'utf8');
    } catch (e) {
        console.log('⚠ Erro ao salvar histórico de TikToks:', e.message);
    }
}

async function checkTikToks(client) {
    const channelId = ids.channels.videosEClipes || '1535830548570841149';
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    console.log('\n========================================');
    console.log('🎵 Verificando vídeos do TikTok para o canal #videos-e-clips (ID 1535830548570841149)...');
    console.log('========================================');

    await loadHistory();
    let totalNew = 0;

    // 1. Processa conta oficial do Éderson Brandão
    for (const account of TIKTOK_ACCOUNTS) {
        try {
            const feed = await parser.parseURL(account.rssUrl).catch(() => null);
            if (!feed || !feed.items || feed.items.length === 0) continue;

            for (const item of feed.items.slice(0, 3)) {
                const guid = `tiktok-user-${account.handle}-${item.id || item.link || item.title}`;
                if (publishedTikToks.has(guid)) continue;

                const title = (item.title || 'Novo vídeo no TikTok').trim();
                const videoUrl = item.link || account.url;
                const dateStr = item.pubDate ? new Date(item.pubDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recente';

                const embed = new EmbedBuilder()
                    .setColor(0xEE1D52) // Vermelho TikTok
                    .setAuthor({ name: `🎵 TIKTOK DE ${account.name.toUpperCase()} (${account.handle})`, iconURL: 'https://i.imgur.com/8Q9Z8gG.png' })
                    .setTitle(`🎬 ${title}`)
                    .setURL(videoUrl)
                    .setDescription(`📱 **${account.name}** publicou um novo vídeo no TikTok!\n\n▶ **[Assistir no TikTok](${videoUrl})**`)
                    .addFields(
                        { name: '👤 Criador', value: `\`${account.name} (${account.handle})\``, inline: true },
                        { name: '📅 Publicado em', value: `\`${dateStr}\``, inline: true }
                    )
                    .setFooter({ text: 'Vídeos & Clipes da Comunidade • Clã SO NO TCHEREREU' })
                    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());

                const sent = await channel.send({
                    content: `🎵 **Novo vídeo no TikTok de ${account.name}!** ${videoUrl}`,
                    embeds: [embed]
                });

                await sent.react('🔥').catch(() => null);
                await sent.react('🎵').catch(() => null);

                publishedTikToks.add(guid);
                totalNew++;

                console.log(`✅ Vídeo do TikTok de ${account.name} publicado: ${title}`);
            }
        } catch (e) {
            console.log(`⚠ Erro ao verificar TikTok de ${account.name}:`, e.message);
        }
    }

    // 2. Processa buscas por Hashtags Gamers (#pubg, #fpsbrasil, #battleroyale, #TikTokGaming, #cortes)
    for (const hashtagObj of GAMING_HASHTAGS) {
        try {
            const feed = await parser.parseURL(hashtagObj.rssUrl).catch(() => null);
            if (!feed || !feed.items || feed.items.length === 0) continue;

            for (const item of feed.items.slice(0, 2)) {
                const guid = `tiktok-tag-${hashtagObj.tag}-${item.id || item.link || item.title}`;
                if (publishedTikToks.has(guid)) continue;

                const title = (item.title || 'Destaque de Game no TikTok').trim();
                const videoUrl = item.link || `https://www.tiktok.com/tag/${hashtagObj.tag}`;
                const dateStr = item.pubDate ? new Date(item.pubDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recente';

                const embed = new EmbedBuilder()
                    .setColor(0x25F4EE) // Ciano TikTok
                    .setAuthor({ name: `🔥 DESTAQUE NO TIKTOK • ${hashtagObj.label}`, iconURL: 'https://i.imgur.com/8Q9Z8gG.png' })
                    .setTitle(`🎮 ${title}`)
                    .setURL(videoUrl)
                    .setDescription(`📱 Encontrado destaque em alta com a hashtag **${hashtagObj.label}**!\n\n▶ **[Assistir ao Clipe no TikTok](${videoUrl})**`)
                    .addFields(
                        { name: '🏷️ Hashtag', value: `\`${hashtagObj.label}\``, inline: true },
                        { name: '📅 Publicado em', value: `\`${dateStr}\``, inline: true }
                    )
                    .setFooter({ text: 'Curadoria de Clipes & Hashtags • Clã SO NO TCHEREREU' })
                    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());

                const sent = await channel.send({
                    content: `🔥 **Clipe em alta no TikTok em ${hashtagObj.label}!** ${videoUrl}`,
                    embeds: [embed]
                });

                await sent.react('🎬').catch(() => null);
                await sent.react('🔥').catch(() => null);

                publishedTikToks.add(guid);
                totalNew++;

                console.log(`✅ Clipe por Hashtag (${hashtagObj.label}) publicado: ${title}`);
            }
        } catch (e) {
            console.log(`⚠ Erro ao verificar hashtag TikTok ${hashtagObj.label}:`, e.message);
        }
    }

    if (totalNew > 0) {
        await saveHistory();
    }

    console.log(`🏁 Verificação do TikTok finalizada. ${totalNew} novo(s) vídeo(s) enviado(s).\n`);
}

function startTikTokWatcher(client) {
    checkTikToks(client);

    setInterval(() => {
        checkTikToks(client);
    }, CHECK_INTERVAL);

    console.log('⏰ TikTok Watcher (Perfil + Hashtags) ativo e verificando a cada 30 minutos.');
}

module.exports = {
    startTikTokWatcher,
    checkTikToks
};
