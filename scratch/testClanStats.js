const { fetchJson } = require('../services/http');
const clanConfig = require('../config/pubgClan.json');
require('dotenv').config();

const API_KEY = process.env.PUBG_API_KEY;
const HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/vnd.api+json'
};

async function testClanStats() {
    console.log('🔍 Testando estatísticas de TODOS os membros do clã na API Oficial do PUBG...');

    // 1. Pega a temporada atual
    const seasonsRes = await fetchJson('https://api.pubg.com/shards/steam/seasons', { headers: HEADERS });
    const seasons = seasonsRes?.data || [];
    const currentSeason = seasons.find(s => s.attributes?.isCurrentSeason) || seasons[seasons.length - 1];
    console.log(`📌 Temporada Atual Ativa: ${currentSeason.id}`);

    // 2. Busca os membros em lote (até 10 por vez)
    const members = clanConfig.members || [];
    const namesParam = members.map(m => encodeURIComponent(m)).join(',');
    
    console.log(`📡 Buscando IDs para ${members.length} membro(s)...`);
    const playersRes = await fetchJson(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${namesParam}`, { headers: HEADERS });
    const players = playersRes?.data || [];
    console.log(`✅ ${players.length} jogador(es) encontrado(s) na API do PUBG!`);

    for (const p of players) {
        const name = p.attributes.name;
        const statsRes = await fetchJson(`https://api.pubg.com/shards/steam/players/${p.id}/seasons/${currentSeason.id}`, { headers: HEADERS });
        const modes = statsRes?.data?.attributes?.gameModeStats || {};

        let totalRounds = 0;
        let totalKills = 0;
        let totalDamage = 0;

        Object.entries(modes).forEach(([modeName, m]) => {
            if (m.roundsPlayed > 0) {
                totalRounds += m.roundsPlayed;
                totalKills += m.kills;
                totalDamage += m.damageDealt;
                console.log(`   🎮 [${name}] Modo ${modeName}: ${m.roundsPlayed} partidas | ${m.kills} kills | ${Math.round(m.damageDealt)} dano`);
            }
        });

        if (totalRounds > 0) {
            console.log(`⭐ CLÃ MEMBER ATIVO: ${name} -> Total ${totalRounds} partidas | ${totalKills} kills | ${Math.round(totalDamage)} dano!`);
        } else {
            console.log(`⚪ CLÃ MEMBER ${name} -> Sem partidas registradas no modo atual.`);
        }
        await new Promise(r => setTimeout(r, 200));
    }
}

testClanStats();
