const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const ids = require('../config/ids.json');
const { sendLog } = require('./logger');
const { fetchJson } = require('./http');

const DATA_FILE = path.join(__dirname, '../data/publishedDeals.json');
const ERRORS_DIR = path.join(__dirname, '../data/epic_errors');
const PROMOTIONS_CHANNEL_ID = ids.channels.promocoes;
const FREE_GAMES_CHANNEL_ID = ids.channels.jogosGratis;
const CHECK_INTERVAL = 60 * 60 * 1000; // 1h

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Endpoints
const STEAM_SPECIALS_URL = 'https://store.steampowered.com/api/featuredcategories/?cc=br&l=portuguese';
const EPIC_FREE_GAMES_URL = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=pt-BR&country=BR&allowCountries=BR';
const EPIC_SALES_URLS = [
    'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=pt-BR&country=BR&allowCountries=BR',
    'https://store-site-backend-static.ak.epicgames.com/catalog/api/search?category=Games&sortBy=discountPrice&sortDir=DESC&count=40&locale=pt-BR&country=BR'
];

const NUUVEM_BASE = 'https://www.nuuvem.com';
const NUUVEM_OFERTAS_URL = 'https://www.nuuvem.com/br-pt/promo/ofertas-nuuvem/sort/date/sort-mode/desc';

const DEAL_REACTIONS = ['🔥', '🎮', '🙌'];
const FREE_REACTIONS = ['🆓', '🎉', '🙌'];

// In-memory sets
let publishedSets = {
    steam: new Set(),
    epic: new Set(),
    epicStore: new Set(),
    nuuvem: new Set()
};

// Last check status
let lastSteamCheck = { time: null, ok: true, error: null };
let lastEpicCheck = { time: null, ok: true, error: null };
let lastEpicSalesCheck = { time: null, ok: true, error: null };
let lastNuuvemCheck = { time: null, ok: true, error: null };

let saveTimer = null;
let dirty = false;

async function ensureErrorsDir() {
    try {
        if (!fs.existsSync(ERRORS_DIR)) {
            await fsp.mkdir(ERRORS_DIR, { recursive: true });
        }
    } catch (err) {
        console.log('⚠ Falha ao criar data/epic_errors:', err.message);
    }
}

async function loadPublishedDeals() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            await fsp.writeFile(DATA_FILE, JSON.stringify({ steam: [], epic: [], epicStore: [], nuuvem: [] }, null, 4), 'utf8');
        }

        const raw = await fsp.readFile(DATA_FILE, 'utf8');
        const data = JSON.parse(raw);

        publishedSets = {
            steam: new Set(data.steam || []),
            epic: new Set(data.epic || []),
            epicStore: new Set(data.epicStore || []),
            nuuvem: new Set(data.nuuvem || [])
        };

        console.log(`📂 ${publishedSets.steam.size} Steam / ${publishedSets.epic.size} Epic (free) / ${publishedSets.epicStore.size} Epic (store) / ${publishedSets.nuuvem.size} Nuuvem carregados.`);
    } catch (error) {
        console.log('⚠ Erro ao carregar histórico de promoções:', error.message);
        publishedSets = { steam: new Set(), epic: new Set(), epicStore: new Set(), nuuvem: new Set() };
    }
}

async function flushSave() {
    if (!dirty) return;

    const obj = {
        steam: [...publishedSets.steam],
        epic: [...publishedSets.epic],
        epicStore: [...publishedSets.epicStore],
        nuuvem: [...publishedSets.nuuvem]
    };

    try {
        await fsp.writeFile(DATA_FILE, JSON.stringify(obj, null, 4), 'utf8');
        dirty = false;
    } catch (err) {
        console.log('⚠ Erro ao salvar histórico:', err.message);
    }
}

function scheduleSave() {
    dirty = true;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        flushSave().catch(err => console.log('⚠ Erro no flushSave:', err.message));
    }, 1000);
}

async function addReactions(sentMessage, emojis) {
    for (const emoji of emojis) {
        try {
            await sentMessage.react(emoji);
            await new Promise(res => setTimeout(res, 220));
        } catch (error) {
            console.log(`⚠ Não foi possível reagir com ${emoji}:`, error.message);
        }
    }
}

