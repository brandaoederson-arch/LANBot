const { fetchJson } = require('../services/http');
require('dotenv').config();

const API_KEY = process.env.PUBG_API_KEY;
const HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/vnd.api+json'
};

async function findCurrentSeasons() {
    console.log('🔍 Buscando especificamente temporadas pc-2018-XX...');

    const res = await fetchJson('https://api.pubg.com/shards/steam/seasons', { headers: HEADERS });
    const seasons = res?.data || [];

    const pc2018 = seasons.filter(s => s.id.startsWith('division.bro.official.pc-2018-'));
    console.log(`📌 Encontradas ${pc2018.length} temporadas no formato pc-2018-XX:`);

    pc2018.forEach(s => {
        console.log(`   ID: ${s.id} | Current: ${s.attributes?.isCurrentSeason} | Offseason: ${s.attributes?.isOffseason}`);
    });

    const currentSeason = pc2018.find(s => s.attributes?.isCurrentSeason);
    console.log(`\n⭐ TEMPORADA ATUAL OFICIAL: ${currentSeason ? currentSeason.id : 'Nenhuma marcada como isCurrentSeason'}`);

    // Pega as últimas 3 temporadas pc-2018-XX
    const last3 = pc2018.slice(-3);
    const playerRes = await fetchJson('https://api.pubg.com/shards/steam/players?filter[playerNames]=Aquilliz', { headers: HEADERS });
    const playerId = playerRes?.data?.[0]?.id;

    if (playerId) {
        console.log(`\n📊 Partidas de Aquilliz nas últimas 3 temporadas:`);
        for (const s of last3) {
            try {
                const stats = await fetchJson(`https://api.pubg.com/shards/steam/players/${playerId}/seasons/${s.id}`, { headers: HEADERS });
                const modes = stats?.data?.attributes?.gameModeStats || {};

                let rSquad = modes['squad']?.roundsPlayed || 0;
                let rSquadFpp = modes['squad-fpp']?.roundsPlayed || 0;
                let rDuo = modes['duo']?.roundsPlayed || 0;
                let rDuoFpp = modes['duo-fpp']?.roundsPlayed || 0;

                console.log(`   🔹 [${s.id}] -> Squad TPP: ${rSquad} | Squad FPP: ${rSquadFpp} | Duo TPP: ${rDuo} | Duo FPP: ${rDuoFpp} (Current: ${s.attributes?.isCurrentSeason})`);
            } catch (e) {
                console.log(`   ⚠ Erro em ${s.id}:`, e.message);
            }
            await new Promise(r => setTimeout(r, 600));
        }
    }
}

findCurrentSeasons();
