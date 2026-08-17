const { fetchJson } = require('../services/http');
require('dotenv').config();

const API_KEY = process.env.PUBG_API_KEY;
const HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/vnd.api+json'
};

async function testAquillizSeasons() {
    const playerRes = await fetchJson('https://api.pubg.com/shards/steam/players?filter[playerNames]=Aquilliz', { headers: HEADERS });
    const playerId = playerRes?.data?.[0]?.id;

    console.log(`📌 Aquilliz ID: ${playerId}`);

    const seasonsToTest = ['division.bro.official.pc-2018-42', 'division.bro.official.pc-2018-41', 'division.bro.official.pc-2018-40'];

    for (const sId of seasonsToTest) {
        try {
            const res = await fetchJson(`https://api.pubg.com/shards/steam/players/${playerId}/seasons/${sId}`, { headers: HEADERS });
            const modes = res?.data?.attributes?.gameModeStats || {};

            console.log(`\n📊 Season: ${sId}`);
            for (const [mode, m] of Object.entries(modes)) {
                if (m.roundsPlayed > 0) {
                    console.log(`   🎮 Modo [${mode}]: ${m.roundsPlayed} partidas | ${m.kills} kills | ${Math.round(m.damageDealt)} dano`);
                }
            }
        } catch (e) {
            console.log(`⚠ Erro em ${sId}:`, e.message);
        }
        await new Promise(r => setTimeout(r, 600));
    }
}

testAquillizSeasons();
