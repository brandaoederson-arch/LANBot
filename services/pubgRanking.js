const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const ids = require('../config/ids.json');
const clanConfig = require('../config/pubgClan.json');
const { sendLog } = require('./logger');
const { fetchJson } = require('./http');
const { updatePubgRoles } = require('./pubgRoleManager');
const { generateClanAiAnalysis } = require('./pubgAiAnalyst');

const SNAPSHOT_FILE = path.join(__dirname, '../data/pubgHistorySnapshots.json');
const LAST_RANKING_FILE = path.join(__dirname, '../data/pubgLastRanking.json');
const RANKING_MESSAGE_FILE = path.join(__dirname, '../data/pubgRankingMessage.json');

const PUBG_API_BASE = 'https://api.pubg.report/v1';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

let isUpdating = false;

function loadSnapshot() {
    try {
        if (!fs.existsSync(SNAPSHOT_FILE)) {
            return {};
        }
        const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        console.log('⚠ Erro ao carregar histórico de ranking.');
        return {};
    }
}

function saveSnapshot(rankedPlayers) {
    try {
        const snapshot = {};
        for (const player of rankedPlayers) {
            snapshot[player.name] = {
                rank: player.rank,
                idc: player.idc,
                kills: player.kills,
                damageDealt: player.damageDealt,
                wins: player.wins,
                top10Rate: player.top10Rate,
                kd: player.kd
            };
        }

        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 4));
        console.log('💾 Histórico de snapshot do ranking salvo com sucesso.');
    } catch (error) {
        console.log('⚠ Erro ao salvar histórico de ranking.');
    }
}

function formatNumber(val) {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Number(val).toLocaleString('pt-BR');
}

async function getAccountIdsBatch(names) {
    const map = {};
    for (const name of names) {
        try {
            const url = `${PUBG_API_BASE}/players?filter[playerNames]=${encodeURIComponent(name)}`;
            const res = await fetchJson(url, { timeout: 8000, retries: 2, headers: { 'User-Agent': 'Mozilla/5.0' } });

            if (res?.data && res.data.length > 0) {
                const found = res.data.find(p => p.attributes?.name?.toLowerCase() === name.toLowerCase()) || res.data[0];
                if (found) {
                    map[found.attributes.name] = found.id;
                }
            }
            await new Promise(r => setTimeout(r, 200));
        } catch (e) {
            console.log(`⚠ Erro ao buscar ID do jogador ${name}:`, e.message);
        }
    }
    return map;
}

async function getCurrentSeasonId() {
    try {
        const res = await fetchJson(`${PUBG_API_BASE}/seasons`, { timeout: 8000, retries: 2, headers: { 'User-Agent': 'Mozilla/5.0' } });

        if (res?.data && res.data.length > 0) {
            const current = res.data.find(s => s.attributes?.isCurrentSeason);
            if (current) return current.id;
            return res.data[res.data.length - 1].id;
        }
    } catch (e) {
        console.log('⚠ Erro ao buscar temporada atual do PUBG, usando fallback:', e.message);
    }
    return 'division.bro.official.pc-2018-30';
}

