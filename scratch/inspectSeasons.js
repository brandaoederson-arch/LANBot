const { fetchJson } = require('../services/http');
require('dotenv').config();

const API_KEY = process.env.PUBG_API_KEY;
const HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/vnd.api+json'
};

async function inspectSeasons() {
    console.log('🔍 Inspecionando TODAS as temporadas do PUBG na API Oficial...');

    const res = await fetchJson('https://api.pubg.com/shards/steam/seasons', { headers: HEADERS });
    const seasons = res?.data || [];

    console.log(`📌 Total de Temporadas encontradas: ${seasons.length}`);

    // Pega as últimas 5 temporadas
    const lastSeasons = seasons.slice(-5);
    for (const s of lastSeasons) {
        console.log(`   📅 Season ID: ${s.id} | isCurrentSeason: ${s.attributes?.isCurrentSeason} | isOffseason: ${s.attributes?.isOffseason}`);
    }

    // Pega o ID do jogador Aquilliz
    const playerRes = await fetchJson('https://api.pubg.com/shards/steam/players?filter[playerNames]=Aquilliz', { headers: HEADERS });
    const playerId = playerRes?.data?.[0]?.id;

    if (playerId) {
        console.log(`\n📊 Testando partidas do jogador Aquilliz em cada temporada recente:`);
        for (const s of lastSeasons) {
            try {
                const stats = await fetchJson(`https://api.pubg.com/shards/steam/players/${playerId}/seasons/${s.id}`, { headers: HEADERS });
                const modes = stats?.data?.attributes?.gameModeStats || {};

                let rounds = 0;
                let kills = 0;
                Object.values(modes).forEach(m => {
                    rounds += m.roundsPlayed || 0;
                    kills += m.kills || 0;
                });
                console.log(`   🔹 [${s.id}] -> ${rounds} partidas | ${kills} kills (Current: ${s.attributes?.isCurrentSeason})`);
            } catch (e) {
                console.log(`   ⚠ Erro em ${s.id}:`, e.message);
            }
            await new Promise(r => setTimeout(r, 400));
        }
    }
}

inspectSeasons();
