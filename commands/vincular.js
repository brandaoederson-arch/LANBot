const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const clanConfig = require('../config/pubgClan.json');
const ids = require('../config/ids.json');

const LINKS_FILE = path.join(__dirname, '../config/pubgDiscordLinks.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vincular')
        .setDescription('Vincule sua conta do Discord ao seu Nick no PUBG para aparecer no ranking e receber cargos.')
        .addStringOption(option =>
            option
                .setName('jogador')
                .setDescription('Seu Nick exato no PUBG')
                .setRequired(true)
                .addChoices(
                    ...clanConfig.members.map(name => ({ name, value: name }))
                )
        ),

    async execute(interaction) {
        try {
            const nickEscolhido = interaction.options.getString('jogador');
            const discordUserId = interaction.user.id;

            let links = {};
            if (fs.existsSync(LINKS_FILE)) {
                links = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
            }

            links[nickEscolhido] = discordUserId;
            fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 4));

            // Concede o cargo de Perfil Verificado
            if (interaction.member && ids.roles.perfilVerificado) {
                await interaction.member.roles.add(ids.roles.perfilVerificado).catch(() => null);
            }

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('✅ Conta Vinculada com Sucesso!')
                .setDescription(`Sua conta do Discord (<@${discordUserId}>) foi vinculada ao jogador **${nickEscolhido}** no PUBG!`)
                .addFields(
                    { name: '🏆 Ranking', value: 'Seu perfil e foto agora aparecerão nos cards do Ranking do Clã e comandos `/perfil`.', inline: false }
                )
                .setFooter({ text: 'Clã SO NO TCHEREREU • Sistema de Vínculo PUBG' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Erro no comando /vincular:', error);
            await interaction.reply({ content: `❌ Erro ao vincular conta: ${error.message}`, ephemeral: true }).catch(() => null);
        }
    },
};
