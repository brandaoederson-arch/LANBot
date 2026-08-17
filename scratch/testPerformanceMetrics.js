const fs = require('fs');
const path = require('path');

// Dados simulados para validar os novos Índices Inteligentes (ICE, ICS, IAE, IIT)
const mockPlayers = [
    { name: 'Aquilliz', roundsPlayed: 447, wins: 35, kills: 750, assists: 180, revives: 65, top10s: 210, headshotKills: 168, damageDealt: 113538, timeSurvived: 321840, idc: 890, kd: 1.82, winRate: 7.8, top10Rate: 47.0, headshotRate: 22.4, avgDamage: 254 },
    { name: 'Zezinho', roundsPlayed: 210, wins: 13, kills: 246, assists: 95, revives: 42, top10s: 90, headshotKills: 88, damageDealt: 46620, timeSurvived: 147000, idc: 840, kd: 1.25, winRate: 6.2, top10Rate: 42.8, headshotRate: 35.9, avgDamage: 222 },
    { name: 'PiRiNeUs', roundsPlayed: 182, wins: 41, kills: 762, assists: 110, revives: 38, top10s: 115, headshotKills: 172, damageDealt: 84266, timeSurvived: 156520, idc: 960, kd: 5.41, winRate: 22.5, top10Rate: 63.1, headshotRate: 22.5, avgDamage: 463 },
    { name: 'Gabriel', roundsPlayed: 313, wins: 25, kills: 366, assists: 140, revives: 52, top10s: 130, headshotKills: 66, damageDealt: 45698, timeSurvived: 212840, idc: 780, kd: 1.27, winRate: 8.0, top10Rate: 41.5, headshotRate: 18.0, avgDamage: 146 }
];

function calculatePerformanceMetrics(players) {
    if (!players || players.length === 0) return null;

    const totalMatches = players.reduce((sum, p) => sum + p.roundsPlayed, 0);
    const totalAssists = players.reduce((sum, p) => sum + p.assists, 0);
    const totalRevives = players.reduce((sum, p) => sum + p.revives, 0);
    const avgDamageClan = players.reduce((sum, p) => sum + p.avgDamage, 0) / players.length;
    const avgWinRateClan = players.reduce((sum, p) => sum + p.winRate, 0) / players.length;

    // 1. ICS - Índice de Coesão do Squad (0-100)
    // Sinergia baseada em assistências por partida, revives acumulados e estabilidade de vitórias
    const avgAssistsPerMatch = totalAssists / totalMatches;
    const avgRevivesPerMatch = totalRevives / totalMatches;
    const ics = Math.min(100, Math.round((avgAssistsPerMatch * 40) + (avgRevivesPerMatch * 40) + (avgWinRateClan * 1.5)));

    // 2. Especialidades por Jogador
    const specializedPlayers = players.map(p => {
        // ICE - Índice de Consistência Esportiva
        const ice = Math.min(100, Math.round((p.top10Rate * 0.6) + (Math.min(p.winRate, 20) * 2)));

        // IIT - Índice de Impacto Tático
        const iit = Math.min(100, Math.round((p.avgDamage / 6) + (p.kd * 10) + (p.winRate * 1.2)));

        // Atribui Especialidade Única
        let specialty = '🔥 Consistente';
        if (p.avgDamage >= 400) specialty = '💥 Executor';
        else if (p.headshotRate >= 30) specialty = '🎯 Finalizador';
        else if (p.winRate >= 15) specialty = '🛡 Sobrevivente';
        else if (p.assists / p.roundsPlayed >= 0.4 || p.revives / p.roundsPlayed >= 0.15) specialty = '🤝 Suporte';
        else if (p.top10Rate >= 45) specialty = '📡 Estratégico';

        return {
            ...p,
            ice,
            iit,
            specialty
        };
    });

    return {
        clanAverages: {
            avgDamageClan: Math.round(avgDamageClan),
            avgWinRateClan: Number(avgWinRateClan.toFixed(1)),
            ics
        },
        players: specializedPlayers
    };
}

const result = calculatePerformanceMetrics(mockPlayers);
console.log('--- TESTE DAS MÉTRICAS INTELIGENTES (ICE, ICS, IIT & ESPECIALIDADES) ---');
console.log('ICS do Squad:', result.clanAverages.ics, 'Pts');
console.log('\nResultados dos Jogadores:');
result.players.forEach(p => {
    console.log(`👤 ${p.name}: IDC [${p.idc}] | ICE [${p.ice}] | IIT [${p.iit}] | Especialidade: ${p.specialty}`);
});
