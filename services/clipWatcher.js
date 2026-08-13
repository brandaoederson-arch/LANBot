const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const ids = require('../config/ids.json');
const discordLinks = require('../config/pubgDiscordLinks.json');
const reportLinks = require('../config/pubgReportLinks.json');
const { sendLog } = require('./logger');
const { fetchJson } = require('./http');

const DATA_FILE = path.join(__dirname, '../data/publishedClips.json');
const CLIPS_CHANNEL_ID = ids.channels.pubgReport || '1528963592693612665'; // Canal EXCLUSIVO do PUBG.Report
const CHECK_INTERVAL_MINUTES = 30;
const CHECK_INTERVAL = CHECK_INTERVAL_MINUTES * 60 * 1000;
const MAX_CLIP_AGE_DAYS = 14; // Regra dos 14 dias (VODs da Twitch expiram em 14 dias)

const MAP_NAMES = {
    'Erangel_Main': 'Erangel',
    'Baltic_Main': 'Erangel',
    'Desert_Main': 'Miramar',
    'Savage_Main': 'Sanhok',
    'Summerland_Main': 'Karakin',
    'Chimera_Main': 'Paramo',
    'Tiger_Main': 'Taego',
    'Kiki_Main': 'Deston',
    'Neon_Main': 'Rondo',
    'DihorOtok_Main': 'Vikendi'
};

const EVENT_DESCRIPTIONS = {
    LogPlayerKill: { asKiller: 'eliminou o streamer/jogador', asVictim: 'foi eliminado por' },
    LogPlayerDeath: { asKiller: 'eliminou o streamer/jogador', asVictim: 'foi eliminado por' },
    LogTeammateKill: { asKiller: 'eliminou o companheiro (fogo amigo)', asVictim: 'foi eliminado pelo companheiro (fogo amigo)' },
    LogPlayerMadeGroggy: { asKiller: 'nocauteou o streamer/jogador', asVictim: 'foi nocauteado por' },
    LogPlayerMakeGroggy: { asKiller: 'nocauteou o streamer/jogador', asVictim: 'foi nocauteado por' },
    LogTeammateMakeGroggy: { asKiller: 'nocauteou o companheiro (fogo amigo)', asVictim: 'foi nocauteado pelo companheiro (fogo amigo)' }
};

let publishedClips = new Set();
let saveTimer = null;
let dirty = false;

async function loadPublishedClips() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            await fsp.writeFile(DATA_FILE, JSON.stringify({ clips: [] }, null, 4), 'utf8');
        }

        const raw = await fsp.readFile(DATA_FILE, 'utf8');
        const data = JSON.parse(raw);

        publishedClips = new Set(data.clips || []);
        console.log(`📂 ${publishedClips.size} clipes registrados no histórico.`);
    } catch (err) {
        console.log('⚠ Erro ao carregar publishedClips:', err.message);
        publishedClips = new Set();
    }
}

function scheduleSave() {
    dirty = true;
    if (saveTimer) clearTimeout(saveTimer);

    saveTimer = setTimeout(async () => {
        if (!dirty) return;
        try {
            await fsp.writeFile(DATA_FILE, JSON.stringify({ clips: [...publishedClips] }, null, 4), 'utf8');
            dirty = false;
        } catch (err) {
            console.log('⚠ Erro ao salvar publishedClips:', err.message);
        }
    }, 1000);
}

function formatTwitchTimestamp(timeDiff) {
    if (!timeDiff) return null;
    const parts = timeDiff.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [h, m, s] = parts;
    return `${h}h${m}m${s}s`;
}

function buildTwitchVodLink(event) {
    if (!event.VideoID) return null;
    const numericId = event.VideoID.replace(/^v/i, '');
    const timeParam = formatTwitchTimestamp(event.TimeDiff);
    return `https://www.twitch.tv/videos/${numericId}${timeParam ? `?t=${timeParam}` : ''}`;
}

function describeEvent(event, playerName) {
    const isKiller = event.Killer === playerName;
    const other = isKiller ? event.Victim : event.Killer;
    const labels = EVENT_DESCRIPTIONS[event.Event];

    if (!labels) {
        return `teve uma interação com **${other}**`;
    }

    const acao = isKiller ? labels.asKiller : labels.asVictim;
    return `${acao} **${other}**`;
}

