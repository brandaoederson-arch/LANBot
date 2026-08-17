require('dotenv').config();
const { updatePubgRanking } = require('../services/pubgRanking');

// Mock minimal Discord client
const mockClient = {
    channels: {
        fetch: async (id) => {
            console.log(`[Mock Client] channel.fetch called with ID: ${id}`);
            return {
                send: async (payload) => {
                    console.log('[Mock Client] channel.send called!');
                    return { id: 'mock_message_id', edit: async () => {} };
                },
                messages: {
                    fetch: async () => null
                }
            };
        }
    },
    guilds: {
        cache: {
            first: () => ({
                members: {
                    fetch: async () => null
                }
            })
        }
    }
};

async function run() {
    console.log('--- EXECUTANDO UPDATE PUBG RANKING ---');
    await updatePubgRanking(mockClient);
    console.log('--- FIM DA EXECUÇÃO ---');
}

run();
