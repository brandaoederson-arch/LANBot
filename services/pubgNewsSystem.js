const Parser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const ids = require('../config/ids.json');
const creatorsConfig = require('../config/pubgCreators.json');
const { fetchJson } = require('./http');
const { translateToPtBr } = require('./translator');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
});

const DATA_FILE = path.join(__dirname, '../data/publishedPubgNewsSystem.json');
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

const PUBG_STEAM_NEWS_URL = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=578080&count=15&maxlength=400&format=json';

const HIGH_PRIORITY_KEYWORDS = [
    'patch notes', 'patch', 'update', 'atualização', 'atualizacao', 'manutenção', 'manutencao',
    'hotfix', 'season', 'temporada', 'survivor pass', 'evento', 'event', 'drops', 'twitch drops',
    'dev letter', 'roadmap', 'ban wave', 'weekly bans', 'anti-cheat', 'mapa', 'map', 'balanceamento',
    'arma', 'veículo', 'veiculo', 'pgs', 'pgc', 'ewc', 'esports', 'is live', 'final stage', 'grand finals'
];

const BLOCKED_KEYWORDS = [
    'shorts', '#shorts', 'live completa', 'vod', 'gameplay casual', 'gameplay', 'highlights',
    'kills', 'compilação', 'compilacao', 'rumor', 'vazamento', 'leak', 'polêmica', 'polemica',
    'cancelado', 'curiosidade', 'melhor arma da temporada'
];

let publishedHistory = new Set();

async function loadHistory() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            await fsp.writeFile(DATA_FILE, JSON.stringify([], null, 4), 'utf8');
        }
        const raw = await fsp.readFile(DATA_FILE, 'utf8');
        publishedHistory = new Set(JSON.parse(raw));
    } catch (e) {
        publishedHistory = new Set();
    }
}

async function saveHistory() {
    try {
        await fsp.writeFile(DATA_FILE, JSON.stringify([...publishedHistory], null, 4), 'utf8');
    } catch (e) {
        console.log('⚠ Erro ao salvar histórico de notícias do PUBG:', e.message);
    }
}

