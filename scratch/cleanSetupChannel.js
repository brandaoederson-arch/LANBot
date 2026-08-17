require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const ids = require('../config/ids.json');
const { sendOrUpdateSetupPanel } = require('../services/setupManager');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, async () => {
    console.log('🤖 Conectado para limpar canal #setup...');
    try {
        const channelId = ids.channels.setup;
        const channel = await client.channels.fetch(channelId).catch(() => null);

        if (channel) {
            console.log('🧹 Buscando mensagens no canal #setup...');
            const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
            if (messages && messages.size > 0) {
                for (const [, msg] of messages) {
                    await msg.delete().catch(() => null);
                    await new Promise(r => setTimeout(r, 200));
                }
                console.log(`✅ ${messages.size} mensagem(ns) apagada(s) do canal #setup.`);
            } else {
                console.log('ℹ Nenhuma mensagem encontrada no canal #setup.');
            }

            console.log('💻 Recriando painel limpo no canal #setup...');
            await sendOrUpdateSetupPanel(client);
        }
    } catch (e) {
        console.error('❌ Erro ao limpar canal #setup:', e.message);
    } finally {
        client.destroy();
    }
});

client.login(process.env.TOKEN);
