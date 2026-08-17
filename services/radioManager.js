const fs = require('fs');
const path = require('path');
const https = require('https');
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder 
} = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    getVoiceConnection 
} = require('@discordjs/voice');
const ids = require('../config/ids.json');

const RADIO_MESSAGE_FILE = path.join(__dirname, '../data/radioMessage.json');

// Lista Curada de Rádios com URLs de Streaming confiáveis
const RADIO_STATIONS = [
    { label: '🇧🇷 Jovem Pan FM', value: 'https://8549.live.streamtheworld.com/JP_SP_FMAAC_SC', description: 'Pop, Rock, Notícias & Entretenimento' },
    { label: '🇧🇷 Rádio Gaúcha', value: 'https://stream.rbs.com.br/hls/gaucha_poa/gaucha_poa.m3u8', description: 'Notícias & Esportes ao vivo' },
    { label: '🇧🇷 Alpha FM 101.7', value: 'https://26483.live.streamtheworld.com/ALPHAFM_SC', description: 'Música leve, Pop Internacional & Flashbacks' },
    { label: '⚡ Synthwave & Retrowave 24/7', value: 'http://stream.zeno.fm/f3wvbbqmdg8uv', description: 'Músicas no estilo Cyberpunk & Anos 80' },
    { label: '☕ Lo-Fi Chill Beats', value: 'http://stream.zeno.fm/f3wvbbqmdg8uv', description: 'Batidas relaxantes para jogar e focar' },
    { label: '🎸 Rock & Metal Classics', value: 'http://stream.zeno.fm/w4b5vsn47d0uv', description: 'Clássicos do Rock mundial' },
    { label: '🎮 Gamer & Anime Tracks', value: 'http://stream.zeno.fm/0r0xa792kwzuv', description: 'Trilhas sonoras de jogos e animes' },
    { label: '🎷 Smooth Jazz Global', value: 'http://stream.zeno.fm/b4v5vsn47d0uv', description: 'Jazz leve e agradável de fundo' },
    { label: '🎲 Surpreenda-me!', value: 'random', description: 'Sintoniza uma rádio aleatória pelo mundo' }
];

let activeAudioPlayer = null;
let activeChannelId = null;

/**
 * Envia ou atualiza o Painel de Controle de Rádio Fixo no canal #radio
 */
async function sendOrUpdateRadioPanel(client) {
    const channelId = ids.channels.radio || '1538919631434022953';
    
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
        console.log(`⚠ Canal de rádio (${channelId}) não encontrado.`);
        return;
    }

    let savedData = {};
    if (fs.existsSync(RADIO_MESSAGE_FILE)) {
        try {
            savedData = JSON.parse(fs.readFileSync(RADIO_MESSAGE_FILE, 'utf8'));
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
        existingMsg = recentMessages?.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('CENTRAL DE RÁDIOS AO VIVO'));
    }

    // Construção do Embed Principal
    const embed = new EmbedBuilder()
        .setColor(0x00F3FF)
        .setTitle('📻 CENTRAL DE RÁDIOS AO VIVO • CLÃ SO NO TCHEREREU')
        .setDescription(
            'Sintonize estações de rádio ao vivo do mundo inteiro diretamente nos canais de voz do clã!\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '### 🎧 Como Ouvir no Canal de Voz:\n' +
            '1️⃣ Entre em qualquer **Canal de Voz** do servidor (ex: *Geral, PUBG 1, etc*).\n' +
            '2️⃣ Escolha uma rádio na **lista suspensa** abaixo ou clique em um dos **botões rápidos**.\n' +
            '3️⃣ O bot vai entrar na sua sala e transmitir a rádio ao vivo para todo mundo!\n' +
            '4️⃣ Clique em ⏹️ **Parar Áudio** a qualquer momento para desligar a rádio.\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            `📌 **Status:** ${activeChannelId ? `🎶 Transmitindo rádio no canal <#${activeChannelId}>` : '🟢 Pronto para transmitir (Nenhum canal ativo no momento)'}`
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3074/3074058.png')
        .setFooter({ text: 'SO NO TCHEREREU Clan • Sistema de Rádio Interativo sem Comandos' })
        .setTimestamp();

    // Select Menu Dropdown
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('radio_select_station')
        .setPlaceholder('📻 Selecione uma Rádio para tocar no seu canal de voz...')
        .addOptions(
            RADIO_STATIONS.map(s => ({
                label: s.label,
                value: s.value,
                description: s.description
            }))
        );

    const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

    // Buttons Row
    const rowButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('radio_btn_random')
            .setLabel('Surpreenda-me')
            .setEmoji('🎲')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('radio_btn_lofi')
            .setLabel('Lo-Fi Chill')
            .setEmoji('☕')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('radio_btn_synth')
            .setLabel('Synthwave')
            .setEmoji('⚡')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('radio_btn_brasil')
            .setLabel('Rádio Brasil')
            .setEmoji('🇧🇷')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('radio_btn_stop')
            .setLabel('Parar Áudio')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger)
    );

    let targetMsg;
    if (existingMsg) {
        targetMsg = await existingMsg.edit({ embeds: [embed], components: [rowSelect, rowButtons] }).catch(() => null);
        console.log('✅ Painel interativo do canal #radio atualizado.');
    } else {
        targetMsg = await channel.send({ embeds: [embed], components: [rowSelect, rowButtons] }).catch(() => null);
        console.log('✅ Painel interativo enviado com sucesso no canal #radio.');
    }

    if (targetMsg) {
        // Garantia do diretório data/
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        fs.writeFileSync(RADIO_MESSAGE_FILE, JSON.stringify({
            messageId: targetMsg.id,
            channelId: channel.id
        }, null, 4));
    }
}

