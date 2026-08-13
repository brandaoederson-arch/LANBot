const Parser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const ids = require('../config/ids.json');
const { translateToPtBr } = require('./translator');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
});

const DATA_FILE = path.join(__dirname, '../data/publishedNews.json');
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

// Feeds de Games & Hardware
const FEEDS_PTBR = [
    { name: 'Adrenaline (Games & Hardware BR)', url: 'https://www.adrenaline.com.br/feed/', color: 0xE74C3C, icon: '🔥' },
    { name: 'IGN Brasil', url: 'https://br.ign.com/feed.xml', color: 0xE67E22, icon: '🎮' },
    { name: 'Eurogamer PT-BR', url: 'https://www.eurogamer.pt/feed', color: 0x3498DB, icon: '📰' },
    { name: 'Hardware.com.br', url: 'https://www.hardware.com.br/feed', color: 0x9B59B6, icon: '💻' }
];

// Palavras-chave de alta e média prioridade
const HIGH_PRIORITY_KEYWORDS = [
    'battlefield', 'delta force', 'gta', 'grand theft auto', 'call of duty', 'cod', 'warzone',
    'rainbow six', 'r6', 'tarkov', 'escape from tarkov', 'counter strike', 'cs2', 'pubg',
    'nvidia', 'amd', 'intel', 'rtx', 'radeon', 'ryzen', 'geforce', 'steam deck',
    'patch notes', 'atualização', 'atualizacao', 'update', 'nova temporada', 'season',
    'evento', 'dlc', 'expansão', 'expansao', 'lançamento', 'lancamento', 'beta', 'roadmap'
];

// Palavras para ignorar (Baixa prioridade / Fofocas / Rumores)
const IGNORE_KEYWORDS = [
    'rumor', 'leak', 'vazamento', 'vaza', 'demissão', 'demissao', 'demissões', 'demissoes',
    'polêmica', 'polemica', 'processo', 'aquisição', 'aquisicao', 'review', 'análise', 'analise',
    'streamer', 'influenciador', 'cancelado'
];

let publishedNews = new Set();

async function loadPublishedNews() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            await fsp.writeFile(DATA_FILE, JSON.stringify([], null, 4), 'utf8');
        }
        const raw = await fsp.readFile(DATA_FILE, 'utf8');
        publishedNews = new Set(JSON.parse(raw));
    } catch (e) {
        publishedNews = new Set();
    }
}

async function savePublishedNews() {
    try {
        await fsp.writeFile(DATA_FILE, JSON.stringify([...publishedNews], null, 4), 'utf8');
    } catch (e) {
        console.log('⚠ Erro ao salvar histórico de notícias:', e.message);
    }
}

function shouldPublish(title, snippet) {
    const text = `${title} ${snippet}`.toLowerCase();

    // Se contiver palavra para ignorar -> rejeita
    if (IGNORE_KEYWORDS.some(k => text.includes(k))) {
        return false;
    }

    // Se contiver palavra de alta/média prioridade -> aceita
    if (HIGH_PRIORITY_KEYWORDS.some(k => text.includes(k))) {
        return true;
    }

    // Aceita novidades de hardware ou grandes anúncios gerais
    return text.includes('anúncio') || text.includes('anuncio') || text.includes('jogo') || text.includes('game') || text.includes('gpu') || text.includes('cpu');
}

function extractImageUrl(item) {
    if (item.enclosure?.url) return item.enclosure.url;
    if (item['media:content']?.$.url) return item['media:content'].$.url;

    const content = item.content || item['content:encoded'] || '';
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch) return imgMatch[1];

    return null;
}

async function checkNews(client) {
    const channelId = ids.channels.noticias;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    console.log('\n========================================');
    console.log('📰 Verificando feed de notícias Gamer & Hardware...');
    console.log('========================================');

    let totalPublishedInRun = 0;

    for (const feedConfig of FEEDS_PTBR) {
        try {
            const feed = await parser.parseURL(feedConfig.url);
            const items = feed.items.slice(0, 5); // Analisa as 5 últimas notícias de cada feed

            for (const item of items) {
                const guid = item.guid || item.link || item.title;
                if (publishedNews.has(guid)) continue;

                const title = item.title?.trim();
                const snippet = item.contentSnippet || item.content || '';

                if (!title || !shouldPublish(title, snippet)) {
                    publishedNews.add(guid);
                    continue;
                }

                const imageUrl = extractImageUrl(item);

                // 🇧🇷 Garante tradução para Português (Brasil) se houver termos em inglês
                const titlePtBr = await translateToPtBr(title);
                const snippetPtBr = await translateToPtBr(snippet.slice(0, 280));

                const embed = new EmbedBuilder()
                    .setColor(feedConfig.color)
                    .setAuthor({ name: `${feedConfig.icon} ${feedConfig.name}` })
                    .setTitle(titlePtBr)
                    .setURL(item.link)
                    .setDescription(snippetPtBr + (snippet.length > 280 ? '...' : ''))
                    .setFooter({ text: 'Notícias Oficiais Gamer & Hardware (PT-BR) • Clã SO NO TCHEREREU' })
                    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());

                if (imageUrl && imageUrl.startsWith('http')) {
                    embed.setImage(imageUrl);
                }

                const sentMessage = await channel.send({ embeds: [embed] });
                await sentMessage.react('📰').catch(() => null);
                await sentMessage.react('🔥').catch(() => null);

                publishedNews.add(guid);
                totalPublishedInRun++;

                console.log(`✅ Notícia PT-BR publicada (${feedConfig.name}): ${titlePtBr}`);
            }
        } catch (e) {
            console.log(`⚠ Erro ao verificar feed (${feedConfig.name}):`, e.message);
        }
    }

    // Se houver notícias publicadas neste ciclo, faz 1 ÚNICA MENÇÃO ao @everyone no final!
    if (totalPublishedInRun > 0) {
        await channel.send({
            content: '📢 @everyone **Novas notícias importantes sobre o mundo Gamer & Hardware foram publicadas acima!**',
            allowedMentions: { parse: ['everyone'] }
        }).catch(() => null);
        await savePublishedNews();
    }

    console.log(`🏁 Verificação de notícias PT-BR finalizada. ${totalPublishedInRun} novidade(s) enviada(s).\n`);
}

async function startNewsWatcher(client) {
    await loadPublishedNews();
    await checkNews(client);

    setInterval(() => {
        checkNews(client);
    }, CHECK_INTERVAL);
}

module.exports = {
    startNewsWatcher,
    checkNews
};