async function buildClipMessagePayload(client, playerName, event) {
    const discordId = discordLinks[playerName];
    let avatarUrl = null;
    let user = null;

    if (discordId) {
        user = await client.users.fetch(discordId).catch(() => null);
        if (user) {
            avatarUrl = user.displayAvatarURL({ extension: 'png', forceStatic: false, size: 256 });
        }
    }

    const mention = user ? `<@${user.id}>` : `**${playerName}**`;
    const link = buildTwitchVodLink(event);
    const descricao = describeEvent(event, playerName);
    const mapName = MAP_NAMES[event.Map] || event.Map || 'PUBG';

    const embed = new EmbedBuilder()
        .setColor(0x9146FF)
        .setAuthor({
            name: `🎬 PUBG Report • ${playerName}`,
            iconURL: avatarUrl || 'https://pubg.report/favicon.ico'
        })
        .setTitle(`Corte da Partida em ${mapName}`)
        .setURL(link)
        .setDescription(`📺 ${mention} ${descricao}!\n\n🗺️ **Mapa:** ${mapName} • **Modo:** ${(event.Mode || 'squad').toUpperCase()}\n📅 **Data:** ${event.Date || '—'}\n\n🔗 [Assistir Reação na Twitch](${link})`)
        .setTimestamp(event.Date ? new Date(event.Date) : new Date());

    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
    }

    const content = `🎬 **Novo clipe do PUBG Report de ${mention}!**`;

    return { content, embed, discordId };
}

async function publishClip(client, playerName, event) {
    try {
        const channel = await client.channels.fetch(CLIPS_CHANNEL_ID).catch(() => null);

        if (!channel) {
            console.log(`❌ Canal de PUBG Report não encontrado (ID: ${CLIPS_CHANNEL_ID}).`);
            return false;
        }

        const payload = await buildClipMessagePayload(client, playerName, event);

        const sent = await channel.send({
            content: payload.content,
            embeds: [payload.embed],
            allowedMentions: { users: payload.discordId ? [payload.discordId] : [] }
        });

        await sent.react('🔥').catch(() => null);
        await sent.react('📺').catch(() => null);
        await sent.react('🍿').catch(() => null);

        console.log(`✅ Clip do PUBG.Report publicado no canal correto (#pubg-report ID ${CLIPS_CHANNEL_ID}): ${playerName}`);
        return true;
    } catch (err) {
        console.log('❌ Erro ao publicar clip:', err.message);
        await sendLog(client, {
            type: 'warning',
            title: '⚠ Falha ao publicar clip',
            description: `${playerName} — ${event.ID}\n${err.message}`
        }).catch(() => null);

        return false;
    }
}

