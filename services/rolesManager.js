const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const ids = require('../config/ids.json');
const { ROLE_REACTIONS } = require('./roleReactions');

const ROLE_MESSAGE_FILE = path.join(__dirname, '../data/roleMessage.json');

async function sendOrUpdateRolesPanel(client) {
    const channelId = ids.channels.cargos;
    if (!channelId) {
        console.log('⚠ ID do canal de cargos não configurado em config/ids.json');
        return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
        console.log(`⚠ Canal de cargos (${channelId}) não encontrado.`);
        return;
    }

    let savedData = {};
    if (fs.existsSync(ROLE_MESSAGE_FILE)) {
        try {
            savedData = JSON.parse(fs.readFileSync(ROLE_MESSAGE_FILE, 'utf8'));
        } catch (e) {
            savedData = {};
        }
    }

    let existingMsg = null;
    if (savedData.messageId) {
        existingMsg = await channel.messages.fetch(savedData.messageId).catch(() => null);
    }

    if (!existingMsg) {
        const recentMessages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        existingMsg = recentMessages?.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('PAINEL DE CARGOS DA COMUNIDADE'));
    }

    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🎭 PAINEL DE CARGOS DA COMUNIDADE • DIRETRIZES & SELEÇÃO')
        .setDescription(
            'Bem-vindo(a) ao centralizador de cargos! Siga as diretrizes abaixo para personalizar seu perfil e receber notificações dos seus jogos favoritos.\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '### 1️⃣ CARGOS DE JOGOS & NOTIFICAÇÕES (Auto-Atribuição)\n' +
            'Reaja aos emojis abaixo para entrar nas comunidades e liberar os canais de cada estilo de jogo. *(Remova a reação a qualquer momento para tirar o cargo)*:\n\n' +
            '🔫 **FPS** ➔ PUBG, CS2, Valorant, CoD, Battlefield...\n' +
            '⚔️ **MMORPG** ➔ World of Warcraft, Diablo, Black Desert, Tibia...\n' +
            '🧟 **Coop / Survival** ➔ Rust, DayZ, Project Zomboid, Left 4 Dead...\n' +
            '🧠 **MOBA / Estratégia** ➔ League of Legends, Dota 2, Age of Empires...\n' +
            '🏎️ **Corrida / Simulação** ➔ Euro Truck, Assetto Corsa, Forza...\n' +
            '⚽ **Esportes / Luta** ➔ EA FC, Rocket League, Street Fighter...\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '### 2️⃣ CARGOS DE DESEMPENHO & COMUNIDADE (Automáticos)\n' +
            '• 🟢 **Perfil Verificado:** Use o comando `/vincular jogador: [SeuNick]` em qualquer canal para vincular sua conta do PUBG.\n' +
            '• 💻 **Setup Verificado:** Cadastre seu PC no canal <#1532366003613466754> para participar do Ranking de Hardware.\n' +
            '• 🏆 **Patentes de Ranking PUBG:** Conquistadas semanalmente de acordo com seu desempenho no clã (Predador, MVP, Atirador de Elite, etc).\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        )
        .setFooter({ text: 'Clã SO NO TCHEREREU • Sistema de Gestão de Cargos' })
        .setTimestamp();

    let targetMsg;

    if (existingMsg) {
        targetMsg = await existingMsg.edit({ embeds: [embed] }).catch(() => null);
        console.log('✅ Painel do canal #cargos atualizado.');
    } else {
        targetMsg = await channel.send({ embeds: [embed] }).catch(() => null);
        console.log('✅ Painel do canal #cargos enviado com sucesso.');
    }

    if (targetMsg) {
        fs.writeFileSync(ROLE_MESSAGE_FILE, JSON.stringify({
            messageId: targetMsg.id,
            channelId: channel.id
        }, null, 4));

        // Adiciona as reações de forma sequencial
        for (const item of ROLE_REACTIONS) {
            try {
                const reactionExists = targetMsg.reactions.cache.has(item.emoji) && 
                    targetMsg.reactions.cache.get(item.emoji).me;
                if (!reactionExists) {
                    await targetMsg.react(item.emoji);
                }
            } catch (e) {
                console.log(`⚠ Erro ao reagir com ${item.emoji}:`, e.message);
            }
        }
    }
}

module.exports = { sendOrUpdateRolesPanel };
