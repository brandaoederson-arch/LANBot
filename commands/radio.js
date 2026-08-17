const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('radio')
        .setDescription('Comandos do sistema de Rádio Mundial 3D do LANBot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('Abre o link para o Dashboard Web 3D estilo Radio Garden')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('parar')
                .setDescription('Para a rádio e desconecta o bot do canal de voz')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'dashboard') {
            const host = process.env.RENDER_EXTERNAL_URL || process.env.SQUARECLOUD_URL || 'http://localhost:3000';
            
            const embed = new EmbedBuilder()
                .setTitle('🌍 LANBot Radio 3D — Rádios ao Vivo pelo Mundo')
                .setDescription(`Explore milhares de rádios ao vivo em um globo 3D interativo!\n\n🔗 **[Clique aqui para abrir o Dashboard Web](${host})**`)
                .setColor('#00f3ff')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3074/3074058.png')
                .setFooter({ text: 'SO NO TCHEREREU Clan Radio System' });

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'parar') {
            try {
                const { getVoiceConnection } = require('@discordjs/voice');
                const connection = getVoiceConnection(interaction.guild.id);

                if (connection) {
                    connection.destroy();
                    return interaction.reply({ content: '⏹ Transmissão da rádio interrompida e bot desconectado.', flags: [64] });
                } else {
                    return interaction.reply({ content: '⚠ O bot não está transmitindo em nenhum canal de voz neste momento.', flags: [64] });
                }
            } catch (err) {
                return interaction.reply({ content: 'Erro ao parar áudio: ' + err.message, flags: [64] });
            }
        }
    }
};
