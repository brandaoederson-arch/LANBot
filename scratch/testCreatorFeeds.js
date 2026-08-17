const Parser = require('rss-parser');
const parser = new Parser();
const { fetchJson } = require('../services/http');

(async () => {
    console.log('🔍 Testando feeds de criadores aprovados do PUBG...');

    // Exemplo de canais do YouTube e feeds RSS oficiais
    const creators = [
        { name: 'Romanov Gamer', handle: 'RomanovGamer' },
        { name: 'Ivanz1to', handle: 'ivanz1to' },
        { name: 'Thauê Neves', handle: 'ThaueNeves' },
        { name: 'Netenho', handle: 'Netenho' }
    ];

    for (const creator of creators) {
        console.log(`\n📌 Criador: ${creator.name}`);
        // Podemos buscar via busca do YouTube ou RSS direct channel ID
    }
})();
