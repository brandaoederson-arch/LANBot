const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const ids = require('../config/ids.json');
const clanConfig = require('../config/pubgClan.json');
const { sendLog } = require('./logger');
const { fetchJson } = require('./http');
const { updatePubgRoles } = require('./pubgRoles');
const { generateClanAiAnalysis } = require('./pubgAiAnalyst');

const SNAPSHOT_FILE = path.join(__dirname, '../data/pubgHistorySnapshots.json');
const LAST_RANKING_FILE = path.join(__dirname, '../data/pubgLastRanking.json');
const RANKING_MESSAGE_FILE = path.join(__dirname, '../data/pubgRankingMessage.json');

const PUBG_API_BASE = 'https://api.pubg.com/shards/steam';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

let isUpdating = false;

function getHeaders() {
    return {
        'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
        'Accept': 'application/vnd.api+json'
    };
}

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

// Busca os Account IDs oficiais na Krafton em lotes
async function getAccountIdsBatch(names) {
    const map = {};
    if (!names || names.length === 0) return map;

    // Divide em lotes de 5 para garantir aceitação total da API da Krafton
    const chunkSize = 5;
    for (let i = 0; i < names.length; i += chunkSize) {
        const chunk = names.slice(i, i + chunkSize);
        const namesParam = chunk.map(n => encodeURIComponent(n)).join(',');

        try {
            const url = `${PUBG_API_BASE}/players?filter[playerNames]=${namesParam}`;
            const res = await fetchJson(url, { timeout: 10000, retries: 2, headers: getHeaders() });

            if (res?.data && res.data.length > 0) {
                for (const p of res.data) {
                    if (p.attributes?.name && p.id) {
                        map[p.attributes.name.toLowerCase()] = {
                            id: p.id,
                            officialName: p.attributes.name
                        };
                    }
                }
            }
            await new Promise(r => setTimeout(r, 1200));
        } catch (e) {
            console.log(`⚠ Erro ao buscar IDs do lote de jogadores:`, e.message);
        }
    }
    return map;
}

// Busca a Temporada Atual ativa no PUBG (ex: division.bro.official.pc-2018-42)
async function getCurrentSeasonId() {
    try {
        const res = await fetchJson(`${PUBG_API_BASE}/seasons`, { timeout: 10000, retries: 2, headers: getHeaders() });

        if (res?.data && res.data.length > 0) {
            const current = res.data.find(s => s.attributes?.isCurrentSeason);
            if (current) return current.id;
            return res.data[res.data.length - 1].id;
        }
    } catch (e) {
        console.log('⚠ Erro ao buscar temporada atual do PUBG na Krafton:', e.message);
    }
    return 'division.bro.official.pc-2018-42';
}

// Busca as estatísticas da temporada para um jogador específico
async function getSeasonStats(accountId, seasonId) {
    try {
        const url = `${PUBG_API_BASE}/players/${accountId}/seasons/${seasonId}`;
        const res = await fetchJson(url, { timeout: 10000, retries: 2, headers: getHeaders() });
        return res?.data?.attributes?.gameModeStats || {};
    } catch (e) {
        console.log(`⚠ Erro ao buscar estatísticas da temporada (${accountId}):`, e.message);
        return {};
    }
}

