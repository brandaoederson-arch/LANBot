const { calculateAdvancedPerformanceData } = require('../services/pubgPerformanceData');
require('dotenv').config();

// Função geradora de diagnóstico tático 100% dinâmico e exclusivo por jogador
function generateDynamicDiagnostics(player, clanMetrics) {
    const { kd, avgDamage, winRate, top10Rate, headshotRate, assists, revives, roundsPlayed, idc, ice, iit, specialty, name } = player;

    // 1. Pontos Fortes Dinâmicos (Calcula as 2 maiores virtudes reais do jogador)
    const strengths = [];
    if (kd >= 1.5) strengths.push(`🔥 **Letalidade Elevada:** Registra K/D de \`${kd.toFixed(2)}\`, demonstrando alta capacidade de vencer trocas de tiros 1v1.`);
    else if (avgDamage >= 250) strengths.push(`💥 **Volume de Dano:** Garante média de \`${Math.round(avgDamage)} pts de dano\`, mantendo constante pressão ofensiva.`);

    if (headshotRate >= 28) strengths.push(`🎯 **Mira Cirúrgica:** Impressionante taxa de \`${headshotRate.toFixed(1)}% de abates por Headshot\`.`);
    else if ((revives + assists) / Math.max(roundsPlayed, 1) >= 0.6) strengths.push(`🤝 **Pilar do Squad:** Excelente espírito de equipe acumulando \`${assists} assistências\` e \`${revives} reanimações\`.`);
    else if (top10Rate >= 50) strengths.push(`📡 **Mestre da Sobrevivência:** Alcança o Top 10 em \`${top10Rate.toFixed(1)}%\` das partidas jogadas.`);
    else strengths.push(`⚡ **Consistência em Combate:** Mantém participação ativa em \`${roundsPlayed} partidas\` na temporada.`);

    if (strengths.length < 2) {
        strengths.push(`🛡️ **Presença Tática:** Contribui para o IDC do clã com \`${idc} Pts\` no ranking.`);
    }

    // 2. Gargalo de Performance e Hipótese de Causa-Efeito (Diferente para cada perfil!)
    let bottleneckTitle = '';
    let bottleneckText = '';
    let actionPoints = [];
    let potentialGain = '';

    if (top10Rate < 45) {
        bottleneckTitle = '⚠️ Gargalo: Sobrevivência nas Fases Iniciais (Mid-Game)';
        bottleneckText = `A taxa de Top 10 está em \`${top10Rate.toFixed(1)}%\`. A análise de causa-efeito indica que ${name} busca confrontos intensos nas fases 2 e 3 do gás sem vantagem de terreno, sendo eliminado antes dos círculos decisivos.`;
        actionPoints = [
            '**Rotações Antecipadas:** Transicionar para o centro do círculo antes da 3ª fase da zona azul.',
            '**Drops Estratégicos:** Evitar quedas diretas em cidades disputadas (Hotdrops) ao jogar ranqueado.',
            '**Guarnição de Terreno:** Priorizar construções e morros elevados em vez de estradas abertas.'
        ];
        potentialGain = `Garantindo rotações antecipadas para o Top 10, **${name}** pode evoluir de **+70 a +110 Pts no IDC**.`;

    } else if (winRate < 10) {
        bottleneckTitle = '⚠️ Gargalo: Conversão do Late Game (Chicken Dinner)';
        bottleneckText = `Apesar de chegar ao Top 10 em \`${top10Rate.toFixed(1)}%\` dos jogos, a taxa de vitória é de \`${winRate.toFixed(1)}%\`. Isso indica que ${name} chega às fases finais com desvantagem de utilitários ou posicionamento.`;
        actionPoints = [
            '**Gestão de Smokes & Granadas:** Reservar pelo menos 3 fumaças e 2 granadas para o círculo final.',
            '**Foco de Fogo Coletivo:** Coordenar disparos simultâneos no mesmo inimigo com o squad.',
            '**Controle de Borda:** Controlar a borda limpa do gás nas duas últimas fases antes de mover.'
        ];
        potentialGain = `Elevando a taxa de vitórias para 12%, **${name}** pode saltar **+80 a +120 Pts no IDC**.`;

    } else if (avgDamage < clanMetrics.avgDamageClan) {
        bottleneckTitle = '⚠️ Gargalo: Volume de Dano e Troca de Tiros';
        bottleneckText = `O dano médio de \`${Math.round(avgDamage)}\` está abaixo da média do clã (\`${clanMetrics.avgDamageClan}\`). A análise indica menor engajamento nas trocas de média/longa distância.`;
        actionPoints = [
            '**Ajuste de Equipamentos:** Equipar DMRs (DMR com compensador e coronha) para trocas de média distância.',
            '**Suporte Agressivo:** Acompanhar a linha de frente do squad para aplicar dano paralelo.',
            '**Treino de Controle de Recuo:** Praticar rajadas no modo Treino antes das partidas.'
        ];
        potentialGain = `Aumentando o dano médio em 50 pontos, **${name}** pode ganhar **+50 a +80 Pts no IDC**.`;

    } else {
        bottleneckTitle = '⚠️ Gargalo: Volume de Partidas e Atividade';
        bottleneckText = `O desempenho técnico é elevado, mas o volume de \`${roundsPlayed} partidas\` limita a maximização do IDC no ranking comparado aos líderes.`;
        actionPoints = [
            '**Regularidade de Jogos:** Manter sequência diária ou semanal de partidas com o clã.',
            '**Liderança de Squad:** Assumir a função de Shotcaller (Capitão) nas partidas do clã.',
            '**Consistência de ICE:** Manter o nível de sobrevivência alto nas próximas jogatinas.'
        ];
        potentialGain = `Aumentando a frequência de partidas, **${name}** tem potencial para alcançar o **Top 3 do clã**.`;
    }

    const damageVsClan = avgDamage >= clanMetrics.avgDamageClan ? `+${Math.round(avgDamage - clanMetrics.avgDamageClan)} acima` : `${Math.round(avgDamage - clanMetrics.avgDamageClan)} abaixo`;
    const winRateVsClan = winRate >= clanMetrics.avgWinRateClan ? `+${(winRate - clanMetrics.avgWinRateClan).toFixed(1)}% acima` : `${(winRate - clanMetrics.avgWinRateClan).toFixed(1)}% abaixo`;

    return `👤 **DIAGNÓSTICO TÁTICO INDIVIDUAL • ${name.toUpperCase()}**

📊 **Indicadores Chave & Benchmark**
• Posição Atual: \`${player.rank}º Lugar\` | IDC: \`${idc} Pts\` | ICE: \`${ice} Pts\` | IIT: \`${iit} Pts\`
• Especialidade: **${specialty}**
• Dano Médio: \`${Math.round(avgDamage)}\` (${damageVsClan} da média do clã)
• Win Rate: \`${winRate.toFixed(1)}%\` (${winRateVsClan} da média do clã)
• Precisão Headshot: \`${headshotRate.toFixed(1)}%\` | Partidas: \`${roundsPlayed}\`

💥 **Pontos Fortes em Combate**
• ${strengths[0]}
• ${strengths[1]}

${bottleneckTitle}
${bottleneckText}

🎯 **Plano de Ação Personalizado**
1. ${actionPoints[0]}
2. ${actionPoints[1]}
3. ${actionPoints[2]}

🔮 **Potencial de Ganho no IDC**
${potentialGain}`;
}

const mockAquilliz = { name: 'Aquilliz', rank: 3, idc: 358, ice: 60, iit: 76, specialty: '🤝 Suporte', avgDamage: 250, winRate: 7.5, headshotRate: 23.0, roundsPlayed: 464, top10Rate: 47.2, kd: 1.78, assists: 269, revives: 185 };
const mockGabs = { name: 'Gabszw855', rank: 5, idc: 282, ice: 59, iit: 51, specialty: '🤝 Suporte', avgDamage: 146, winRate: 7.9, headshotRate: 22.6, roundsPlayed: 317, top10Rate: 51.1, kd: 1.26, assists: 171, revives: 117 };
const mockClan = { avgDamageClan: 230, avgWinRateClan: 10.6, avgKdClan: 1.5 };

console.log('🔍 Testando diagnósticos 100% dinâmicos para Aquilliz e Gabszw855...\n');
console.log('================ AQUILLIZ ================');
console.log(generateDynamicDiagnostics(mockAquilliz, mockClan));
console.log('\n================ GABSZW855 ================');
console.log(generateDynamicDiagnostics(mockGabs, mockClan));
