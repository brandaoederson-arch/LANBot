const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const ids = require('../config/ids.json');
const { calculateSetupVersusScore } = require('./versusScore');

const SETUPS_FILE = path.join(__dirname, '../data/memberSetups.json');
const TEMP_SETUPS = new Map(); // Armazena temporariamente a Etapa 1

function loadSetups() {
    try {
        if (!fs.existsSync(SETUPS_FILE)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(SETUPS_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveSetup(userId, username, cpuObj, gpuObj, ramObj, monitorObj, mouseObj, kbdObj, headsetObj, averageScore) {
    const setups = loadSetups();
    setups[userId] = {
        username,
        cpu: cpuObj,
        gpu: gpuObj,
        ram: ramObj,
        monitor: monitorObj,
        mouse: mouseObj,
        teclado: kbdObj,
        headset: headsetObj,
        averageScore,
        updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(SETUPS_FILE, JSON.stringify(setups, null, 4));
}

function generateBar(value, max = 100, length = 8) {
    const ratio = Math.min(value / max, 1);
    const filled = Math.round(ratio * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

async function sendOrUpdateSetupPanel(client) {
    const channelId = ids.channels.setup;
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    // 1. Atualiza/Posta o Ranking de Setups no TOPO do canal
    await updateSetupsRankingEmbed(client, channel);

    // 2. Atualiza/Posta o Painel com o Botão de Cadastro no FINAL do canal (junto à caixa de escrita)
    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existing = messages?.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('CADASTRO DE SETUP DA COMUNIDADE'));

    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('💻 CADASTRO DE SETUP DA COMUNIDADE (VERSUS.COM)')
        .setDescription('🚀 **Bem-vindo ao canal de Setup do Clã!**\n\nPreencha os modelos dos seus componentes para o bot pesquisar na base de dados global do **Versus.com**, extrair a **Pontuação Oficial da sua Maquinaria** e incluir você no Ranking do Servidor!\n\n*(Busca em tempo real de qualquer modelo do mundo)*')
        .addFields(
            { name: '📋 Peças Analisadas no Versus.com (7 Itens)', value: '• 💻 **CPU:** Processador\n• 🎮 **GPU:** Placa de Vídeo\n• ⚡ **RAM:** Memória RAM\n• 🖥️ **Monitor:** Monitor\n• 🖱️ **Mouse:** Mouse Gamer\n• ⌨️ **Teclado:** Teclado Gamer\n• 🎧 **Headset:** Fone / Headset' }
        )
        .setFooter({ text: 'Clã SO NO TCHEREREU • Pontuação de Hardware Versus.com' });

    const btn = new ButtonBuilder()
        .setCustomId('btn_cadastrar_setup_step1')
        .setLabel('💻 Cadastrar Meu Setup (Etapa 1/2)')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(btn);

    if (existing) {
        await existing.edit({ embeds: [embed], components: [row] }).catch(() => null);
    } else {
        await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
    }
}

async function updateSetupsRankingEmbed(client, channel) {
    const setups = loadSetups();
    const list = Object.entries(setups)
        .map(([id, item]) => ({ userId: id, ...item }))
        .filter(item => item.averageScore)
        .sort((a, b) => b.averageScore - a.averageScore);

    if (list.length === 0) return;

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    const existingRanking = messages?.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('RANKING DOS SETUPS'));

    const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('🏆 RANKING DOS MAIORES SETUPS DO CLÃ (VERSUS.COM)')
        .setDescription('⚡ **Pontuação Média de Performance do Hardware**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\u200B')
        .setTimestamp();

    list.slice(0, 10).forEach((item, index) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || `${index + 1}º`;
        const bar = generateBar(item.averageScore, 100, 8);
        const name = item.username || `Membro`;

        embed.addFields({
            name: `${medal}  ${name}  —  ${item.averageScore} Pts`,
            value: `\`${bar}\`  •  <@${item.userId}>\n💻 **CPU:** ${item.cpu.name} \`[${item.cpu.score} pts]\` \n🎮 **GPU:** ${item.gpu.name} \`[${item.gpu.score} pts]\` \n\u200B`,
            inline: false
        });
    });

    if (existingRanking) {
        await existingRanking.edit({ embeds: [embed] }).catch(() => null);
    } else {
        await channel.send({ embeds: [embed] }).catch(() => null);
    }
}

// ETAPA 1: Abre o Modal de Hardware Principal (CPU, GPU, RAM, Monitor)
async function handleSetupButtonClick(interaction) {
    try {
        if (interaction.customId === 'btn_cadastrar_setup_step2') {
            return await handleStep2ButtonClick(interaction);
        }

        const modal = new ModalBuilder()
            .setCustomId('modal_setup_step1')
            .setTitle('💻 Etapa 1/2: Maquinaria Principal');

        const cpuInput = new TextInputBuilder()
            .setCustomId('setup_cpu')
            .setLabel('💻 CPU:')
            .setPlaceholder('Ex: AMD Ryzen 5 7600 ou i7 13700K')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const gpuInput = new TextInputBuilder()
            .setCustomId('setup_gpu')
            .setLabel('🎮 GPU:')
            .setPlaceholder('Ex: RTX 4060 Ti ou RX 6750 XT')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const ramInput = new TextInputBuilder()
            .setCustomId('setup_ram')
            .setLabel('⚡ RAM:')
            .setPlaceholder('Ex: Kingston Fury DDR5-5600 32GB')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const monitorInput = new TextInputBuilder()
            .setCustomId('setup_monitor')
            .setLabel('🖥️ Monitor:')
            .setPlaceholder('Ex: LG UltraGear 24GS60F-B')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(cpuInput),
            new ActionRowBuilder().addComponents(gpuInput),
            new ActionRowBuilder().addComponents(ramInput),
            new ActionRowBuilder().addComponents(monitorInput)
        );

        await interaction.showModal(modal);
    } catch (e) {
        console.log('⚠ Erro ao abrir modal etapa 1:', e.message);
    }
}

// ETAPA 2: Abre o Modal de Periféricos (Mouse, Teclado, Headset)
async function handleStep2ButtonClick(interaction) {
    try {
        const modal = new ModalBuilder()
            .setCustomId('modal_setup_step2')
            .setTitle('🖱️ Etapa 2/2: Periféricos Gamer');

        const mouseInput = new TextInputBuilder()
            .setCustomId('setup_mouse')
            .setLabel('🖱️ Mouse:')
            .setPlaceholder('Ex: Redragon M711 Cobra ou G Pro Superlight')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const kbdInput = new TextInputBuilder()
            .setCustomId('setup_teclado')
            .setLabel('⌨️ Teclado:')
            .setPlaceholder('Ex: Redragon Kumara K552 ou Wooting 60HE')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const headsetInput = new TextInputBuilder()
            .setCustomId('setup_headset')
            .setLabel('🎧 Headset:')
            .setPlaceholder('Ex: JBL Quantum 610 ou HyperX Cloud II')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(mouseInput),
            new ActionRowBuilder().addComponents(kbdInput),
            new ActionRowBuilder().addComponents(headsetInput)
        );

        await interaction.showModal(modal);
    } catch (e) {
        console.log('⚠ Erro ao abrir modal etapa 2:', e.message);
    }
}

// Processa envio do Modal Etapa 1 e convida para a Etapa 2
async function handleSetupModalSubmit(interaction) {
    try {
        const userId = interaction.user.id;

        if (interaction.customId === 'modal_setup_step1') {
            const cpu = interaction.fields.getTextInputValue('setup_cpu');
            const gpu = interaction.fields.getTextInputValue('setup_gpu');
            const ram = interaction.fields.getTextInputValue('setup_ram');
            const monitor = interaction.fields.getTextInputValue('setup_monitor');

            TEMP_SETUPS.set(userId, { cpu, gpu, ram, monitor });

            const btnStep2 = new ButtonBuilder()
                .setCustomId('btn_cadastrar_setup_step2')
                .setLabel('🖱️ Preencher Periféricos (Mouse, Teclado e Headset)')
                .setStyle(ButtonStyle.Success);

            await interaction.reply({
                content: `✅ **Maquinaria Principal cadastrada!**\n💻 CPU: \`${cpu}\` | 🎮 GPU: \`${gpu}\` | ⚡ RAM: \`${ram}\` | 🖥️ Monitor: \`${monitor}\`\n\nClique no botão abaixo para concluir a **Etapa 2/2 (Periféricos)**:`,
                components: [new ActionRowBuilder().addComponents(btnStep2)],
                flags: [64] // Ephemeral
            });
            return;
        }

        if (interaction.customId === 'modal_setup_step2') {
            await interaction.deferReply({ flags: [64] });

            const temp = TEMP_SETUPS.get(userId) || { cpu: 'Ryzen 5 5600', gpu: 'RTX 3060', ram: '16GB DDR4', monitor: 'Monitor 144Hz' };
            const mouse = interaction.fields.getTextInputValue('setup_mouse');
            const teclado = interaction.fields.getTextInputValue('setup_teclado');
            const headset = interaction.fields.getTextInputValue('setup_headset');

            const rawData = {
                cpu: temp.cpu,
                gpu: temp.gpu,
                ram: temp.ram,
                monitor: temp.monitor,
                mouse,
                teclado,
                headset
            };

            // Pesquisa em tempo real na API do Versus.com
            const scoreData = await calculateSetupVersusScore(rawData);

            saveSetup(
                userId,
                interaction.user.username,
                scoreData.cpu,
                scoreData.gpu,
                scoreData.ram,
                scoreData.monitor,
                scoreData.mouse,
                scoreData.teclado,
                scoreData.headset,
                scoreData.averageScore
            );

            TEMP_SETUPS.delete(userId);

            // Atribui cargo se existir
            if (interaction.member && ids.roles.visitante) {
                await interaction.member.roles.add(ids.roles.visitante).catch(() => null);
            }

            const channelId = ids.channels.setup;
            const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

            if (channel) {
                const bar = generateBar(scoreData.averageScore, 100, 10);

                const cardEmbed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setAuthor({
                        name: `💻 MAQUINARIA & SETUP DE ${interaction.user.username.toUpperCase()}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', forceStatic: false, size: 256 }))
                    .setDescription(`⭐ **PONTUAÇÃO MÉDIA VERSUS.COM:** \`${scoreData.averageScore} Pts\`\n\`${bar}\`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
                    .addFields(
                        { name: '💻 CPU:', value: `${scoreData.cpu.name}\n\`[${scoreData.cpu.score} Pts no Versus]\``, inline: true },
                        { name: '🎮 GPU:', value: `${scoreData.gpu.name}\n\`[${scoreData.gpu.score} Pts no Versus]\``, inline: true },
                        { name: '⚡ RAM:', value: `${scoreData.ram.name}\n\`[${scoreData.ram.score} Pts no Versus]\``, inline: true },
                        { name: '🖥️ Monitor:', value: `${scoreData.monitor.name}\n\`[${scoreData.monitor.score} Pts no Versus]\``, inline: true },
                        { name: '🖱️ Mouse:', value: `${scoreData.mouse.name}\n\`[${scoreData.mouse.score} Pts no Versus]\``, inline: true },
                        { name: '⌨️ Teclado:', value: `${scoreData.teclado.name}\n\`[${scoreData.teclado.score} Pts no Versus]\``, inline: true },
                        { name: '🎧 Headset:', value: `${scoreData.headset.name}\n\`[${scoreData.headset.score} Pts no Versus]\``, inline: true }
                    )
                    .setTimestamp();

                await channel.send({ embeds: [cardEmbed] });
                await sendOrUpdateSetupPanel(interaction.client);
            }

            await interaction.editReply({
                content: `🎉 **Setup completo registrado no Versus.com com sucesso, <@${userId}>!**\n\n⭐ **Sua Maquinaria atingiu ${scoreData.averageScore} Pontos!**\n✅ Os demais canais do servidor e o canal de **#cargos** foram liberados para você. Seja muito bem-vindo!`
            });
        }
    } catch (e) {
        console.log('⚠ Erro ao processar formulário do Versus:', e.message);
    }
}

module.exports = {
    sendOrUpdateSetupPanel,
    handleSetupButtonClick,
    handleSetupModalSubmit
};
