require('dotenv').config();
const { getAccountIdsBatch, getCurrentSeasonId, getSeasonStats } = require('../services/pubgApi');
const clanConfig = require('../config/pubgClan.json');

function aggregateAllGameModes(stats) {
    if (!stats) return null;

    const modes = ['solo', 'solo-fpp', 'duo', 'duo-fpp', 'squad', 'squad-fpp'];
    let aggregated = {
        roundsPlayed: 0,
        wins: 0,
        kills: 0,
        assists: 0,
        revives: 0,
        top10s: 0,
        headshotKills: 0,
        damageDealt: 0,
        timeSurvived: 0
    };

    for (const mode of modes) {
        const m = stats[mode];
        if (m && m.roundsPlayed > 0) {
            aggregated.roundsPlayed += m.roundsPlayed || 0;
            aggregated.wins += m.wins || 0;
            aggregated.kills += m.kills || 0;
            aggregated.assists += m.assists || 0;
            aggregated.revives += m.revives || 0;
            aggregated.top10s += m.top10s || 0;
            aggregated.headshotKills += m.headshotKills || 0;
            aggregated.damageDealt += m.damageDealt || 0;
            aggregated.timeSurvived += m.timeSurvived || 0;
        }
    }

    return aggregated.roundsPlayed > 0 ? aggregated : null;
}

(async () => {
    try {
        console.log('🔍 Testando agregação de 100% das partidas (TPP + FPP, Solo + Duo + Squad)...');
        const accountIdsMap = await getAccountIdsBatch(clanConfig.members);
        const seasonId = await getCurrentSeasonId();

        for (const [name, accountId] of Object.entries(accountIdsMap)) {
            const stats = await getSeasonStats(accountId, seasonId);
            const aggregated = aggregateAllGameModes(stats);

            if (aggregated) {
                const kd = (aggregated.kills / Math.max(aggregated.roundsPlayed - aggregated.wins, 1)).toFixed(2);
                const avgDmg = Math.round(aggregated.damageDealt / aggregated.roundsPlayed);
                console.log(`✅ ${name}: ${aggregated.roundsPlayed} partidas totais (TPP/FPP full) | K/D: ${kd} | Dano Médio: ${avgDmg} | Vitórias: ${aggregated.wins}`);
            } else {
                console.log(`❌ ${name}: Sem nenhuma partida registrada nesta temporada.`);
            }
        }
    } catch (e) {
        console.error('Erro:', e.message);
    }
})();