async function updateExistingClipMessages(client) {
    try {
        const channel = await client.channels.fetch(CLIPS_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (!messages || messages.size === 0) return;

        for (const message of messages.values()) {
            if (message.author.id !== client.user.id) continue;
            if (!message.embeds || message.embeds.length === 0) continue;

            const oldEmbed = message.embeds[0];
            const title = oldEmbed.title || '';
            const authorName = oldEmbed.author?.name || '';
            
            let playerName = null;
            for (const name of Object.keys(reportLinks)) {
                if (title.includes(name) || authorName.includes(name) || message.content.includes(name)) {
                    playerName = name;
                    break;
                }
            }

            if (!playerName) continue;

            const discordId = discordLinks[playerName];
            let avatarUrl = null;

            if (discordId) {
                const user = await client.users.fetch(discordId).catch(() => null);
                if (user) {
                    avatarUrl = user.displayAvatarURL({ extension: 'png', forceStatic: false, size: 256 });
                }
            }

            const newEmbed = EmbedBuilder.from(oldEmbed)
                .setAuthor({
                    name: `🎬 PUBG Report • ${playerName}`,
                    iconURL: avatarUrl || 'https://pubg.report/favicon.ico'
                });

            if (avatarUrl) {
                newEmbed.setThumbnail(avatarUrl);
            }

            const cleanContent = message.content.split('\nhttps://www.twitch.tv')[0].trim();

            await message.edit({
                content: cleanContent,
                embeds: [newEmbed]
            }).catch(err => console.log(`⚠ Falha ao editar mensagem ${message.id}:`, err.message));

            await new Promise(r => setTimeout(r, 300));
        }

        console.log('✅ Mensagens organizadas no canal de PUBG Report!');
    } catch (err) {
        console.log('⚠ Erro ao atualizar mensagens existentes:', err.message);
    }
}

async function autoCleanExpiredClips(client) {
    try {
        const channel = await client.channels.fetch(CLIPS_CHANNEL_ID).catch(() => null);
        if (!channel) return 0;

        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        if (!messages || messages.size === 0) return 0;

        const now = Date.now();
        const maxAgeMs = MAX_CLIP_AGE_DAYS * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        for (const message of messages.values()) {
            if (message.author.id !== client.user.id) continue;

            let clipDateMs = message.createdTimestamp;

            if (message.embeds && message.embeds[0] && message.embeds[0].timestamp) {
                clipDateMs = new Date(message.embeds[0].timestamp).getTime();
            }

            const ageMs = now - clipDateMs;

            if (ageMs > maxAgeMs) {
                await message.delete().catch(() => null);
                deletedCount++;
                console.log(`🗑️ Clipe expirado deletado do #pubg-report (${Math.round(ageMs / (1000 * 60 * 60 * 24))} dias atrás).`);
                await new Promise(r => setTimeout(r, 500));
            }
        }

        if (deletedCount > 0) {
            console.log(`🧹 Faxina concluída: ${deletedCount} clipe(s) expirado(s) com mais de 14 dias removido(s) do canal #pubg-report.`);
        }

        return deletedCount;
    } catch (err) {
        console.log('⚠ Erro ao limpar clipes expirados:', err.message);
        return 0;
    }
}

async function checkClips(client) {
    console.log('\n========================================');
    console.log('🎥 Verificando clips do PUBG.Report para o canal EXCLUSIVO #pubg-report (ID 1528963592693612665)...');
    console.log('========================================');

    let totalNovosClipes = 0;
    const now = Date.now();
    const maxAgeMs = MAX_CLIP_AGE_DAYS * 24 * 60 * 60 * 1000;

    for (const [playerName, profileUrl] of Object.entries(reportLinks)) {
        try {
            const accountId = profileUrl.split('/players/')[1];
            if (!accountId) continue;

            const apiUrl = `https://api.pubg.report/v1/players/${accountId}/streams`;
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Referer': profileUrl || 'https://pubg.report/',
                'Origin': 'https://pubg.report'
            };

            let data = null;
            try {
                data = await fetchJson(apiUrl, { timeout: 10000, retries: 2, headers });
            } catch (err) {
                console.log(`❌ [PUBG.Report API Error] ${playerName} (${apiUrl}):`, err.message);
            }

            if (!data) continue;

            const events = [];
            for (const matchEvents of Object.values(data)) {
                if (Array.isArray(matchEvents)) {
                    events.push(...matchEvents);
                }
            }

            // Filtra clipes válidos nos últimos 14 dias
            const relevantes = events.filter(e => {
                if (!e.VideoID) return false;
                if (e.Killer !== playerName && e.Victim !== playerName) return false;

                if (e.Date) {
                    const eventDate = new Date(e.Date).getTime();
                    if (!isNaN(eventDate) && (now - eventDate > maxAgeMs)) {
                        return false;
                    }
                }
                return true;
            });

            if (!relevantes.length) continue;

            for (const event of relevantes) {
                const guid = `${playerName}::${event.ID}`;

                if (publishedClips.has(guid)) continue;

                const ok = await publishClip(client, playerName, event);
                if (ok) {
                    publishedClips.add(guid);
                    scheduleSave();
                    totalNovosClipes++;
                }

                await new Promise(r => setTimeout(r, 300));
            }
        } catch (err) {
            console.log(`❌ Erro ao processar ${playerName}:`, err.message);
        }
    }

    await updateExistingClipMessages(client);
    await autoCleanExpiredClips(client);

    console.log(`🏁 Verificação do PUBG.Report finalizada. Total de novos clipes publicados: ${totalNovosClipes}\n`);
    return totalNovosClipes;
}

function startClipWatcher(client) {
    loadPublishedClips()
        .then(() => {
            checkClips(client).catch(err => console.log('⚠ Erro checkClips inicial:', err.message));

            setInterval(() => {
                checkClips(client).catch(err => console.log('⚠ Erro checkClips agendado:', err.message));
            }, CHECK_INTERVAL);
        })
        .catch(err => {
            console.log('⚠ Erro ao iniciar ClipWatcher:', err.message);
        });
}

module.exports = { startClipWatcher, checkClips, updateExistingClipMessages, autoCleanExpiredClips };