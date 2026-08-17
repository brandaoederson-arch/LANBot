const { fetchJson } = require('../services/http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/publishedDeals.json');

(async () => {
    console.log('--- Testando Jogos Grátis da Epic Games ---');
    try {
        const url = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=pt-BR&country=BR&allowCountries=BR';
        const data = await fetchJson(url);
        const elements = data?.data?.Catalog?.searchStore?.elements || [];

        console.log(`Recebidos ${elements.length} elementos da API da Epic Games.`);
        for (const game of elements) {
            const promotions = game.promotions?.promotionalOffers;
            if (!promotions || promotions.length === 0) continue;

            const offer = promotions[0]?.promotionalOffers?.[0];
            if (!offer) continue;

            const startDate = new Date(offer.startDate);
            const endDate = new Date(offer.endDate);
            const now = new Date();

            const isFreeNow = startDate <= now && now <= endDate && game.price?.totalPrice?.discountPrice === 0;

            console.log(`🎮 Jogo Epic: "${game.title}" | Grátis Agora: ${isFreeNow ? 'SIM' : 'NÃO'} | Início: ${startDate.toLocaleDateString('pt-BR')} | Fim: ${endDate.toLocaleDateString('pt-BR')}`);
        }
    } catch (e) {
        console.error('Erro na Epic:', e.message);
    }

    console.log('\n--- Verificando histórico em data/publishedDeals.json ---');
    if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const history = JSON.parse(raw);
        console.log('Epic Free IDs em histórico:', history.epic);
    }
})();