/**
 * Trata interações de botões e select menus do painel #radio
 */
async function handleRadioInteraction(interaction, client) {
    const voiceChannel = interaction.member?.voice?.channel;

    // Se clicar em Parar
    if (interaction.customId === 'radio_btn_stop') {
        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
            if (activeAudioPlayer) activeAudioPlayer.stop();
            connection.destroy();
            activeChannelId = null;
            sendOrUpdateRadioPanel(client);
            return interaction.reply({ content: '⏹ Transmissão da rádio encerrada.', ephemeral: true });
        } else {
            return interaction.reply({ content: '⚠ Nenhuma rádio está tocando no momento.', ephemeral: true });
        }
    }

    // Verifica se o membro está em um canal de voz
    if (!voiceChannel) {
        return interaction.reply({
            content: '⚠ **Você precisa estar conectado em um canal de voz** (ex: *Geral, PUBG, etc*) para tocar a rádio! Entre em um canal e clique novamente.',
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    let stationUrl = '';
    let stationName = '';

    if (interaction.isStringSelectMenu()) {
        const selected = interaction.values[0];
        if (selected === 'random') {
            const randomObj = getRandomStation();
            stationUrl = randomObj.url;
            stationName = randomObj.name;
        } else {
            stationUrl = selected;
            const stationObj = RADIO_STATIONS.find(s => s.value === selected);
            stationName = stationObj ? stationObj.label : 'Rádio Selecionada';
        }
    } else if (interaction.isButton()) {
        switch (interaction.customId) {
            case 'radio_btn_random':
                const randomObj = getRandomStation();
                stationUrl = randomObj.url;
                stationName = randomObj.name;
                break;
            case 'radio_btn_lofi':
                stationUrl = 'http://stream.zeno.fm/f3wvbbqmdg8uv';
                stationName = '☕ Lo-Fi Chill Beats';
                break;
            case 'radio_btn_synth':
                stationUrl = 'http://stream.zeno.fm/f3wvbbqmdg8uv';
                stationName = '⚡ Synthwave 24/7';
                break;
            case 'radio_btn_brasil':
                stationUrl = 'https://8549.live.streamtheworld.com/JP_SP_FMAAC_SC';
                stationName = '🇧🇷 Jovem Pan FM Brasil';
                break;
        }
    }

    try {
        // Conecta ao canal de voz do membro
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        // Cria áudio resource
        const resource = createAudioResource(stationUrl, { inlineVolume: true });
        if (resource.volume) resource.volume.setVolume(0.8);

        if (!activeAudioPlayer) {
            activeAudioPlayer = createAudioPlayer();
            activeAudioPlayer.on('error', err => console.log('⚠ [Audio Player Error]:', err.message));
        }

        activeAudioPlayer.play(resource);
        connection.subscribe(activeAudioPlayer);
        activeChannelId = voiceChannel.id;

        // Atualiza status do painel fixo
        sendOrUpdateRadioPanel(client);

        return interaction.editReply({
            content: `📡 Transmitindo **${stationName}** no seu canal de voz <#${voiceChannel.id}>! Aproveite o som com a galera! 🎧`
        });
    } catch (err) {
        console.error('⚠ Erro ao tocar rádio no canal de voz:', err);
        return interaction.editReply({
            content: '❌ Ocorreu um erro ao conectar no canal de voz: ' + err.message
        });
    }
}

function getRandomStation() {
    const fallbackList = [
        { name: '🎲 Rádio Tóquio Anime', url: 'http://stream.zeno.fm/5m0xa792kwzuv' },
        { name: '🎲 Rádio Rock Clássico', url: 'http://stream.zeno.fm/w4b5vsn47d0uv' },
        { name: '🎲 Rádio Paris Chanson', url: 'http://stream.zeno.fm/b4v5vsn47d0uv' },
        { name: '🎲 Rádio Brasil FM', url: 'https://8549.live.streamtheworld.com/JP_SP_FMAAC_SC' }
    ];
    return fallbackList[Math.floor(Math.random() * fallbackList.length)];
}

module.exports = {
    sendOrUpdateRadioPanel,
    handleRadioInteraction
};