function formatCurrency(val) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
        const valueInReais = val > 1000 ? val / 100 : val;
        return `R$ ${valueInReais.toFixed(2).replace('.', ',')}`;
    }
    return String(val);
}

function getEpicProductUrl(item) {
    const slug = item.productSlug || item.urlSlug || item.offerMappings?.[0]?.pageSlug;
    if (slug) {
        return `https://store.epicgames.com/pt-BR/p/${slug}`;
    }
    return 'https://store.epicgames.com/pt-BR/free-games';
}

function buildEpicSaleEmbedFromScrape({ title, image, url, originalPrice, discountedPrice, discountPercent, expiryDate }) {
    const embed = new EmbedBuilder()
        .setColor(0x0078F2)
        .setAuthor({ name: '🛒 Epic Games Store' })
        .setTitle(title)
        .setURL(url)
        .setDescription(`🔥 **-${discountPercent}%** de desconto na Epic Games Store`)
        .setTimestamp();

    if (image) embed.setImage(image);

    if (originalPrice || discountedPrice) {
        embed.addFields(
            { name: 'De', value: `~~${formatCurrency(originalPrice)}~~`, inline: true },
            { name: 'Por', value: `${formatCurrency(discountedPrice)}`, inline: true }
        );
    }

    if (expiryDate) {
        embed.addFields({ name: '⏳ Oferta Válida Até', value: `\`${expiryDate}\``, inline: false });
    }

    return embed;
}

/* ---------- STEAM (Promoções e Jogos Grátis) ---------- */

