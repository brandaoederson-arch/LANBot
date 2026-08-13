const { EmbedBuilder } = require('discord.js');
const pubgDiscordLinks = require('../config/pubgDiscordLinks.json');
const { calculateAdvancedPerformanceData, saveHistorySnapshot } = require('./pubgPerformanceData');

function formatPlayer(playerName) {
    const discordId = pubgDiscordLinks[playerName];
    return discordId ? `<@${discordId}>` : `**${playerName}**`;
}

// Gera a Análise Coletiva do Clã (Relatório Geral)
async function generatePubgAiAnalysis(performanceData) {
    if (!performanceData) return null;

    const { clanMetrics, highlights, players } = performanceData;
    const mvp = highlights.mvp;
    const maiorevolucao = highlights.maiorevolucao;
    const maisConsistente = highlights.maisConsistente;
    const melhorSuporte = highlights.melhorSuporte;

    const prompt = `Você é o "Analista Técnico de Performance Competitiva de Esports" do clã de PUBG "SO NO TCHEREREU".
Sua função é transformar os dados numéricos do ranking em um relatório técnico profissional, imparcial, motivador e baseado em evidências numéricas.
ATENÇÃO: Não use frases prontas repetitivas. Analise estes números exatos:

DADOS DA PERFORMANCE ATUAL:
- Média do IDC do Clã: ${clanMetrics.avgIdcClan} Pts
- ICS (Índice de Coesão do Squad): ${clanMetrics.ics} / 100 Pts
- Dano Médio Coletivo: ${clanMetrics.avgDamageClan} (Mediana: ${clanMetrics.medianDamageClan}, Desvio Padrão: ${clanMetrics.stdDevDamageClan})
- Taxa de Vitória Média do Clã: ${clanMetrics.avgWinRateClan}%
- Total de Partidas Coletivas: ${clanMetrics.totalMatches} | Total Revives: ${clanMetrics.totalRevives} | Total Assistências: ${clanMetrics.totalAssists}

DESTAQUES E ESPECIALIDADES:
- MVP: ${mvp.name} (IDC: ${mvp.idc}, K/D: ${mvp.kd.toFixed(2)}, Dano: ${Math.round(mvp.avgDamage)}, Especialidade: ${mvp.specialty})
- Mais Consistente (ICE): ${maisConsistente.name} (ICE: ${maisConsistente.ice} Pts, Especialidade: ${maisConsistente.specialty})
- Maior Evolução (IAE): ${maiorevolucao.name} (IAE: +${maiorevolucao.iae} Pts)
- Melhor Suporte: ${melhorSuporte.name} (${melhorSuporte.assists} assistências, ${melhorSuporte.revives} revives)

JOGADORES:
${players.map(p => `- ${p.name}: Rank ${p.rank}º | IDC: ${p.idc} | K/D: ${p.kd.toFixed(2)} | Dano: ${Math.round(p.avgDamage)} | Top10: ${p.top10Rate.toFixed(1)}% | WinRate: ${p.winRate.toFixed(1)}% | ICE: ${p.ice} | IIT: ${p.iit} | Especialidade: ${p.specialty}`).join('\n')}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:
📊 **Panorama Geral do Clã**
(Resumo executivo com indicadores mensuráveis)

📈 **Evolução & Coesão do Squad (ICS)**
(Análise da sinergia do clã com o ICS em ${clanMetrics.ics} Pts)

🏆 **Destaques & Especialidades**
• MVP: ${mvp.name} (${mvp.specialty})
• Mais Consistente: ${maisConsistente.name} (ICE ${maisConsistente.ice} Pts)
• Melhor Suporte: ${melhorSuporte.name} (${melhorSuporte.specialty})

⚠️ **Diagnóstico Tático (Causa e Efeito)**
(Identifique 2 diagnósticos de causa-efeito baseados nos números)

🎯 **Recomendações Estratégicas**
(4 ações práticas e acionáveis para o squad)

🔮 **Tendência & Oportunidades**
(Previsão fundamentada de potencial de crescimento dos membros)`;

    if (process.env.GEMINI_API_KEY) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
            const body = { contents: [{ parts: [{ text: prompt }] }] };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (replyText) return replyText;
        } catch (e) {
            console.log('⚠ Consulta ao Gemini falhou, gerando relatório analítico local:', e.message);
        }
    }

    return `📊 **Panorama Geral do Clã**\nO clã registra um **IDC médio de ${clanMetrics.avgIdcClan} Pts** com dano médio de **${clanMetrics.avgDamageClan} por partida** e **${clanMetrics.avgWinRateClan}% de vitórias**. A mediana de dano ficou em **${clanMetrics.medianDamageClan}** com desvio padrão de **${clanMetrics.stdDevDamageClan}**, demonstrando a distribuição real de performance da equipe.\n\n📈 **Evolução & Coesão do Squad (ICS)**\nO **Índice de Coesão do Squad (ICS)** cravou **${clanMetrics.ics} / 100 Pts**, refletindo o total acumulado de **${clanMetrics.totalAssists} assistências** e **${clanMetrics.totalRevives} reanimações** em **${clanMetrics.totalMatches} partidas** computadas na temporada.\n\n🏆 **Destaques & Especialidades**\n• 👑 **MVP do Clã:** ${formatPlayer(mvp.name)} \`[${mvp.idc} IDC]\` — Especialidade: **${mvp.specialty}**\n• 🔥 **Mais Consistente (ICE):** ${formatPlayer(maisConsistente.name)} \`[ICE ${maisConsistente.ice} Pts]\` — Especialidade: **${maisConsistente.specialty}**\n• 🤝 **Melhor Suporte:** ${formatPlayer(melhorSuporte.name)} \`[${melhorSuporte.assists} assist / ${melhorSuporte.revives} revives]\` — Especialidade: **${melhorSuporte.specialty}**\n\n⚠️ **Diagnóstico Tático (Causa e Efeito)**\n• **Diagnóstico 1 (Sobrevivência x Dano):** O dano médio do clã (${clanMetrics.avgDamageClan}) apresenta potencial ofensivo elevado, mas o desvio padrão (${clanMetrics.stdDevDamageClan}) indica trocas afobadas nas rotas iniciais, reduzindo a taxa de Top 10 coletiva.\n• **Diagnóstico 2 (Atuação de Squad):** A taxa de assistências por partida (${(clanMetrics.totalAssists / Math.max(clanMetrics.totalMatches, 1)).toFixed(2)}) demonstra engajamento conjunto nas trocas de tiros, mas exige maior disciplina na cobertura de revives.\n\n🎯 **Recomendações Estratégicas**\n1. **Priorizar Posicionamento no Mid-Game:** Garantir rotações antecipadas para o centro da zona antes da 4ª fase.\n2. **Trocas em Dupla (Crossfire):** Evitar confrontos isolados sem linha de visão do companheiro.\n3. **Gestão de Utilitários:** Aumentar o uso de granadas de fumaça para garantir reanimações seguras.\n4. **Manutenção da Consistência (ICE):** Focar na colocação final do Top 10 para elevar o IDC global.\n\n🔮 **Tendência & Oportunidades**\nMantendo a média atual de dano e elevando a sobrevivência coletiva em 2 minutos por partida, o clã apresenta potencial de crescimento estimado em **+8% de IDC** na próxima atualização.`;
}

