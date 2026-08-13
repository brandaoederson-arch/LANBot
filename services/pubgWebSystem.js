const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const ids = require('../config/ids.json');
const { fetchJson } = require('./http');
const { translateToPtBr } = require('./translator');

const DATA_FILE = path.join(__dirname, '../data/publishedPubgWebNews.json');
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos

// Cores temáticas elegantes por categoria
const CATEGORY_COLORS = {
    patch_notes: 0xFF3838, // Vermelho Chama
    notice: 0xFFB100,      // Amarelo Dourado
    dev_letter: 0x9B59B6,  // Roxo Desenvolvedor
    event: 0x00D26A,       // Verde Esmeralda
    esports: 0xF1C40F,     // Dourado Campeonatos
    lives: 0x9146FF,       // Roxo Twitch
    guias: 0x2980B9        // Azul Safira
};

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
        console.log('⚠ Erro ao salvar histórico de notícias pubg.com:', e.message);
    }
}

// Extrai metadados completos da matéria no site oficial (título, descrição, imagem)
async function getArticleDetails(url) {
    try {
        const html = await fetchJson(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title>(.*?)<\/title>/i);
        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

        const rawTitle = ogTitleMatch ? ogTitleMatch[1].replace(/ - PUBG: BATTLEGROUNDS/gi, '').trim() : 'Notícia PUBG';
        const rawDesc = ogDescMatch ? ogDescMatch[1].trim() : '';
        const imageUrl = ogImageMatch ? ogImageMatch[1] : null;

        const title = await translateToPtBr(rawTitle);
        const description = await translateToPtBr(rawDesc.slice(0, 400));

        return { title, description, imageUrl };
    } catch (e) {
        console.log(`⚠ Falha ao obter detalhes do artigo (${url}):`, e.message);
        return null;
    }
}

// Scraper do portal pubg.com/pt-br/news
async function fetchPubgComNews() {
    try {
        const html = await fetchJson('https://www.pubg.com/pt-br/news', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const articles = [];
        const postIds = new Set();
        const idRegex = /postId:(\d+)/g;
        let match;

        while ((match = idRegex.exec(html)) !== null) {
            postIds.add(match[1]);
        }

        for (const id of postIds) {
            const idPos = html.indexOf(`postId:${id}`);
            const block = html.slice(Math.max(0, idPos - 100), idPos + 500);

            const imgMatch = block.match(/imageUrl:"([^"]+)"/);
            const dateMatch = block.match(/createdAt:"([^"]+)"/);
            const catMatch = block.match(/category:"([^"]+)"/);

            const url = `https://www.pubg.com/pt-br/news/${id}`;
            const imageUrl = imgMatch ? imgMatch[1].replace(/\\u002F/g, '/') : null;
            const date = dateMatch ? dateMatch[1] : 'Recente';
            const category = catMatch ? catMatch[1] : 'notice';

            articles.push({
                id: `pubgcom-${id}`,
                postId: id,
                url,
                imageUrl,
                date,
                category,
                source: 'pubgcom'
            });
        }

        return articles;
    } catch (e) {
        console.log('⚠ Erro ao buscar pubg.com/pt-br/news:', e.message);
        return [];
    }
}

