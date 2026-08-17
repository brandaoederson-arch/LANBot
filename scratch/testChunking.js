const { fetchJson } = require('../services/http');
const clanConfig = require('../config/pubgClan.json');
require('dotenv').config();

const API_KEY = process.env.PUBG_API_KEY;
const HEADERS = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/vnd.api+json'
};

async function testChunking() {
    const members = clanConfig.members || [];
    console.log(`🔍 Testando busca em lotes pequenos de 5 membros (Total: ${members.length})...`);

    const chunkSize = 5;
    const accountMap = {};

    for (let i = 0; i < members.length; i += chunkSize) {
        const chunk = members.slice(i, i + chunkSize);
        const namesParam = chunk.map(n => encodeURIComponent(n)).join(',');
        const url = `https://api.pubg.com/shards/steam/players?filter[playerNames]=${namesParam}`;

        try {
            console.log(`📡 Requisitando lote ${i/chunkSize + 1}: ${chunk.join(', ')}`);
            const res = await fetchJson(url, { timeout: 10000, headers: HEADERS });
            if (res?.data && res.data.length > 0) {
                res.data.forEach(p => {
                    accountMap[p.attributes.name.toLowerCase()] = p.id;
                    console.log(`   ✅ Achou: ${p.attributes.name} -> ID: ${p.id}`);
                });
            }
        } catch (e) {
            console.log(`   ❌ Erro no lote:`, e.message);
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n🎉 Total de jogadores encontrados: ${Object.keys(accountMap).length} de ${members.length}`);
}

testChunking();