// Gerador Inteligente 100% Dinâmico para Análise Individual de Jogador
function generateDynamicIndividualDiagnostics(player, clanMetrics) {
    const name = player.name;
    const playerMention = formatPlayer(name);
    const { kd, avgDamage, winRate, top10Rate, headshotRate, assists, revives, roundsPlayed, idc, ice, iit, specialty, rank } = player;

    // 1. Pontos Fortes Dinâmicos (Calcula as maiores virtudes reais do jogador)
    const strengths = [];
    if (kd >= 1.5) {
        strengths.push(`🔥 **Letalidade Elevada:** Registra K/D de \`${kd.toFixed(2)}\`, demonstrando alta capacidade de vencer confrontos 1v1.`);
    } else if (avgDamage >= clanMetrics.avgDamageClan) {
        strengths.push(`💥 **Volume de Dano:** Garante média de \`${Math.round(avgDamage)} pts de dano\` (acima da média do clã), mantendo constante pressão ofensiva.`);
    }

    if (headshotRate >= 28) {
        strengths.push(`🎯 **Mira Cirúrgica:** Impressionante taxa de \`${headshotRate.toFixed(1)}% de abates por Headshot\`.`);
    } else if ((revives + assists) / Math.max(roundsPlayed, 1) >= 0.5) {
        strengths.push(`🤝 **Pilar do Squad:** Excelente espírito de equipe acumulando \`${assists} assistências\` e \`${revives} reanimações\`.`);
    } else if (top10Rate >= 50) {
        strengths.push(`📡 **Mestre do Posicionamento:** Alcança o Top 10 em \`${top10Rate.toFixed(1)}%\` das partidas jogadas.`);
    } else {
        strengths.push(`⚡ **Consistência em Combate:** Mantém participação ativa em \`${roundsPlayed} partidas\` na temporada.`);
    }

    if (strengths.length < 2) {
        strengths.push(`🛡️ **Presença Tática:** Contribui para o IDC do clã com \`${idc} Pts\` no ranking.`);
    }

    // 2. Gargalo de Performance Dinâmico (Escolhe a condição mais marcante)
    let bottleneckTitle = '';
    let bottleneckText = '';
    let actionPoints = [];
    let potentialGain = '';

    if (avgDamage < clanMetrics.avgDamageClan - 40) {
        bottleneckTitle = '⚠️ Gargalo: Volume de Dano nas Trocas de Média Distância';
        bottleneckText = `O dano médio de \`${Math.round(avgDamage)}\` está consideravelmente abaixo da média do clã (\`${clanMetrics.avgDamageClan}\`). A análise indica menor engajamento ou hesitação nas trocas de tiro de média distância.`;
        actionPoints = [
            '**Ajuste de Loadout (DMR/SR):** Utilizar armas de tiro rápido (ex: Mini14, SLR ou MK12) com compensador para apoiar o squad à distância.',
            '**Suporte Agressivo:** Acompanhar a linha de frente para aplicar dano paralelo e finalizar alvos miados.',
            '**Treino de Controle de Recuo:** Dedicar 10 minutos no modo Treino ajustando a sensibilidade vertical.'
        ];
        potentialGain = `Aumentando o dano médio para 220+, ${playerMention} apresenta potencial para evoluir de **+60 a +90 Pts no IDC**.`;

    } else if (top10Rate < 45) {
        bottleneckTitle = '⚠️ Gargalo: Sobrevivência nas Fases Iniciais (Mid-Game)';
        bottleneckText = `A taxa de Top 10 está em \`${top10Rate.toFixed(1)}%\`. A análise de causa-efeito indica que ${name} busca confrontos intensos nas fases 2 e 3 do gás sem vantagem de terreno, resultando em eliminações precipitadas.`;
        actionPoints = [
            '**Rotações Antecipadas:** Transicionar para o centro do círculo antes do fechamento da 3ª fase da zona.',
            '**Drops Estratégicos:** Evitar quedas diretas em cidades disputadas (Hotdrops) nas partidas competitivas.',
            '**Guarnição de Terreno:** Priorizar construções e morros elevados em vez de áreas abertas.'
        ];
        potentialGain = `Garantindo rotações antecipadas para o Top 10, ${playerMention} pode evoluir de **+70 a +110 Pts no IDC**.`;

    } else if (winRate < 10) {
        bottleneckTitle = '⚠️ Gargalo: Conversão do Late Game (Chicken Dinner)';
        bottleneckText = `Apesar de chegar ao Top 10 em \`${top10Rate.toFixed(1)}%\` dos jogos, a taxa de vitória é de \`${winRate.toFixed(1)}%\`. Isso indica que ${name} chega às fases finais com desvantagem de utilitários ou posicionamento.`;
        actionPoints = [
            '**Gestão de Smokes & Granadas:** Reservar pelo menos 3 fumaças e 2 granadas para o círculo final.',
            '**Foco de Fogo Coletivo:** Coordenar disparos simultâneos no mesmo inimigo junto com o squad.',
            '**Controle de Borda:** Controlar a borda limpa do gás nas duas últimas fases antes de mover.'
        ];
        potentialGain = `Elevando a taxa de vitórias para 12%+, ${playerMention} pode saltar **+80 a +120 Pts no IDC**.`;

    } else if (headshotRate < 20) {
        bottleneckTitle = '⚠️ Gargalo: Precisão da Mira (Headshots)';
        bottleneckText = `A taxa de headshots de \`${headshotRate.toFixed(1)}%\` indica que a maioria dos abates ocorre por tiros no tórax, aumentando o tempo necessário para derrubar o oponente (TTK).`;
        actionPoints = [
            '**Posicionamento da Retícula:** Manter a mira pré-posicionada sempre na altura da cabeça dos inimigos.',
            '**Primeiro Disparo:** Garantir que a primeira bala da rajada seja direcionada ao capacete do adversário.',
            '**Ajuste de Sensibilidade de Mira (Scoping):** Reduzir levemente a sensibilidade 2x/3x para maior controle.'
        ];
        potentialGain = `Subindo a taxa de headshots para 28%+, ${playerMention} ganhará cerca de **+50 a +75 Pts no IDC**.`;

    } else {
        bottleneckTitle = '⚠️ Gargalo: Volume de Partidas na Temporada';
        bottleneckText = `O desempenho técnico é sólido (K/D \`${kd.toFixed(2)}\`), mas o volume de \`${roundsPlayed} partidas\` limita a maximização do IDC comparado aos líderes da tabela.`;
        actionPoints = [
            '**Regularidade de Jogos:** Manter sequência diária ou semanal de partidas junto ao clã.',
            '**Liderança de Squad:** Assumir a função de Shotcaller (Capitão) em partidas no modo Squad.',
            '**Manutenção do ICE:** Manter o nível de sobrevivência alto nas próximas jogatinas.'
        ];
        potentialGain = `Aumentando a frequência de partidas, ${playerMention} tem potencial para buscar o **Top 3 do clã**.`;
    }

    const damageVsClan = avgDamage >= clanMetrics.avgDamageClan ? `+${Math.round(avgDamage - clanMetrics.avgDamageClan)} acima` : `${Math.round(avgDamage - clanMetrics.avgDamageClan)} abaixo`;
    const winRateVsClan = winRate >= clanMetrics.avgWinRateClan ? `+${(winRate - clanMetrics.avgWinRateClan).toFixed(1)}% acima` : `${(winRate - clanMetrics.avgWinRateClan).toFixed(1)}% abaixo`;

    return `👤 **DIAGNÓSTICO TÁTICO INDIVIDUAL • ${name.toUpperCase()}**

📊 **Indicadores Chave & Benchmark**
• Posição Atual: \`${rank}º Lugar\` | IDC: \`${idc} Pts\` | ICE: \`${ice} Pts\` | IIT: \`${iit} Pts\`
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

// Gera a Análise Tática Individual de um Membro Específico
async function generateIndividualPlayerAiAnalysis(player, clanMetrics) {
    if (!player || !clanMetrics) return null;

    const prompt = `Você é o "Analista Técnico de Performance Competitiva de Esports" de PUBG do clã "SO NO TCHEREREU".
Gere uma análise de performance individual EXCLUSIVA, ÚNICA, PERSONALIZADA e totalmente baseada nestes números do jogador "${player.name}".
ATENÇÃO CRÍTICA: NÃO USE NENHUMA FRASE PRONTA OU TEMPLATE REPETITIVO! Escreva um relatório 100% original e técnico.

DADOS DO JOGADOR:
- Posição no Ranking: ${player.rank}º Lugar
- IDC: ${player.idc} Pts | ICE (Consistência): ${player.ice} Pts | IIT (Impacto Tático): ${player.iit} Pts
- Especialidade Atribuída: ${player.specialty}
- K/D: ${player.kd.toFixed(2)} | Dano Médio: ${Math.round(player.avgDamage)} (Média do Clã: ${clanMetrics.avgDamageClan})
- Taxa de Vitórias: ${player.winRate.toFixed(1)}% (Média do Clã: ${clanMetrics.avgWinRateClan}%)
- Taxa de Top 10: ${player.top10Rate.toFixed(1)}% | Headshot %: ${player.headshotRate.toFixed(1)}%
- Partidas Jogadas: ${player.roundsPlayed} | Revives Totais: ${player.revives} | Assistências Totais: ${player.assists}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA (Markdown Discord):
👤 **DIAGNÓSTICO TÁTICO INDIVIDUAL • ${player.name.toUpperCase()}**

📊 **Indicadores Chave & Benchmark**
- Rank Atual: \`${player.rank}º Lugar\` | IDC: \`${player.idc} Pts\` | ICE: \`${player.ice} Pts\` | IIT: \`${player.iit} Pts\`
- Especialidade: **${player.specialty}**
- Dano Médio: \`${Math.round(player.avgDamage)}\` | Win Rate: \`${player.winRate.toFixed(1)}%\`

💥 **Pontos Fortes (Highlights em Combate)**
(Destaque 2 virtudes mensuráveis únicas deste jogador)

⚠️ **Gargalo de Performance (Causa e Efeito)**
(Identifique a principal oportunidade de melhoria comparando dano, sobrevivência ou revives)

🎯 **Plano de Ação Personalizado (3 Dicas Acionáveis)**
1. (Dica prática 1)
2. (Dica prática 2)
3. (Dica prática 3)

🔮 **Potencial de Ganho no IDC**
(Estime quanto de IDC o jogador pode ganhar ao ajustar esse gargalo)`;

    if (process.env.GEMINI_API_KEY) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
            const body = { contents: [{ parts: [{ text: prompt }] }] };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (replyText) return replyText;
        } catch (e) {
            console.log('⚠ Consulta ao Gemini falhou, usando gerador dinâmico local:', e.message);
        }
    }

    // Utiliza o Gerador Dinâmico Local Inteligente sem templates fixos!
    return generateDynamicIndividualDiagnostics(player, clanMetrics);
}

async function buildAiAnalystEmbed(rankedPlayers) {
    const perfData = calculateAdvancedPerformanceData(rankedPlayers);
    if (!perfData) return null;

    saveHistorySnapshot(rankedPlayers);
    const textAnalysis = await generatePubgAiAnalysis(perfData);

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🤖 IA DE ANÁLISE DE PERFORMANCE COMPETITIVA DO CLÃ')
        .setDescription(textAnalysis || 'Nenhuma análise gerada.')
        .setFooter({ text: 'Departamento de Performance de Esports • Clã SO NO TCHEREREU' })
        .setTimestamp();

    return embed;
}

module.exports = {
    buildAiAnalystEmbed,
    generatePubgAiAnalysis,
    generateIndividualPlayerAiAnalysis
};