// Scraper do portal pubgesports.com/pt-br/news
async function fetchPubgEsportsNews() {
    try {
        const html = await fetchJson('https://pubgesports.com/pt-br/news', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });

        const newsLinks = [...html.matchAll(/href=["'](\/pt-br\/news\/(\d+))["']/g)];
        const articles = [];
        const addedIds = new Set();

        for (const match of newsLinks) {
            const id = match[2];
            if (addedIds.has(id)) continue;
            addedIds.add(id);

            articles.push({
                id: `pubgesports-${id}`,
                postId: id,
                url: `https://pubgesports.com/pt-br/news/${id}`,
                date: 'Recente',
                category: 'esports',
                source: 'pubgesports'
            });
        }

        return articles;
    } catch (e) {
        console.log('⚠ Erro ao buscar pubgesports.com/pt-br/news:', e.message);
        return [];
    }
}

// Determina o canal de destino e o estilo visual limpo e espaçado
function targetChannelForArticle(article, details) {
    const textLower = `${details.title} ${details.description} ${article.category}`.toLowerCase();

    // 1. Torneios & Lives de Esports
    if (article.source === 'pubgesports') {
        if (textLower.includes('live') || textLower.includes('assista') || textLower.includes('drops') || textLower.includes('transmissão') || textLower.includes('transmissao')) {
            return {
                channelId: ids.channels.pubgEsportsLivesEDrops || '1537117413601190048',
                color: CATEGORY_COLORS.lives,
                categoryName: '🔴 LIVES & DROPS',
                icon: '📺'
            };
        }
        return {
            channelId: ids.channels.pubgEsportsNoticias || '1537117371486175284',
            color: CATEGORY_COLORS.esports,
            categoryName: '🏆 ESPORTS & CAMPEONATOS',
            icon: '🏆'
        };
    }

    // 2. Guias e Arsenal (Armas & Mapas)
    if (textLower.includes('arma') || textLower.includes('armas') || textLower.includes('mapa') || textLower.includes('guia') || textLower.includes('rondo') || textLower.includes('erangel') || textLower.includes('deston') || textLower.includes('taego') || textLower.includes('miramar')) {
        return {
            channelId: ids.channels.pubgGuiasEArsenal || '1537117294835273799',
            color: CATEGORY_COLORS.guias,
            categoryName: '📚 GUIAS & ARSENAL',
            icon: '📚'
        };
    }

    // 3. Eventos, Loja & G-Coin
    if (article.category === 'event' || textLower.includes('loja') || textLower.includes('g-coin') || textLower.includes('gcoin') || textLower.includes('evento') || textLower.includes('passe') || textLower.includes('recompensa') || textLower.includes('drops')) {
        return {
            channelId: ids.channels.pubgEventosEGcoin || '1537117235422830632',
            color: CATEGORY_COLORS.event,
            categoryName: '🎁 EVENTOS & G-COINS',
            icon: '🎁'
        };
    }

    // 4. Patch Notes & Atualizações do Jogo
    if (article.category === 'patch_notes' || textLower.includes('patch notes') || textLower.includes('atualização') || textLower.includes('atualizacao') || textLower.includes('notas da atualização')) {
        return {
            channelId: ids.channels.pubgAtualizacoes || '1537117144624537660',
            color: CATEGORY_COLORS.patch_notes,
            categoryName: '🔥 PATCH NOTES & ATUALIZAÇÕES',
            icon: '📢'
        };
    }

    // 5. Avisos, Manutenções & Dev Letters
    return {
        channelId: ids.channels.pubgAvisosManutencao || '1537117187955757197',
        color: CATEGORY_COLORS.notice,
        categoryName: '⚠️ AVISOS & MANUTENÇÃO',
        icon: '⚠️'
    };
}

async function checkPubgWebNews(client) {
    console.log('\n========================================');
    console.log('🌐 Verificando portal pubg.com e pubgesports.com com Layout Espaçado & Clean em PT-BR...');
    console.log('========================================');

    await loadHistory();

    const pubgComItems = await fetchPubgComNews();
    const pubgEsportsItems = await fetchPubgEsportsNews();

    const allArticles = [...pubgComItems, ...pubgEsportsItems];
    let publishedCount = 0;

    for (const article of allArticles) {
        if (publishedHistory.has(article.id)) continue;

        const details = await getArticleDetails(article.url);
        if (!details) {
            publishedHistory.add(article.id);
            continue;
        }

        const route = targetChannelForArticle(article, details);
        const channel = await client.channels.fetch(route.channelId).catch(() => null);

        if (!channel) {
            console.log(`⚠ Canal ID ${route.channelId} não encontrado.`);
            publishedHistory.add(article.id);
            continue;
        }

        // Formatação visual ultra-clean, espaçada e arejada com quebras duplas de linha
        const formattedDescription =
            `📌 **Destaques da Publicação:**\n\n` +
            `${details.description || 'Confira os detalhes oficiais desta atualização diretamente no portal do PUBG.'}\n\n\n` +
            `👉 **[Clique aqui para ler a matéria completa no portal oficial](${article.url})**`;

        const embed = new EmbedBuilder()
            .setColor(route.color)
            .setAuthor({
                name: `${route.categoryName} • PUBG BRASIL`,
                iconURL: 'https://i.imgur.com/vHqB48l.png'
            })
            .setTitle(`${route.icon} ${details.title}`)
            .setURL(article.url)
            .setDescription(formattedDescription)
            .addFields(
                { name: '📅 Publicado em', value: `\`${article.date}\``, inline: true },
                { name: '🌐 Fonte Oficial', value: `\`${article.source === 'pubgesports' ? 'PUBG Esports' : 'PUBG.com'}\``, inline: true }
            )
            .setFooter({ text: 'Central Oficial PUBG • Clã SO NO TCHEREREU' })
            .setTimestamp();

        // Puxa a capa original em alta resolução do post oficial
        const imageUrl = details.imageUrl || article.imageUrl;
        if (imageUrl) {
            embed.setImage(imageUrl);
        }

        const sent = await channel.send({
            embeds: [embed]
        });

        await sent.react('🔥').catch(() => null);
        await sent.react('📰').catch(() => null);

        publishedHistory.add(article.id);
        publishedCount++;

        console.log(`✅ Notícia enviada para #${channel.name} (${article.id}): ${details.title}`);
        await new Promise(r => setTimeout(r, 800));
    }

    if (publishedCount > 0) {
        await saveHistory();
    }

    console.log(`🏁 Verificação de pubg.com finalizada. ${publishedCount} nova(s) publicação(ões) enviada(s).\n`);
}

function startPubgWebSystem(client) {
    checkPubgWebNews(client);

    setInterval(() => {
        checkPubgWebNews(client);
    }, CHECK_INTERVAL);

    console.log('⏰ PUBG Web System com Layout Espaçado & Clean ativo e verificando a cada 30 minutos.');
}

module.exports = {
    startPubgWebSystem,
    checkPubgWebNews
};