async function checkSteamDeals(client) {
    console.log('\n========================================');
    console.log('🎮 Verificando ofertas da Steam (Promoções e Grátis)...');
    console.log('========================================');

    let items = [];

    try {
        const data = await fetchJson(STEAM_SPECIALS_URL, { timeout: 8000, retries: 2, headers: { 'Accept': 'application/json' } });
        items = data.specials?.items || [];

        console.log(`📄 ${items.length} itens encontrados na Steam.`);
        lastSteamCheck = { time: new Date(), ok: true, error: null };
    } catch (err) {
        console.log('❌ Erro ao buscar ofertas da Steam.', err.message);
        lastSteamCheck = { time: new Date(), ok: false, error: err.message };
        await sendLog(client, { type: 'error', title: '🔴 Game Deals Watcher: falha ao consultar a Steam', description: err.message });
        return;
    }

    for (const item of items) {
        const guid = `steam-${item.id}-${item.discount_percent}-${item.final_price}`;

        if (publishedSets.steam.has(guid)) continue;

        const isFree = item.final_price === 0 || item.discount_percent === 100;
        const targetChannelId = isFree ? FREE_GAMES_CHANNEL_ID : PROMOTIONS_CHANNEL_ID;
        const channel = await client.channels.fetch(targetChannelId).catch(() => null);

        if (!channel) {
            console.log(`❌ Canal ${targetChannelId} não encontrado.`);
            continue;
        }

        const embed = new EmbedBuilder()
            .setColor(isFree ? 0x2ECC71 : 0x1B2838)
            .setAuthor({ name: '🎮 Steam' })
            .setTitle(item.name)
            .setURL(`https://store.steampowered.com/app/${item.id}`)
            .setTimestamp();

        if (item.header_image) embed.setImage(item.header_image);

        if (!isFree) {
            embed.setDescription(`🔥 **-${item.discount_percent}%** de desconto`);
            embed.addFields(
                { name: 'De', value: `~~${formatCurrency(item.original_price)}~~`, inline: true },
                { name: 'Por', value: `${formatCurrency(item.final_price)}`, inline: true }
            );
        } else {
            embed.setDescription('🆓 **Jogo 100% Grátis por tempo limitado!**');
        }

        if (item.discount_expiration) {
            const expDate = new Date(item.discount_expiration * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            embed.addFields({ name: '⏳ Oferta Válida Até', value: `\`Até ${expDate}\``, inline: false });
        }

        try {
            const sentMessage = await channel.send({ content: '@everyone', embeds: [embed], allowedMentions: { parse: ['everyone'] } });
            await addReactions(sentMessage, isFree ? FREE_REACTIONS : DEAL_REACTIONS);

            publishedSets.steam.add(guid);
            scheduleSave();

            console.log(`✅ Publicado (Steam - ${isFree ? 'Grátis' : 'Promoção'}): ${item.name}`);
        } catch (err) {
            console.log(`❌ Erro ao publicar ${item.name}`, err.message);
            await sendLog(client, { type: 'warning', title: `⚠ Falha ao publicar da Steam: ${item.name}`, description: err.message });
        }
    }

    console.log('🏁 Verificação da Steam finalizada.\n');
}

/* ---------- EPIC (Jogos 100% Grátis) ---------- */

async function checkEpicFreeGames(client) {
    console.log('\n========================================');
    console.log('🛒 Verificando jogos grátis da Epic Games...');
    console.log('========================================');

    let elements = [];

    try {
        const data = await fetchJson(EPIC_FREE_GAMES_URL, { timeout: 8000, retries: 2, headers: { 'Accept': 'application/json' } });
        elements = data.data?.Catalog?.searchStore?.elements || [];

        console.log(`📄 ${elements.length} itens retornados pela Epic.`);
        lastEpicCheck = { time: new Date(), ok: true, error: null };
    } catch (err) {
        console.log('❌ Erro ao buscar jogos grátis da Epic.', err.message);
        lastEpicCheck = { time: new Date(), ok: false, error: err.message };
        await sendLog(client, { type: 'error', title: '🔴 Game Deals Watcher: falha ao consultar a Epic (Free)', description: err.message });
        return;
    }

    const freeNow = elements.filter(item => {
        const offers = item.promotions?.promotionalOffers || [];
        return offers.some(group => group.promotionalOffers?.some(offer => offer.discountSetting?.discountPercentage === 0));
    });

    console.log(`🆓 ${freeNow.length} jogo(s) grátis ativos agora na Epic.`);

    for (const item of freeNow) {
        const guid = `epic-${item.id}`;

        if (publishedSets.epic.has(guid)) continue;

        const channel = await client.channels.fetch(FREE_GAMES_CHANNEL_ID).catch(() => null);

        if (!channel) {
            console.log(`❌ Canal de jogos grátis (${FREE_GAMES_CHANNEL_ID}) não encontrado.`);
            continue;
        }

        const offerGroup = item.promotions?.promotionalOffers?.[0];
        const offer = offerGroup?.promotionalOffers?.[0];
        let validUntilStr = '';

        if (offer?.endDate) {
            const endDate = new Date(offer.endDate);
            validUntilStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setAuthor({ name: '🛒 Epic Games Store' })
            .setTitle(item.title)
            .setURL(getEpicProductUrl(item))
            .setDescription('🆓 **Grátis nesta semana! Resgate na sua conta!**')
            .setTimestamp();

        if (validUntilStr) {
            embed.addFields({ name: '⏳ Prazo para Resgatar Grátis', value: `\`Disponível até ${validUntilStr}\``, inline: false });
        }

        if (item.keyImages?.[0]?.url) embed.setImage(item.keyImages[0].url);

        try {
            const sentMessage = await channel.send({ content: '@everyone', embeds: [embed], allowedMentions: { parse: ['everyone'] } });
            await addReactions(sentMessage, FREE_REACTIONS);

            publishedSets.epic.add(guid);
            scheduleSave();

            console.log(`✅ Publicado (Epic - Grátis): ${item.title}`);
        } catch (err) {
            console.log(`❌ Erro ao publicar ${item.title}`, err.message);
            await sendLog(client, { type: 'warning', title: `⚠ Falha ao publicar jogo grátis da Epic: ${item.title}`, description: err.message });
        }
    }

    console.log('🏁 Verificação de jogos grátis da Epic finalizada.\n');
}

/* ---------- EPIC (Promoções com Desconto) ---------- */

async function checkEpicSales(client) {
    console.log('\n========================================');
    console.log('🛒 Verificando promoções (descontos) da Epic Store...');
    console.log('========================================');

    await ensureErrorsDir();

    try {
        const { url, data } = await tryEndpoints(EPIC_SALES_URLS, { timeout: 9000, retries: 2 });
        console.log(`ℹ️ Epic sales: endpoint utilizado: ${url}`);

        const elements = data.elements || data.data?.Catalog?.searchStore?.elements || data.Catalog?.searchStore?.elements || [];

        if (elements && elements.length > 0) {
            console.log(`📄 ${elements.length} itens analisados na Epic Sales API.`);
            lastEpicSalesCheck = { time: new Date(), ok: true, error: null };

            for (const item of elements) {
                const priceInfo = item.price?.totalPrice || item.price || {};
                const originalPrice = priceInfo.originalPrice || priceInfo.fmtPrice?.originalPrice;
                const discountPrice = priceInfo.discountPrice ?? priceInfo.finalPrice ?? priceInfo.fmtPrice?.discountPrice;
                const discountPercent = priceInfo.discountPercentage || (originalPrice && discountPrice && originalPrice > discountPrice ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100) : 0);

                if (!discountPercent || discountPercent <= 0 || discountPrice === 0) continue;

                const guid = `epicStore-${item.id}-${discountPercent}-${discountPrice}`;

                if (publishedSets.epicStore.has(guid)) continue;

                const channel = await client.channels.fetch(PROMOTIONS_CHANNEL_ID).catch(() => null);

                if (!channel) {
                    console.log(`❌ Canal de promoções (${PROMOTIONS_CHANNEL_ID}) não encontrado.`);
                    continue;
                }

                const offerGroup = item.promotions?.promotionalOffers?.[0];
                const offer = offerGroup?.promotionalOffers?.[0];
                let expiryStr = '';

                if (offer?.endDate) {
                    const endDate = new Date(offer.endDate);
                    expiryStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                }

                const embed = buildEpicSaleEmbedFromScrape({
                    title: item.title || item.productName,
                    image: item.keyImages?.[0]?.url,
                    url: getEpicProductUrl(item),
                    originalPrice: originalPrice,
                    discountedPrice: discountPrice,
                    discountPercent: discountPercent,
                    expiryDate: expiryStr ? `Até ${expiryStr}` : null
                });

                try {
                    const sentMessage = await channel.send({ content: '@everyone', embeds: [embed], allowedMentions: { parse: ['everyone'] } });
                    await addReactions(sentMessage, DEAL_REACTIONS);

                    publishedSets.epicStore.add(guid);
                    scheduleSave();

                    console.log(`✅ Publicado (Epic - Promoção): ${item.title || item.productName} (-${discountPercent}%)`);
                } catch (err) {
                    console.log(`❌ Erro ao publicar ${item.title || item.productName}`, err.message);
                    await sendLog(client, { type: 'warning', title: `⚠ Falha ao publicar promoção da Epic: ${item.title || item.productName}`, description: err.message });
                }
            }

            console.log('🏁 Verificação de promoções da Epic Store finalizada (API).\n');
            return;
        }
    } catch (err) {
        console.log('⚠ Epic sales API falhou ou não retornou promoções diretas:', err.message);
    }
}

/* ---------- NUUVEM (Promoções e Jogos Grátis) ---------- */

async function fetchHtml(url) {
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' }
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return response.text();
}

function parseNuuvemDeals(html) {
    const deals = [];
    const itemLinkRegex = /href="(\/br-pt\/item\/([a-z0-9\-]+))"[^>]*title="([^"]+)"/gi;
    let match;

    while ((match = itemLinkRegex.exec(html)) !== null) {
        const [, relativeUrl, slug, title] = match;
        const startIndex = Math.max(0, match.index - 400);
        const endIndex = Math.min(html.length, match.index + 400);
        const contexto = html.slice(startIndex, endIndex);
        const discountMatch = contexto.match(/-(\d{1,3})%/);
        const priceMatches = contexto.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g) || [];

        const isFree = contexto.includes('Gratuito') || contexto.includes('Grátis') || priceMatches[0] === 'R$ 0,00' || priceMatches[1] === 'R$ 0,00';

        deals.push({
            slug,
            title,
            url: `${NUUVEM_BASE}${relativeUrl}`,
            discount: discountMatch ? Number(discountMatch[1]) : null,
            originalPrice: priceMatches[0] || null,
            finalPrice: priceMatches[1] || priceMatches[0] || null,
            isFree: isFree
        });
    }

    const seen = new Set();
    return deals.filter(deal => {
        if (seen.has(deal.slug)) return false;
        seen.add(deal.slug);
        return true;
    });
}

