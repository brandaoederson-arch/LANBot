const ids = require('../config/ids.json');

const ROLE_REACTIONS = [
    { emoji: '🔫', roleId: ids.roles.fps, label: 'FPS' },
    { emoji: '⚔️', roleId: ids.roles.mmorpg, label: 'MMORPG' },
    { emoji: '🧟', roleId: ids.roles.coop, label: 'Coop / Survival' },
    { emoji: '🧠', roleId: ids.roles.moba, label: 'MOBA' },
    { emoji: '🏎️', roleId: ids.roles.corrida, label: 'Corrida / Simulação' },
    { emoji: '⚽', roleId: ids.roles.esporte, label: 'Esportes' }
];

module.exports = { ROLE_REACTIONS };