function aggregateStatsForMode(gameModeStats, modeFilter) {
    let aggregated = {
        roundsPlayed: 0,
        wins: 0,
        kills: 0,
        damageDealt: 0,
        top10s: 0,
        headshotKills: 0,
        assists: 0,
        revives: 0,
        losses: 0
    };

    let hasData = false;

    for (const [mode, stats] of Object.entries(gameModeStats)) {
        let match = false;
        if (modeFilter === 'squad') {
            match = mode.includes('squad');
        } else if (modeFilter === 'duo') {
            match = mode.includes('duo');
        } else if (modeFilter === 'solo') {
            match = mode.includes('solo') && !mode.includes('squad') && !mode.includes('duo');
        } else {
            match = true; // Todos os modos combinados se não especificado
        }

        if (match && stats && stats.roundsPlayed > 0) {
            hasData = true;
            aggregated.roundsPlayed += stats.roundsPlayed || 0;
            aggregated.wins += stats.wins || 0;
            aggregated.kills += stats.kills || 0;
            aggregated.damageDealt += stats.damageDealt || 0;
            aggregated.top10s += stats.top10s || 0;
            aggregated.headshotKills += stats.headshotKills || 0;
            aggregated.assists += stats.assists || 0;
            aggregated.revives += stats.revives || 0;
            aggregated.losses += stats.losses || (stats.roundsPlayed - (stats.wins || 0));
        }
    }

    return hasData ? aggregated : null;
}

function calculatePlayerMetrics(stats) {
    const rounds = stats.roundsPlayed || 0;
    if (rounds === 0) return null;

    const kills = stats.kills || 0;
    const losses = stats.losses || (rounds - (stats.wins || 0));
    const kdRatio = losses > 0 ? Number((kills / losses).toFixed(2)) : kills;

    const avgDamage = Math.round((stats.damageDealt || 0) / rounds);
    const winRate = Number((((stats.wins || 0) / rounds) * 100).toFixed(1));
    const top10Rate = Number((((stats.top10s || 0) / rounds) * 100).toFixed(1));
    const headshotRate = kills > 0 ? Number((((stats.headshotKills || 0) / kills) * 100).toFixed(1)) : 0;
    const assistsPerMatch = Number((((stats.assists || 0) / rounds)).toFixed(2));
    const revivesPerMatch = Number((((stats.revives || 0) / rounds)).toFixed(2));

    return {
        roundsPlayed: rounds,
        wins: stats.wins || 0,
        kills: kills,
        damageDealt: Math.round(stats.damageDealt || 0),
        kd: kdRatio,
        avgDamage: avgDamage,
        winRate: winRate,
        top10Rate: top10Rate,
        headshotRate: headshotRate,
        assistsPerMatch: assistsPerMatch,
        revivesPerMatch: revivesPerMatch
    };
}

function calculateIDC(metrics) {
    if (!metrics || metrics.roundsPlayed === 0) return 0;
    const idc = (metrics.kd * 35) + (metrics.avgDamage * 0.35) + (metrics.winRate * 2.0) + (metrics.top10Rate * 0.8);
    return Number(idc.toFixed(1));
}