function buildNuuvemEmbed(deal) {
    const embed = new EmbedBuilder()
        .setColor(deal.isFree ? 0x2ECC71 : 0x0099CC)
        .setAuthor({ name: '🛒 Nuuvem' })
        .setTitle(deal.title)
        .setURL(deal.url)
        .setTimestamp();

    if (deal.isFree) {
        embed.setDescription('🆓 **Jogo Grátis na Nuuvem! Resgate na sua conta!**');
    } else if (deal.discount) {
        embed.setDescription(`🔥 **-${deal.discount}%** de desconto na Nuuvem`);
        if (deal.originalPrice && deal.finalPrice && deal.originalPrice !== deal.finalPrice) {
            embed.addFields(
                { name: 'De', value: `~~${deal.originalPrice}~~`, inline: true },
                { name: 'Por', value: `${deal.finalPrice}`, inline: true }
            );
        }
    }

    return embed;
}

async function checkNuuvemDeals(client) {
    console.log('\n========================================');
    console.log('🛒 Verificando ofertas da Nuuvem...');
    console.log('========================================');

    try {
        const html = await fetchHtml(NUUVEM_OFERTAS_URL);
        const deals = parseNuuvemDeals(html);
        console.log(`📄 ${deals.length} itens encontrados na Nuuvem.`);
        lastNuuvemCheck = { time: new Date(), ok: true, error: null };

        for (const deal of deals) {
            const guid = `nuuvem-${deal.slug}-${deal.discount || 0}`;

            if (publishedSets.nuuvem.has(guid)) continue;

            const targetChannelId = deal.isFree ? FREE_GAMES_CHANNEL_ID : PROMOTIONS_CHANNEL_ID;
            const channel = await client.channels.fetch(targetChannelId).catch(() => null);

            if (!channel) continue;

            const embed = buildNuuvemEmbed(deal);

            try {
                const sentMessage = await channel.send({ content: '@everyone', embeds: [embed], allowedMentions: { parse: ['everyone'] } });
                await addReactions(sentMessage, deal.isFree ? FREE_REACTIONS : DEAL_REACTIONS);

                publishedSets.nuuvem.add(guid);
                scheduleSave();

                console.log(`✅ Publicado (Nuuvem - ${deal.isFree ? 'Grátis' : 'Promoção'}): ${deal.title}`);
            } catch (err) {
                console.log(`❌ Erro ao publicar da Nuuvem (${deal.title}):`, err.message);
            }
        }
    } catch (err) {
        console.log('❌ Erro ao buscar ofertas da Nuuvem:', err.message);
        lastNuuvemCheck = { time: new Date(), ok: false, error: err.message };
    }

    console.log('🏁 Verificação de ofertas da Nuuvem finalizada.\n');
}

/* ---------- SCHEDULER & STATUS ---------- */

async function startGameDealsWatcher(client) {
    await ensureErrorsDir();
    await loadPublishedDeals();

    console.log('🎮 Iniciando Game Deals Watcher...');

    await checkSteamDeals(client);
    await checkEpicFreeGames(client);
    await checkEpicSales(client);
    await checkNuuvemDeals(client);

    setInterval(async () => {
        await checkSteamDeals(client);
        await checkEpicFreeGames(client);
        await checkEpicSales(client);
        await checkNuuvemDeals(client);
    }, CHECK_INTERVAL);
}

function getDealsStatus() {
    return {
        steam: lastSteamCheck,
        epicFree: lastEpicCheck,
        epicSales: lastEpicSalesCheck,
        nuuvem: lastNuuvemCheck,
        publishedCounts: {
            steam: publishedSets.steam.size,
            epicFree: publishedSets.epic.size,
            epicSales: publishedSets.epicStore.size,
            nuuvem: publishedSets.nuuvem.size
        }
    };
}

module.exports = {
    startGameDealsWatcher,
    checkSteamDeals,
    checkEpicFreeGames,
    checkEpicSales,
    checkNuuvemDeals,
    getDealsStatus
};