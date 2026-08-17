const { calculateAdvancedPerformanceData } = require('../services/pubgPerformanceData');
require('dotenv').config();

const mockPlayers = [
    { name: 'Aquilliz', roundsPlayed: 447, wins: 35, kills: 750, assists: 180, revives: 65, top10s: 210, headshotKills: 168, damageDealt: 113538, timeSurvived: 321840, idc: 890, kd: 1.82, winRate: 7.8, top10Rate: 47.0, headshotRate: 22.4, avgDamage: 254, rank: 1 },
    { name: 'PiRiNeUs', roundsPlayed: 182, wins: 41, kills: 762, assists: 110, revives: 38, top10s: 115, headshotKills: 172, damageDealt: 84266, timeSurvived: 156520, idc: 960, kd: 5.41, winRate: 22.5, top10Rate: 63.1, headshotRate: 22.5, avgDamage: 463, rank: 2 },
    { name: 'Zezinho', roundsPlayed: 210, wins: 13, kills: 246, assists: 95, revives: 42, top10s: 90, headshotKills: 88, damageDealt: 46620, timeSurvived: 147000, idc: 840, kd: 1.25, winRate: 6.2, top10Rate: 42.8, headshotRate: 35.9, avgDamage: 222, rank: 3 },
    { name: 'Gabriel', roundsPlayed: 313, wins: 25, kills: 366, assists: 140, revives: 52, top10s: 130, headshotKills: 66, damageDealt: 45698, timeSurvived: 212840, idc: 780, kd: 1.27, winRate: 8.0, top10Rate: 41.5, headshotRate: 18.0, avgDamage: 146, rank: 4 }
];

async function generateFullAiAnalysis(performanceData) {
    const { clanMetrics, highlights, players } = performanceData;

    const prompt = `Você é o "Analista Técnico de Performance Competitiva de Esports" do clã de PUBG "SO NO TCHEREREU".
Sua tarefa é analisar os dados estatísticos reais do clã e gerar um relatório técnico profissional, imparcial, motivador e baseado em evidências numéricas.

DADOS DA PERFORMANCE ATUAL:
- Média do IDC do Clã: ${clanMetrics.avgIdcClan} Pts
- ICS (Índice de Coesão do Squad): ${clanMetrics.ics} / 100 Pts
- Dano Médio Coletivo: ${clanMetrics.avgDamageClan} (Mediana: ${clanMetrics.medianDamageClan}, Desvio Padrão: ${clanMetrics.stdDevDamageClan})
- Taxa de Vitória Média do Clã: ${clanMetrics.avgWinRateClan}%
- Total de Partidas Coletivas: ${clanMetrics.totalMatches} | Total Revives: ${clanMetrics.totalRevives} | Total Assistências: ${clanMetrics.totalAssists}

DESTAQUES:
- MVP (1º Lugar): ${highlights.mvp.name} (IDC: ${highlights.mvp.idc}, K/D: ${highlights.mvp.kd.toFixed(2)}, Dano: ${Math.round(highlights.mvp.avgDamage)}, Especialidade: ${highlights.mvp.specialty})
- Mais Consistente (ICE): ${highlights.maisConsistente.name} (ICE: ${highlights.maisConsistente.ice} Pts, Especialidade: ${highlights.maisConsistente.specialty})
- Maior Evolução (IAE): ${highlights.maiorevolucao.name} (IAE: +${highlights.maiorevolucao.iae} Pts)
- Melhor Suporte: ${highlights.melhorSuporte.name} (${highlights.melhorSuporte.assists} assistências, ${highlights.melhorSuporte.revives} revives)

JOGADORES E ESPECIALIDADES:
${players.map(p => `- ${p.name}: Rank ${p.rank}º | IDC: ${p.idc} | K/D: ${p.kd.toFixed(2)} | Dano: ${Math.round(p.avgDamage)} | Top10: ${p.top10Rate.toFixed(1)}% | WinRate: ${p.winRate.toFixed(1)}% | ICE: ${p.ice} | IIT: ${p.iit} | Especialidade: ${p.specialty}`).join('\n')}

DIRETRIZES DA RESPOSTA:
A resposta deve seguir EXATAMENTE a seguinte estrutura em Markdown do Discord:

📊 **Panorama Geral do Clã**
(Resumo executivo baseado em evidências numéricas)

📈 **Evolução do Clã & Coesão**
(Análise do ICS ${clanMetrics.ics} Pts e do equilíbrio da equipe)

🏆 **Destaques & Especialidades**
• MVP: ${highlights.mvp.name}
• Mais Consistente: ${highlights.maisConsistente.name}
• Melhor Suporte: ${highlights.melhorSuporte.name}

⚠️ **Diagnóstico Tático (Causa e Efeito)**
(Identifique pelo menos 2 padrões de causa-efeito entre dano, sobrevivência, revives e colocação final)

🎯 **Recomendações Estratégicas**
(Até 4 ações práticas e objetivas para o clã)

🔮 **Tendência & Oportunidades**
(Previsão fundamentada de potencial de ganho de IDC para os membros)`;

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
            console.log('⚠ Gemini falhou:', e.message);
        }
    }

    return null;
}

(async () => {
    const perfData = calculateAdvancedPerformanceData(mockPlayers);
    console.log('🔍 Gerando Relatório Completo da IA...');
    const report = await generateFullAiAnalysis(perfData);
    console.log('\n--- RELATÓRIO DA IA ---\n');
    console.log(report);
})();
