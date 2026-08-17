const fs = require('fs');
const path = require('path');
const { calculateAdvancedPerformanceData } = require('../services/pubgPerformanceData');
const { generateIndividualPlayerAiAnalysis } = require('../services/pubgAiAnalyst');

(async () => {
    console.log('🔍 Testando a geração de Análise Individual da IA (Comando /analise-ia)...');

    const mockPlayers = [
        { name: 'Aquilliz', roundsPlayed: 447, wins: 35, kills: 750, assists: 180, revives: 65, top10s: 210, headshotKills: 168, damageDealt: 113538, timeSurvived: 321840, idc: 890, kd: 1.82, winRate: 7.8, top10Rate: 47.0, headshotRate: 22.4, avgDamage: 254, rank: 1 },
        { name: 'PiRiNeUs', roundsPlayed: 182, wins: 41, kills: 762, assists: 110, revives: 38, top10s: 115, headshotKills: 172, damageDealt: 84266, timeSurvived: 156520, idc: 960, kd: 5.41, winRate: 22.5, top10Rate: 63.1, headshotRate: 22.5, avgDamage: 463, rank: 2 },
        { name: 'Zezinho', roundsPlayed: 210, wins: 13, kills: 246, assists: 95, revives: 42, top10s: 90, headshotKills: 88, damageDealt: 46620, timeSurvived: 147000, idc: 840, kd: 1.25, winRate: 6.2, top10Rate: 42.8, headshotRate: 35.9, avgDamage: 222, rank: 3 }
    ];

    const perfData = calculateAdvancedPerformanceData(mockPlayers);
    const player = perfData.players.find(p => p.name === 'Zezinho');

    console.log(`Jogador selecionado: ${player.name}`);
    const report = await generateIndividualPlayerAiAnalysis(player, perfData.clanMetrics);

    console.log('\n--- RELATÓRIO INDIVIDUAL DA IA ---\n');
    console.log(report);
})();
