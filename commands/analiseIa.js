const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const clanConfig = require('../config/pubgClan.json');
const discordLinks = require('../config/pubgDiscordLinks.json');
const { calculateAdvancedPerformanceData } = require('../services/pubgPerformanceData');
const { generateIndividualPlayerAiAnalysis } = require('../services/pubgAiAnalyst');

const LAST_RANKING_FILE = path.join(__dirname, '../data/pubgLastRanking.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('analise-ia')
        .setDescription('Gera uma análise tática individual da IA para um membro do clã no PUBG.')
        .addStringOption(option =>
            option
                .setName('jogador')
                .setDescription('Selecione o membro do clã para analisar')
                .setRequired(true)
                .addChoices(
                    ...clanConfig.members.map(name => ({ name, value: name }))
                )
        ),

    async execute(interaction) {
        const jogadorEscolhido = interaction.options.getString('jogador');

        try {
            await interaction.deferReply().catch(() => null);

            if (!fs.existsSync(LAST_RANKING_FILE)) {
                return interaction.editReply('⚠ O ranking ainda não foi calculado nenhuma vez. Aguarde a próxima atualização ou use /forcar-ranking-pubg.');
            }

            const { players } = JSON.parse(fs.readFileSync(LAST_RANKING_FILE, 'utf8'));
            const performanceData = calculateAdvancedPerformanceData(players);

            if (!performanceData) {
                return interaction.editReply('⚠ Erro ao calcular dados avançados de performance.');
            }

            const targetPlayer = performanceData.players.find(p => p.name.toLowerCase() === jogadorEscolhido.toLowerCase());

            if (!targetPlayer) {
                return interaction.editReply(`⚠ **${jogadorEscolhido}** ainda não possui partidas registradas na temporada atual.`);
            }

            const reportText = await generateIndividualPlayerAiAnalysis(targetPlayer, performanceData.clanMetrics);

            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle(`🤖 ANÁLISE TÁTICA INDIVIDUAL DA IA • ${targetPlayer.name.toUpperCase()}`)
                .setDescription(reportText)
                .setFooter({ text: 'Departamento de Performance de Esports • Clã SO NO TCHEREREU' })
                .setTimestamp();

            const discordId = discordLinks[targetPlayer.name];
            if (discordId) {
                const member = await interaction.guild.members.fetch(discordId).catch(() => null);
                if (member) {
                    embed.setThumbnail(member.displayAvatarURL({ size: 256 }));
                }
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Erro no comando /analise-ia:', error);
            await interaction.editReply({ content: `❌ Erro ao gerar análise da IA: ${error.message}` }).catch(() => null);
        }
    },
};
