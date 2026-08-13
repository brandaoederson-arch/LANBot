const PUBG_BASE_URL = 'https://api.pubg.com/shards/steam';

const MIN_INTERVAL_MS = 6500; // ~9 pedidos/minuto, seguro dentro do limite de 10/min

let lastRequestTime = 0;
let lastSuccessTime = null;
let lastError = null;


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function getHeaders() {

    return {
        'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
        'Accept': 'application/vnd.api+json'
    };

}


async function rateLimitedFetch(url) {

    const now = Date.now();
    const elapsed = now - lastRequestTime;

    if (elapsed < MIN_INTERVAL_MS) {
        await sleep(MIN_INTERVAL_MS - elapsed);
    }

    lastRequestTime = Date.now();

    let response = await fetch(url, { headers: getHeaders() });

    if (response.status === 429) {

        console.log('⏳ Limite de requisições atingido, aguardando 15s...');

        await sleep(15000);

        lastRequestTime = Date.now();

        response = await fetch(url, { headers: getHeaders() });

    }

    if (response.ok) {

        lastSuccessTime = new Date();
        lastError = null;

    } else {

        lastError = `status ${response.status}`;

    }

    return response;

}


function getApiStatus() {

    return {
        configured: !!process.env.PUBG_API_KEY,
        lastSuccessTime,
        lastError
    };

}


async function getAccountId(playerName) {

    const url = `${PUBG_BASE_URL}/players?filter[playerNames]=${encodeURIComponent(playerName)}`;

    const response = await rateLimitedFetch(url);

    if (!response.ok) {
        throw new Error(`Erro ao buscar jogador "${playerName}": status ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
        throw new Error(`Jogador "${playerName}" não encontrado na Steam.`);
    }

    return data.data[0].id;

}


async function getAccountIdsBatch(playerNames) {

    const results = {};

    for (let i = 0; i < playerNames.length; i += 10) {

        const batch = playerNames.slice(i, i + 10);

        const url = `${PUBG_BASE_URL}/players?filter[playerNames]=${batch.map(encodeURIComponent).join(',')}`;

        const response = await rateLimitedFetch(url);

        if (!response.ok) {
            throw new Error(`Erro ao buscar jogadores em lote: status ${response.status}`);
        }

        const data = await response.json();

        for (const player of data.data) {
            results[player.attributes.name] = player.id;
        }

    }

    return results;

}


async function getCurrentSeasonId() {

    const url = `${PUBG_BASE_URL}/seasons`;

    const response = await rateLimitedFetch(url);

    if (!response.ok) {
        throw new Error(`Erro ao buscar temporadas: status ${response.status}`);
    }

    const data = await response.json();

    const current = data.data.find(season => season.attributes.isCurrentSeason);

    if (!current) {
        throw new Error('Nenhuma temporada atual encontrada.');
    }

    return current.id;

}


function getSeasonDisplayName(seasonId) {

    const partes = seasonId.split('-');

    const numero = partes[partes.length - 1];

    return `Temporada ${numero}`;

}


async function getSeasonStats(accountId, seasonId) {

    const url = `${PUBG_BASE_URL}/players/${accountId}/seasons/${seasonId}`;

    const response = await rateLimitedFetch(url);

    if (!response.ok) {
        throw new Error(`Erro ao buscar estatísticas: status ${response.status}`);
    }

    const data = await response.json();

    return data.data.attributes.gameModeStats;

}


module.exports = {
    getAccountId,
    getAccountIdsBatch,
    getCurrentSeasonId,
    getSeasonDisplayName,
    getSeasonStats,
    getApiStatus
};