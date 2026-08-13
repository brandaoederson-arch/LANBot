const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../data/pubgHistorySnapshots.json');

// Calcula desvio padrão de um conjunto de valores
function calculateStdDev(arr) {
    if (!arr || arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
}

// Calcula a mediana de um conjunto de valores
function calculateMedian(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Carrega o histórico de snapshots dos últimos períodos
function loadHistorySnapshots() {
    try {
        if (!fs.existsSync(HISTORY_FILE)) {
            return [];
        }
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

// Salva um novo snapshot no histórico (limite de 30 snapshots históricos)
function saveHistorySnapshot(rankedPlayers) {
    try {
        const history = loadHistorySnapshots();
        const newSnapshot = {
            timestamp: new Date().toISOString(),
            players: rankedPlayers.map(p => ({
                name: p.name,
                idc: p.idc,
                kd: p.kd,
                avgDamage: p.avgDamage,
                winRate: p.winRate,
                roundsPlayed: p.roundsPlayed,
                rank: p.rank
            }))
        };

        history.push(newSnapshot);
        // Mantém os últimos 30 snapshots no disco
        const trimmed = history.slice(-30);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 4));
    } catch (e) {
        console.log('⚠ Erro ao salvar histórico de snapshots:', e.message);
    }
}

// Calcula todos os Índices Inteligentes (ICE, ICS, IAE, IIT) e a Análise de Desempenho
function calculateAdvancedPerformanceData(currentPlayers) {
    if (!currentPlayers || currentPlayers.length === 0) return null;

    const historySnapshots = loadHistorySnapshots();
    const prevSnapshot7d = historySnapshots.length > 7 ? historySnapshots[historySnapshots.length - 7] : historySnapshots[0];
    const prevSnapshot30d = historySnapshots.length > 0 ? historySnapshots[0] : null;

    const totalMatches = currentPlayers.reduce((sum, p) => sum + (p.roundsPlayed || 0), 0);
    const totalAssists = currentPlayers.reduce((sum, p) => sum + (p.assists || 0), 0);
    const totalRevives = currentPlayers.reduce((sum, p) => sum + (p.revives || 0), 0);

    const damages = currentPlayers.map(p => p.avgDamage || 0);
    const kds = currentPlayers.map(p => p.kd || 0);
    const idcs = currentPlayers.map(p => p.idc || 0);
    const winRates = currentPlayers.map(p => p.winRate || 0);

    const avgDamageClan = damages.reduce((a, b) => a + b, 0) / currentPlayers.length;
    const medianDamageClan = calculateMedian(damages);
    const stdDevDamageClan = calculateStdDev(damages);

    const avgKdClan = kds.reduce((a, b) => a + b, 0) / currentPlayers.length;
    const avgWinRateClan = winRates.reduce((a, b) => a + b, 0) / currentPlayers.length;
    const avgIdcClan = idcs.reduce((a, b) => a + b, 0) / currentPlayers.length;

    // 1. ICS - Índice de Coesão do Squad (0 a 100)
    // Mede o trabalho em equipe: assistências, revives e distribuição equilibrada do dano
    const avgAssistsPerMatch = totalMatches > 0 ? totalAssists / totalMatches : 0;
    const avgRevivesPerMatch = totalMatches > 0 ? totalRevives / totalMatches : 0;
    const damageEquilibrium = Math.max(0, 100 - (stdDevDamageClan / Math.max(avgDamageClan, 1)) * 50);
    const ics = Math.min(100, Math.round((avgAssistsPerMatch * 35) + (avgRevivesPerMatch * 35) + (avgWinRateClan * 1.5) + (damageEquilibrium * 0.15)));

    // 2. Análise individual de cada jogador com os novos índices e especialidades
    const processedPlayers = currentPlayers.map(player => {
        const prevPlayer7d = prevSnapshot7d?.players?.find(p => p.name.toLowerCase() === player.name.toLowerCase());
        const prevPlayer30d = prevSnapshot30d?.players?.find(p => p.name.toLowerCase() === player.name.toLowerCase());

        const idcDelta7d = prevPlayer7d ? (player.idc || 0) - prevPlayer7d.idc : 0;
        const idcDelta30d = prevPlayer30d ? (player.idc || 0) - prevPlayer30d.idc : 0;
        const iae = idcDelta7d;

        const top10RateVal = player.top10Rate || 0;
        const winRateVal = player.winRate || 0;
        const consistencyVal = player.consistency || 50;
        const avgDamageVal = player.avgDamage || 0;
        const kdVal = player.kd || 0;
        const headshotRateVal = player.headshotRate || 0;
        const roundsPlayedVal = player.roundsPlayed || 1;

        // ICE - Índice de Consistência Esportiva (Mede estabilidade)
        const ice = Math.min(100, Math.round((top10RateVal * 0.6) + (Math.min(winRateVal, 25) * 1.6) + (consistencyVal * 0.2)));

        // IIT - Índice de Impacto Tático (Capacidade de impacto e virada em combate)
        const iit = Math.min(100, Math.round((avgDamageVal / 5.5) + (kdVal * 12) + (winRateVal * 1.2)));

        // Atribuição de Especialidade Única (Camada 4 da Especificação)
        let specialty = '🔥 Consistente';
        if (avgDamageVal >= 380) specialty = '💥 Executor';
        else if (headshotRateVal >= 28) specialty = '🎯 Finalizador';
        else if (winRateVal >= 15) specialty = '🛡 Sobrevivente';
        else if (((player.assists || 0) / Math.max(roundsPlayedVal, 1)) >= 0.35 || ((player.revives || 0) / Math.max(roundsPlayedVal, 1)) >= 0.12) specialty = '🤝 Suporte';
        else if (top10RateVal >= 45) specialty = '📡 Estratégico';
        else if (ice >= 65) specialty = '🔥 Consistente';

        return {
            ...player,
            ice,
            ics,
            iae,
            iit,
            idcDelta7d,
            idcDelta30d,
            specialty
        };
    });

    const evolverList = [...processedPlayers].sort((a, b) => b.iae - a.iae);
    const maiorevolucao = evolverList[0];

    const consistencyList = [...processedPlayers].sort((a, b) => b.ice - a.ice);
    const maisConsistente = consistencyList[0];

    const supportList = [...processedPlayers].sort((a, b) => ((b.assists || 0) + (b.revives || 0)) - ((a.assists || 0) + (a.revives || 0)));
    const melhorSuporte = supportList[0];

    return {
        clanMetrics: {
            totalMatches,
            totalAssists,
            totalRevives,
            avgIdcClan: Math.round(avgIdcClan),
            avgDamageClan: Math.round(avgDamageClan),
            medianDamageClan: Math.round(medianDamageClan),
            stdDevDamageClan: Math.round(stdDevDamageClan),
            avgWinRateClan: Number(avgWinRateClan.toFixed(1)),
            avgKdClan: Number(avgKdClan.toFixed(2)),
            ics
        },
        highlights: {
            mvp: processedPlayers[0],
            maiorevolucao,
            maisConsistente,
            melhorSuporte
        },
        players: processedPlayers
    };
}

module.exports = {
    loadHistorySnapshots,
    saveHistorySnapshot,
    calculateAdvancedPerformanceData
};