async function updatePubgRanking(client) {
    if (isUpdating) {
        console.log('⏳ Atualização do Ranking PUBG já em andamento. Ignorando chamada concorrente.');
        return;
    }

    isUpdating = true;

    try {
        console.log('\n========================================');
        console.log('🏆 Iniciando atualização do Ranking Oficial PUBG...');
        console.log('========================================');

        const rankingChannelId = ids.channels.rankingPubg;
        if (!rankingChannelId) {
            console.log('⚠ Canal de ranking (rankingPubg) não configurado em ids.json.');
            isUpdating = false;
            return;
        }

        const channel = await client.channels.fetch(rankingChannelId).catch(() => null);
        if (!channel) {
            console.log(`⚠ Canal com ID ${rankingChannelId} não encontrado.`);
            isUpdating = false;
            return;
        }

        const membersList = clanConfig.members || [];
        if (membersList.length === 0) {
            console.log('⚠ Nenhum membro configurado em pubgClan.json.');
            isUpdating = false;
            return;
        }

        const currentSeasonId = await getCurrentSeasonId();
        console.log(`📌 Temporada ativa no PUBG: ${currentSeasonId}`);

        const accountMap = await getAccountIdsBatch(membersList);
        const rankedPlayers = [];

        console.log(`📡 Coletando estatísticas da temporada para os membros do clã...`);

        for (const name of membersList) {
            const playerInfo = accountMap[name.toLowerCase()];
            if (!playerInfo) {
                console.log(`⚪ Membro ${name} não encontrado na API da Krafton.`);
                continue;
            }

            const gameModeStats = await getSeasonStats(playerInfo.id, currentSeasonId);
            const aggregated = aggregateStatsForMode(gameModeStats, clanConfig.gameMode || 'squad');

            if (aggregated && aggregated.roundsPlayed > 0) {
                const metrics = calculatePlayerMetrics(aggregated);
                if (metrics) {
                    const idc = calculateIDC(metrics);
                    rankedPlayers.push({
                        name: playerInfo.officialName || name,
                        idc: idc,
                        ...metrics
                    });
                }
            } else {
                console.log(`⚪ ${name}: sem partidas no modo ${clanConfig.gameMode || 'squad'} nesta temporada.`);
            }

            await new Promise(r => setTimeout(r, 6000)); // Aguarda 6s entre chamadas para respeitar o limite de 10 req/min
        }

        if (rankedPlayers.length === 0) {
            console.log('⚠ Nenhum membro possui partidas na temporada atual.');
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setTitle('🔴 Ranking PUBG: sem dados suficientes')
                        .setDescription('Nenhum membro do clã tem partidas registradas na temporada atual no modo selecionado.')
                        .setTimestamp()
                ]
            });
            isUpdating = false;
            return;
        }

        // Ordena do maior IDC para o menor IDC
        rankedPlayers.sort((a, b) => b.idc - a.idc);

        // Atribui as posições no ranking
        rankedPlayers.forEach((p, idx) => {
            p.rank = idx + 1;
        });

        const previousSnapshot = loadSnapshot();
        saveSnapshot(rankedPlayers);

        // Salva o último ranking em pubgLastRanking.json para uso de comandos como /analise-ia
        try {
            fs.writeFileSync(LAST_RANKING_FILE, JSON.stringify({
                seasonId: currentSeasonId,
                updatedAt: new Date().toISOString(),
                players: rankedPlayers
            }, null, 4));
            console.log('💾 Ranking atualizado salvo em pubgLastRanking.json com sucesso.');
        } catch (errLast) {
            console.log('⚠ Erro ao salvar pubgLastRanking.json:', errLast.message);
        }

        // Gera a análise do clã feita pela IA Gemini
        let aiAnalysisText = '';
        try {
            console.log('🤖 Gerando análise estatística do clã via IA...');
            aiAnalysisText = await generateClanAiAnalysis(rankedPlayers, currentSeasonId);
        } catch (aiErr) {
            console.log('⚠ Aviso ao gerar análise por IA:', aiErr.message);
        }

        // Constrói o Embed Principal de Tabela do Ranking
        const rankingEmbed = new EmbedBuilder()
            .setColor(0xF1C40F) // Dourado
            .setTitle('🏆 RANKING OFICIAL DO CLÃ — GSNT / UMA LAN LÁ EM CASA')
            .setDescription(
                `📊 **Temporada Ativa:** \`${currentSeasonId}\`  |  🎮 **Modo:** \`${(clanConfig.gameMode || 'squad').toUpperCase()}\`\n` +
                `*Atualizado automaticamente a cada 24 horas.*`
            )
            .setTimestamp();

        let tableText = '```md\n#  | NICK            | IDC   | K/D  | DANO  | PARTIDAS | VITORIAS\n';
        tableText += '---|-----------------|-------|------|-------|----------|---------\n';

        rankedPlayers.slice(0, 15).forEach((p) => {
            const rankStr = String(p.rank).padStart(2, ' ');
            const nameStr = p.name.padEnd(15, ' ').slice(0, 15);
            const idcStr = String(p.idc).padStart(5, ' ');
            const kdStr = String(p.kd).padStart(4, ' ');
            const dmgStr = String(p.avgDamage).padStart(5, ' ');
            const rdsStr = String(p.roundsPlayed).padStart(8, ' ');
            const winStr = String(p.wins).padStart(7, ' ');

            tableText += `${rankStr} | ${nameStr} | ${idcStr} | ${kdStr} | ${dmgStr} | ${rdsStr} | ${winStr}\n`;
        });

        tableText += '```';
        rankingEmbed.addFields({ name: '🥇 TABELA DE LÍDERES DO CLÃ', value: tableText });

        // Destaques de Líderes em Categorias Específicas
        const topKd = [...rankedPlayers].sort((a, b) => b.kd - a.kd)[0];
        const topDmg = [...rankedPlayers].sort((a, b) => b.avgDamage - a.avgDamage)[0];
        const topWins = [...rankedPlayers].sort((a, b) => b.wins - a.wins)[0];

        rankingEmbed.addFields(
            { name: '🔥 Maior K/D', value: `👤 **${topKd.name}** (\`${topKd.kd}\` K/D)`, inline: true },
            { name: '💥 Maior Dano Médio', value: `👤 **${topDmg.name}** (\`${formatNumber(topDmg.avgDamage)}\` Dmg)`, inline: true },
            { name: '👑 Mais Vitórias', value: `👤 **${topWins.name}** (\`${topWins.wins}\` W)`, inline: true }
        );

        // Call-To-Action Amigável no Rodapé do Embed
        rankingEmbed.setFooter({
            text: '💡 Para incluir seus dados no ranking use /vincular nick:<seu_nick> | Para análise por IA use /analise-ia'
        });

        // Envia ou atualiza a mensagem fixa do Ranking
        let rankingMessageId = null;
        try {
            if (fs.existsSync(RANKING_MESSAGE_FILE)) {
                rankingMessageId = JSON.parse(fs.readFileSync(RANKING_MESSAGE_FILE, 'utf8'))?.messageId;
            }
        } catch (e) {}

        let sentMsg = null;
        if (rankingMessageId) {
            const existingMsg = await channel.messages.fetch(rankingMessageId).catch(() => null);
            if (existingMsg) {
                sentMsg = await existingMsg.edit({ embeds: [rankingEmbed] }).catch(() => null);
            }
        }

        if (!sentMsg) {
            sentMsg = await channel.send({ embeds: [rankingEmbed] });
            fs.writeFileSync(RANKING_MESSAGE_FILE, JSON.stringify({ messageId: sentMsg.id }, null, 4));
        }

        // Se houver análise por IA, publica em um embed dedicado logo abaixo
        if (aiAnalysisText) {
            const aiEmbed = new EmbedBuilder()
                .setColor(0x9B59B6) // Roxo Inteligência Artificial
                .setTitle('🤖 ANÁLISE TÁTICA DO CLÃ PELA IA')
                .setDescription(aiAnalysisText)
                .setFooter({ text: 'Análise automática gerada por Inteligência Artificial • Clã SO NO TCHEREREU' })
                .setTimestamp();

            await channel.send({ embeds: [aiEmbed] });
        }

        // Atualiza os cargos automáticos dos membros no Discord com base nas posições do Ranking
        console.log('🏷️ Atualizando cargos de destaque do clã no Discord...');
        await updatePubgRoles(client, rankedPlayers).catch(e => console.log('⚠ Erro ao atualizar cargos:', e.message));

        console.log(`🏁 Atualização do Ranking PUBG concluída com sucesso! ${rankedPlayers.length} membro(s) ranqueado(s).\n`);
    } catch (error) {
        console.error('❌ Erro crítico na atualização do Ranking PUBG:', error);
    } finally {
        isUpdating = false;
    }
}

function startPubgRankingScheduler(client) {
    updatePubgRanking(client);

    setInterval(() => {
        updatePubgRanking(client);
    }, UPDATE_INTERVAL);

    console.log('⏰ Agendador do Ranking PUBG ativo (Atualiza a cada 24 horas).');
}

module.exports = {
    startPubgRankingScheduler,
    updatePubgRanking
};