function cleanBBCode(str) {
    if (!str) return '';
    return str
        .replace(/\{STEAM_CLAN_IMAGE\}[^\s]+/g, '')
        .replace(/\[\/?(b|i|u|url|img|h1|h2|h3|list|\*)[^\]]*\]/gi, '')
        .replace(/Read the full announcement here!/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractImage(contents) {
    if (!contents) return null;
    const match = contents.match(/\{STEAM_CLAN_IMAGE\}\/([^\s"'<>\n]+)/i) || contents.match(/https:\/\/[^\s"'<>\n]+\.(png|jpg|jpeg|webp)/i);
    if (match) {
        if (match[0].startsWith('{STEAM_CLAN_IMAGE}')) {
            return `https://clan.cloudflare.steamstatic.com/images/${match[1]}`;
        }
        return match[0];
    }
    return null;
}

// 🔴 1. Processa Notícias Oficiais da KRAFTON / PUBG via Steam API (Com Layout Premium em PT-BR)
async function checkOfficialPubgNews(channel) {
    let publishedCount = 0;

    try {
        const data = await fetchJson(PUBG_STEAM_NEWS_URL, { timeout: 8000, retries: 2 });
        const items = data?.appnews?.newsitems || [];

        for (const item of items) {
            const guid = `pubg-official-${item.gid || item.date}-${item.title}`;
            if (publishedHistory.has(guid)) continue;

            const text = `${item.title} ${item.contents}`.toLowerCase();

            if (!HIGH_PRIORITY_KEYWORDS.some(k => text.includes(k))) {
                publishedHistory.add(guid);
                continue;
            }

            const rawDescription = cleanBBCode(item.contents);
            const imageUrl = extractImage(item.contents);
            const dateStr = new Date(item.date * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            console.log(`🌐 Traduzindo notícia do PUBG para PT-BR: "${item.title}"`);
            const titlePtBr = await translateToPtBr(item.title);
            const descriptionPtBr = await translateToPtBr(rawDescription.slice(0, 350));

            const formattedDescription =
                `📌 **Resumo do Comunicado:**\n${descriptionPtBr}${rawDescription.length > 350 ? '...' : ''}\n\n` +
                `👉 **[Clique aqui para ler o anúncio completo na Steam](${item.url})**`;

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C) // Vermelho Alerta Premium
                .setAuthor({ name: '🔴 COMUNICADO OFICIAL KRAFTON • STEAM HUB', iconURL: 'https://i.imgur.com/vHqB48l.png' })
                .setTitle(`📰 ${titlePtBr}`)
                .setURL(item.url)
                .setDescription(formattedDescription)
                .addFields(
                    { name: '📢 Fonte Oficial', value: `\`${item.feedlabel || 'PUBG Dev Team'}\``, inline: true },
                    { name: '📅 Data', value: `\`${dateStr}\``, inline: true }
                )
                .setFooter({ text: 'Notícias Oficiais PUBG • Traduzido para PT-BR • Clã SO NO TCHEREREU' })
                .setTimestamp(new Date(item.date * 1000));

            if (imageUrl) embed.setImage(imageUrl);

            const sent = await channel.send({ embeds: [embed] });
            await sent.react('📰').catch(() => null);
            await sent.react('🔥').catch(() => null);

            publishedHistory.add(guid);
            publishedCount++;

            console.log(`✅ Notícia Oficial PUBG traduzida e publicada: ${titlePtBr}`);
        }
    } catch (e) {
        console.log('⚠ Erro ao verificar notícias oficiais do PUBG:', e.message);
    }

    return publishedCount;
}

// 🟡 2. Processa Vídeos da Lista Branca de Criadores Aprovados (Exclusivo para #videos-e-clips ID 1536847149369921596)
async function checkCreatorAnalyses(client, newsChannel) {
    let publishedCount = 0;

    const clipsChannelId = ids.channels.videosEClipes || '1536847149369921596';
    const clipsChannel = await client.channels.fetch(clipsChannelId).catch(() => null);

    for (const creator of creatorsConfig) {
        if (!creator.rssUrl) continue;

        try {
            const feed = await parser.parseURL(creator.rssUrl);
            const items = (feed.items || []).slice(0, 4);

            for (const item of items) {
                const guid = `pubg-creator-${item.id || item.link || item.title}`;
                if (publishedHistory.has(guid)) continue;

                const title = (item.title || '').trim();
                const textLower = `${title} ${item.contentSnippet || ''}`.toLowerCase();

                if (creator.mustContainPubg && !textLower.includes('pubg') && !textLower.includes('battlegrounds')) {
                    publishedHistory.add(guid);
                    continue;
                }

                if (BLOCKED_KEYWORDS.some(k => textLower.includes(k))) {
                    publishedHistory.add(guid);
                    continue;
                }

                const titlePtBr = await translateToPtBr(title);
                const dateStr = item.pubDate ? new Date(item.pubDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recente';

                const formattedDescription =
                    `📺 **${creator.name}** publicou um novo vídeo/análise em português no canal!\n\n` +
                    `▶ **[Clique aqui para assistir ao vídeo no YouTube](${item.link})**`;

                const embed = new EmbedBuilder()
                    .setColor(0xF2A900)
                    .setAuthor({ name: `🎥 VÍDEO & ANÁLISE • ${creator.name.toUpperCase()} (${creator.platform || 'YouTube'})` })
                    .setTitle(`🎬 ${titlePtBr}`)
                    .setURL(item.link)
                    .setDescription(formattedDescription)
                    .addFields(
                        { name: '👤 Criador Aprovado', value: `\`${creator.name}\``, inline: true },
                        { name: '📅 Publicado em', value: `\`${dateStr}\``, inline: true }
                    )
                    .setFooter({ text: 'Vídeos & Clipes • Clã SO NO TCHEREREU' })
                    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());

                if (clipsChannel) {
                    const sentClips = await clipsChannel.send({
                        content: `🎥 **Novo vídeo de ${creator.name}!** ${item.link}`,
                        embeds: [embed]
                    });
                    await sentClips.react('🎬').catch(() => null);
                    await sentClips.react('🔥').catch(() => null);
                }

                publishedHistory.add(guid);
                publishedCount++;

                console.log(`✅ Vídeo do Criador (${creator.name}) publicado em #videos-e-clips: ${titlePtBr}`);
            }
        } catch (e) {
            console.log(`⚠ Aviso ao buscar feed do criador ${creator.name}:`, e.message);
        }
    }

    return publishedCount;
}

// Executor Principal do Sistema de Notícias PUBG
async function runPubgNewsSystem(client) {
    const channelId = ids.channels.pubgNoticias || ids.channels.noticias;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    console.log('\n========================================');
    console.log('🔫 Executando Curadoria de Notícias PUBG & Criadores com Layout Premium...');
    console.log('========================================');

    await loadHistory();

    const officialCount = await checkOfficialPubgNews(channel);
    const creatorCount = await checkCreatorAnalyses(client, channel);

    const totalNew = officialCount + creatorCount;

    if (totalNew > 0) {
        await saveHistory();
    }

    console.log(`🏁 Sistema de Notícias PUBG finalizado. Total de novas publicações: ${totalNew}\n`);
}

function startPubgNewsSystem(client) {
    runPubgNewsSystem(client);

    setInterval(() => {
        runPubgNewsSystem(client);
    }, CHECK_INTERVAL);

    console.log('⏰ Sistema de Notícias PUBG com Layout Premium ativo e verificando a cada 30 minutos.');
}

module.exports = {
    startPubgNewsSystem,
    runPubgNewsSystem
};
