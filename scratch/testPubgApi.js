require('dotenv').config();
const { fetchJson } = require('../services/http');

const PUBG_API_BASE = 'https://api.pubg.com/shards/steam';
const headers = {
    'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
    'Accept': 'application/vnd.api+json'
};

async function test() {
    console.log('--- TESTANDO PUBG API ---');
    console.log('1. Testando GET /seasons...');
    try {
        const seasonsRes = await fetchJson(`${PUBG_API_BASE}/seasons`, { headers });
        console.log('Resposta de /seasons (res.data.length):', seasonsRes?.data?.length);
        const currentSeason = seasonsRes?.data?.find(s => s.attributes?.isCurrentSeason);
        console.log('Temporada Atual (isCurrentSeason=true):', currentSeason);
        const lastSeason = seasonsRes?.data?.[seasonsRes.data.length - 1];
        console.log('Última temporada no array:', lastSeason);
    } catch (e) {
        console.error('Erro em /seasons:', e.message, e);
    }

    console.log('\n2. Testando busca de jogador (ex: Aquilliz, PiRiNeUs, Taniisouza)...');
    try {
        const playersRes = await fetchJson(`${PUBG_API_BASE}/players?filter[playerNames]=Aquilliz,PiRiNeUs`, { headers });
        console.log('Jogadores encontrados:', playersRes?.data?.map(p => ({ id: p.id, name: p.attributes?.name })));
        
        if (playersRes?.data?.[0]) {
            const playerId = playersRes.data[0].id;
            const playerName = playersRes.data[0].attributes.name;
            
            // Busca estatísticas na última temporada
            const seasonsRes = await fetchJson(`${PUBG_API_BASE}/seasons`, { headers });
            const currentSeasonId = seasonsRes?.data?.find(s => s.attributes?.isCurrentSeason)?.id || 'division.bro.official.pc-2018-34';
            console.log(`\n3. Testando /players/${playerId}/seasons/${currentSeasonId}...`);
            
            const statsRes = await fetchJson(`${PUBG_API_BASE}/players/${playerId}/seasons/${currentSeasonId}`, { headers });
            console.log('Stats gameModeStats keys:', Object.keys(statsRes?.data?.attributes?.gameModeStats || {}));
            console.log('Stats para squad / squad-fpp:', {
                squad: statsRes?.data?.attributes?.gameModeStats?.squad,
                'squad-fpp': statsRes?.data?.attributes?.gameModeStats?.['squad-fpp']
            });
        }
    } catch (e) {
        console.error('Erro ao buscar jogador/stats:', e.message);
    }
}

test();