async function getSeasonStats(accountId, seasonId) {
    const url = `${PUBG_API_BASE}/players/${accountId}/seasons/${seasonId}`;
    const res = await fetchJson(url, { timeout: 8000, retries: 2, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return res?.data?.attributes?.gameModeStats || {};
}

function aggregateAllGameModes(statsObj) {
    if (!statsObj) return null;

    const total = {
        roundsPlayed: 0,
        wins: 0,
        top10s: 0,
        kills: 0,
        assists: 0,
        dbnos: 0,
        damageDealt: 0,
        headshotKills: 0,
        longestKill: 0,
        timeSurvived: 0,
        revives: 0,
        losses: 0
    };

    let hasData = false;

    for (const [modeName, modeData] of Object.entries(statsObj)) {
        if (!modeData || !modeData.roundsPlayed || modeData.roundsPlayed === 0) continue;

        hasData = true;

        total.roundsPlayed += modeData.roundsPlayed || 0;
        total.wins += modeData.wins || 0;
        total.top10s += modeData.top10s || 0;
        total.kills += modeData.kills || 0;
        total.assists += modeData.assists || 0;
        total.dbnos += modeData.dbnos || 0;
        total.damageDealt += modeData.damageDealt || 0;
        total.headshotKills += modeData.headshotKills || 0;
        total.revives += modeData.revives || 0;
        total.losses += modeData.losses || 0;

        if ((modeData.longestKill || 0) > total.longestKill) {
            total.longestKill = modeData.longestKill;
        }

        total.timeSurvived += modeData.timeSurvived || 0;
    }

    return hasData ? total : null;
}

function calculatePlayerMetrics(stats) {
    const rounds = stats.roundsPlayed || 0;
    if (rounds === 0) return null;

    const kills = stats.kills || 0;
    const losses = stats.losses || (rounds - (stats.wins || 0));
     = losses > 0 ? Number((kills / losses).toFixed(2)) : kills;

    const avgDamage = Math.round((stats.damageDealt || 0) / rounds);
    const winRate = Number((((stats.wins || 0) / rounds) * 100).toFixed(1));
    const top10Rate = Number((((stats.top10s || 0) / rounds) * 100).toFixed(1));
    const headshotRate = kills > 0 ? Number((((stats.headshotKills || 0) / kills) * 100).toFixed(1)) : 0;
    const assistsPerMatch = Number((((stats.assists || 0) / rounds)).toFixed(2));
    const revivesPerMatch = Number((((stats.revives || 0) / rounds)).toFixed(2));

    return {
        roundsPlayed: rounds,
        wins: stats.wins || 0,
        top10s: stats.top10s || 0,
        kills,
        assists: stats.assists || 0,
        dbnos: stats.dbnos || 0,
        damageDealt: Math.round(stats.damageDealt || 0),
        avgDamage,
        headshotKills: stats.headshotKills || 0,
        longestKill: Math.round(stats.longestKill || 0),
        timeSurvived: Math.round(stats.timeSurvived || 0),
        revives: stats.revives || 0,
        kd,
        winRate,
        top10Rate,
        headshotRate,
        assistsPerMatch,
        revivesPerMatch
    };
}

function calculateIDC(players, previousSnapshot = {}) {
    if (!players || players.length === 0) return [];

    const minMatches = 5;
    const filtered = players.filter(p => p.roundsPlayed >= minMatches);
    const pool = filtered.length > 0 ? filtered : players;

    const max = {
        avgDamage: Math.max(...pool.map(p => p.avgDamage), 1),
        kd: Math.max(...pool.map(p => p.kd), 0.1),
        winRate: Math.max(...pool.map(p => p.winRate), 1),
        top10Rate: Math.map(p => p.top10Rate).length ? Math.max(...pool.map(p => p.top10Rate), 1) : 1,
        assistsPerMatch: Math.max(...pool.map(p => p.assistsPerMatch), 0.1),
        revivesPerMatch: Math.max(...pool.map(p => p.revivesPerMatch), 0.1)
    };

    const WEIGHTS = {
        avgDamage: 0.30,
        kd: 0.25,
        winRate: 0.15,
        top10Rate: 0.10,
        assistsPerMatch: 0.08,
        revivesPerMatch: 0.07,
        consistency: 0.05
    };

    const scored = pool.map(player => {
        const prev = previousSnapshot[player.name];
        let consistency = 50;

        if (prev) {
            const damageDiff = player.avgDamage - (prev.avgDamage || player.avgDamage);
            const kdDiff = player.kd - (prev.kd || player.kd);

            if (damageDiff >= 0 && kdDiff >= 0) consistency = 90;
            else if (damageDiff >= 0 || kdDiff >= 0) consistency = 70;
            else consistency = 35;
        }

        const normalized = {
            avgDamage: Math.min(player.avgDamage / max.avgDamage, 1),
            kd: Math.min(player.kd / max.kd, 1),
            winRate: Math.min(player.winRate / max.winRate, 1),
            top10Rate: Math.min(player.top10Rate / max.top10Rate, 1),
            assistsPerMatch: Math.min(player.assistsPerMatch / max.assistsPerMatch, 1),
            revivesPerMatch: Math.min(player.revivesPerMatch / max.revivesPerMatch, 1)
        };

        const score =
            normalized.avgDamage * WEIGHTS.avgDamage +
            normalized.kd * WEIGHTS.kd +
            normalized.winRate * WEIGHTS.winRate +
            normalized.top10Rate * WEIGHTS.top10Rate +
            normalized.assistsPerMatch * WEIGHTS.assistsPerMatch +
            normalized.revivesPerMatch * WEIGHTS.revivesPerMatch +
            (consistency / 100) * WEIGHTS.consistency;

        return {
            ...player,
            consistency,
            idc: Math.round(score * 1000)
        };
    }).sort((a, b) => b.idc - a.idc);

    return scored.map((player, index) => ({
        ...player,
        rank: index + 1
    }));
}

function attachSubRankings(rankedPlayers) {
    const miraRanking = [...rankedPlayers].sort((a, b) => b.headshotRate - a.headshotRate);
    const sobrevivenciaRanking = [...rankedPlayers].sort((a, b) => b.winRate - a.winRate);

    return rankedPlayers.map(player => ({
        ...player,
        miraRank: miraRanking.findIndex(p => p.name === player.name) + 1,
        sobrevivenciaRank: sobrevivenciaRanking.findIndex(p => p.name === player.name) + 1
    }));
}

function saveLastRanking(rankedPlayers, seasonId) {
    try {
        fs.writeFileSync(
            LAST_RANKING_FILE,
            JSON.stringify(
                {
                    seasonId,
                    updatedAt: new Date().toISOString(),
                    players: rankedPlayers
                },
                null,
                4
            )
        );
    } catch (error) {
        console.log('⚠ Erro ao salvar dados completos do ranking.');
    }
}

function getEvolutionLine(player, previousSnapshot) {
    const prev = previousSnapshot[player.name];

    if (!prev) {
        return '🆕 Novo';
    }

    const rankDiff = prev.rank - player.rank;
    const idcDiff = player.idc - prev.idc;
    const idcTexto = idcDiff >= 0 ? `+${idcDiff}` : `${idcDiff}`;

    if (rankDiff > 0) {
        return `⬆️ +${rankDiff} pos (${idcTexto} pts)`;
    } else if (rankDiff < 0) {
        return `⬇️ ${rankDiff} pos (${idcTexto} pts)`;
    } else {
        return `⏹ Mantida (${idcTexto} pts)`;
    }
}

function getMedalEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🎖️';
}

async function buildRankingCategoryEmbed(client, rankedPlayers, seasonId, previousSnapshot, category) {
    const isGeral = category === 'geral';

    const title = isGeral
        ? '🏆 RANKING OFICIAL DO CLÃ • IDC (100% TPP & FPP FULL)'
        : `🏆 RANKING DO CLÃ • MODO ${category.toUpperCase()}`;

    const description = isGeral
        ? `Temporada Atual: \`${seasonId}\`\nCalculado agregando 100% das estatísticas oficiais (TPP + FPP, Solo, Duo, Squad).`
        : `Temporada Atual: \`${seasonId}\`\nRanking exclusivo para partidas no modo ${category.toUpperCase()}.`;

    const embed = new EmbedBuilder()
        .setColor(isGeral ? 0xF1C40F : 0x3498DB)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    if (!rankedPlayers || rankedPlayers.length === 0) {
        embed.addFields({ name: 'Aviso', value: 'Nenhum membro jogou partidas suficientes neste modo ainda.' });
        return embed;
    }

    const top10 = rankedPlayers.slice(0, 10);

    for (const player of top10) {
        const medal = getMedalEmoji(player.rank);
        const evo = getEvolutionLine(player, previousSnapshot);

        const fieldTitle = `${medal} #${player.rank} • ${player.name.toUpperCase()}`;
        const fieldValue =
            `🏆 **IDC:** \`${player.idc} pts\` • **Evolução:** ${evo}\n` +
            `⚔️ **K/D:** \`${player.kd}\` | 💥 **Dano Médio:** \`${player.avgDamage}\` | 📊 **Partidas:** \`${player.roundsPlayed}\`\n` +
            `🎯 **Headshot:** \`${player.headshotRate}%\` | 👑 **Vitórias:** \`${player.wins}\` (${player.winRate}%)\n` +
            `🤝 **Assist:** \`${player.assists}\` | 🩺 **Reanimações:** \`${player.revives}\``;

        embed.addFields({ name: fieldTitle, value: fieldValue });
    }

    return embed;
}

function buildHighlightsEmbed(rankedPlayers) {
    if (!rankedPlayers || rankedPlayers.length === 0) {
        return new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🌟 DESTAQUES DA TEMPORADA')
            .setDescription('Nenhum dado disponível para destaques.');
    }

    const maxDamage = [...rankedPlayers].sort((a, b) => b.avgDamage - a.avgDamage)[0];
    const maxKd = [...rankedPlayers].sort((a, b) => b.kd - a.kd)[0];
    const maxWins = [...rankedPlayers].sort((a, b) => b.wins - a.wins)[0];
    const maxHeadshot = [...rankedPlayers].sort((a, b) => b.headshotRate - a.headshotRate)[0];
    const maxRevives = [...rankedPlayers].sort((a, b) => b.revives - a.revives)[0];

    const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🌟 DESTAQUES & RECONHECIMENTO DO CLÃ')
        .setDescription('Confira os líderes em cada fundamento do combate:')
        .addFields(
            {
                name: '💥 Maior Poder de Fogo (Dano Médio)',
                value: `👑 **${maxDamage.name}** com \`${maxDamage.avgDamage}\` de dano médio por partida!`,
                inline: false
            },
            {
                name: '⚔️ Maior Letalidade (K/D Ratio)',
                value: `💀 **${maxKd.name}** lidera com K/D de \`${maxKd.kd}\`!`,
                inline: false
            },
            {
                name: '👑 Campeão de Vitórias (Top 1)',
                value: `🏆 **${maxWins.name}** acumulou \`${maxWins.wins}\` vitórias!`,
                inline: false
            },
            {
                name: '🎯 Atirador de Elite (Precisão de Headshot)',
                value: `🎯 **${maxHeadshot.name}** com \`${maxHeadshot.headshotRate}%\` dos abates por headshot!`,
                inline: false
            },
            {
                name: '🩺 Anjo do Resgate (Mais Reanimações)',
                value: `🤝 **${maxRevives.name}** salvou companheiros \`${maxRevives.revives}\` vezes!`,
                inline: false
            }
        )
        .setTimestamp();

    return embed;
}

async function buildAiAnalystEmbed(rankedPlayers) {
    const aiAnalysisText = await generateClanAiAnalysis(rankedPlayers);

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🤖 ANÁLISE TÁTICA DA INTELIGÊNCIA ARTIFICIAL')
        .setDescription(aiAnalysisText)
        .setFooter({ text: 'Sistema de Análise Técnica de Performance • Clã SO NO TCHEREREU' })
        .setTimestamp();

    return embed;
}

function buildStatsEmbed(rankedPlayers) {
    const totais = rankedPlayers.reduce((acc, player) => {
        acc.roundsPlayed += player.roundsPlayed;
        acc.kills += player.kills;
        acc.wins += player.wins;
        acc.damageDealt += player.damageDealt;
        acc.revives += player.revives;
        acc.assists += player.assists;
        acc.timeSurvived += player.timeSurvived;
        return acc;
    }, { roundsPlayed: 0, kills: 0, wins: 0, damageDealt: 0, revives: 0, assists: 0, timeSurvived: 0 });

    const horasJogadas = Math.round(totais.timeSurvived / 3600);

    const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('📊 ESTATÍSTICAS GERAIS DO CLÃ (100% TPP & FPP FULL)')
        .addFields(
            { name: '👥 Total de Membros', value: `\`${rankedPlayers.length}\``, inline: true },
            { name: '🎮 Partidas Jogadas', value: `\`${formatNumber(totais.roundsPlayed)}\``, inline: true },
            { name: '🏆 Vitórias Totais', value: `\`${formatNumber(totais.wins)}\``, inline: true },

            { name: '💀 Abates Totais', value: `\`${formatNumber(totais.kills)}\``, inline: true },
            { name: '🔥 Dano Causado', value: `\`${formatNumber(totais.damageDealt)}\``, inline: true },
            { name: '⏳ Horas em Combate', value: `\`${formatNumber(horasJogadas)} hrs\``, inline: true }
        )
        .setTimestamp();

    return embed;
}

async function runPubgRanking(client) {
    if (isUpdating) {
        console.log('⏸ Atualização do ranking já está em andamento — pedido ignorado para evitar conflito.');
        await sendLog(client, {
            type: 'warning',
            title: '⏸ Ranking PUBG: atualização ignorada',
            description: 'Já havia uma atualização em andamento. Aguarde a atual terminar antes de forçar novamente.'
        });
        return;
    }

    isUpdating = true;

    console.log('\n========================================');
    console.log('🏆 Atualizando ranking do clã no PUBG (Agregando 100% TPP & FPP Full)...');
    console.log('========================================');

    try {
        const accountIdsMap = await getAccountIdsBatch(clanConfig.members);
        const foundNames = Object.keys(accountIdsMap);

        const notFound = clanConfig.members.filter(name =>
            !foundNames.some(found => found.toLowerCase() === name.toLowerCase())
        );

        if (notFound.length > 0) {
            console.log(`⚠ Jogadores não encontrados na Steam: ${notFound.join(', ')}`);
            await sendLog(client, {
                type: 'warning',
                title: '⚠ Ranking PUBG: jogadores não encontrados',
                description: notFound.join(', ')
            });
        }

        const seasonId = await getCurrentSeasonId();
        const playersDataGeral = [];

        for (const [name, accountId] of Object.entries(accountIdsMap)) {
            try {
                console.log(`🔍 Buscando estatísticas oficiais de ${name} (100% TPP & FPP Full)...`);
                const stats = await getSeasonStats(accountId, seasonId);
                const aggregatedRaw = aggregateAllGameModes(stats);
                const metrics = aggregatedRaw ? calculatePlayerMetrics(aggregatedRaw) : null;

                if (metrics) {
                    playersDataGeral.push({ name, ...metrics });
                } else {
                    console.log(`⚠ ${name} sem partidas nesta temporada.`);
                }
            } catch (error) {
                console.log(`❌ Erro ao buscar ${name}: ${error.message}`);
            }
        }

        if (playersDataGeral.length === 0) {
            console.log('❌ Nenhum jogador com dados suficientes para gerar ranking.');
            await sendLog(client, {
                type: 'error',
                title: '🔴 Ranking PUBG: sem dados suficientes',
                description: 'Nenhum membro do clã tem partidas registradas nesta temporada.'
            });
            return;
        }

        const previousSnapshot = loadSnapshot();

        let rankedGeral = calculateIDC(playersDataGeral, previousSnapshot);
        rankedGeral = attachSubRankings(rankedGeral);

        const embedGeral = await buildRankingCategoryEmbed(client, rankedGeral, seasonId, previousSnapshot, 'geral');
        const embedDestaques = buildHighlightsEmbed(rankedGeral);
        const embedAiAnalyst = await buildAiAnalystEmbed(rankedGeral);
        const embedEstatisticas = buildStatsEmbed(rankedGeral);

        saveSnapshot(rankedGeral);
        saveLastRanking(rankedGeral, seasonId);

        const channel = await client.channels.fetch(ids.channels.rankingPubg).catch(() => null);

        if (!channel) {
            console.log('❌ Canal de ranking não encontrado.');
            return;
        }

        let messageId = null;
        if (fs.existsSync(RANKING_MESSAGE_FILE)) {
            const saved = JSON.parse(fs.readFileSync(RANKING_MESSAGE_FILE, 'utf8'));
            messageId = saved.messageId;
        }

        if (messageId) {
            const oldMessage = await channel.messages.fetch(messageId).catch(() => null);
            if (oldMessage) {
                await oldMessage.delete().catch(() => null);
            }
        }

        const allEmbeds = [embedGeral, embedDestaques, embedAiAnalyst, embedEstatisticas];
        const contentText = '💡 **Dicas da Comunidade:**\n' +
            '• Para incluir ou atualizar seus dados no ranking, use o comando `/vincular nick:<seu_nick>`!\n' +
            '• Para uma avaliação dedicada do seu desempenho feita pela IA, use o comando `/analise-ia`!';

        const sentMessage = await channel.send({
            content: contentText,
            embeds: allEmbeds
        });

        fs.writeFileSync(
            RANKING_MESSAGE_FILE,
            JSON.stringify({ messageId: sentMessage.id }, null, 4)
        );

        console.log('✅ Ranking do PUBG + Análise Tática da IA publicados com sucesso!');

        await updatePubgRoles(channel.guild, rankedGeral);

        console.log('🏁 Atualização completa do ranking finalizada.\n');
    } catch (error) {
        console.log('❌ Erro geral ao atualizar ranking do PUBG.');
        console.log(error.message);

        await sendLog(client, {
            type: 'error',
            title: '🔴 Ranking PUBG: falha na atualização',
            description: error.message
        });
    } finally {
        isUpdating = false;
    }
}

function startPubgRankingScheduler(client) {
    runPubgRanking(client);

    setInterval(() => {
        runPubgRanking(client);
    }, UPDATE_INTERVAL);

    console.log('⏰ Ranking PUBG configurado para atualizar a cada 24h a partir da inicialização do bot.');
}

module.exports = {
    runPubgRanking,
    startPubgRankingScheduler
};