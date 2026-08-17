const { fetchJson } = require('../services/http');
require('dotenv').config();

const API_KEY = process.env.PUBG_API_KEY;
const HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/vnd.api+json'
};

async function testPubgApi() {
    console.log('🔍 Testando API Oficial do PUBG (api.pubg.com)...');

    // 1. Busca Temporada Atual
    try {
        const seasonsRes = await fetchJson('https://api.pubg.com/shards/steam/seasons', { headers: HEADERS });
        console.log(`✅ Season Endpoint Status: OK`);
        const seasons = seasonsRes?.data || [];
        const currentSeason = seasons.find(s => s.attributes?.isCurrentSeason) || seasons[seasons.length - 1];
        console.log(`   📌 Temporada Atual: ${currentSeason?.id}`);

        // 2. Busca o Nick do Éderson / Jogador
        const playerName = 'Aquillizz'; // ou nickname do clanConfig
        const playerRes = await fetchJson(`https://api.pubg.com/shards/steam/players?filter[playerNames]=${playerName}`, { headers: HEADERS });
        const player = playerRes?.data?.[0];
        console.log(`   📌 Jogador ${playerName} -> Account ID: ${player?.id}`);

        if (player && currentSeason) {
            // 3. Busca Estatísticas da Temporada Atual
            const statsRes = await fetchJson(`https://api.pubg.com/shards/steam/players/${player.id}/seasons/${currentSeason.id}`, { headers: HEADERS });
            const gameModes = statsRes?.data?.attributes?.gameModeStats || {};
            console.log(`   📊 Modos de jogo encontrados para ${playerName}:`, Object.keys(gameModes));

            let totalKills = 0;
            let totalRounds = 0;
            Object.values(gameModes).forEach(mode => {
                totalKills += mode.kills || 0;
                totalRounds += mode.roundsPlayed || 0;
            });
            console.log(`   🔥 Total de Partidas na Temporada Atual: ${totalRounds} | Kills: ${totalKills}`);
        }
    } catch (e) {
        console.log('❌ Erro na API Oficial do PUBG:', e.message);
    }
}

testPubgApi();
