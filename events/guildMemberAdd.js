const { EmbedBuilder, Events } = require('discord.js');
const ids = require('../config/ids.json');
const { sendLog } = require('../services/logger');

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member) {
        console.log(`👋 Novo membro entrou: ${member.user.tag}`);

        try {
            const channel = await member.guild.channels.fetch(ids.channels.boasVindas).catch(() => null);

            if (channel) {
                const welcomeText = 
                    `# 👋 Seja muito bem-vindo(a), <@${member.user.id}>!\n\n` +
                    `Aqui reunimos jogadores apaixonados por games, além de um espaço para conversar.\n\n` +
                    `## 🚀 Primeiros passos\n\n` +
                    `🎭 Escolha seus cargos em <#${ids.channels.cargos}>\n\n` +
                    `📜 Confira os avisos e regras do servidor\n\n` +
                    `🏆 Confira o ranking da comunidade em <#${ids.channels.rankingPubg}>\n\n` +
                    `💻 Compartilhe seu SETUP em <#${ids.channels.setup}>\n\n` +
                    `---\n\n` +
                    `## 🎮 O que você encontra por aqui?\n\n` +
                    `🏆 Ranking automático dos jogadores\n\n` +
                    `🎥 Clipes gerados pelo PUBG.Report\n\n` +
                    `📰 Notícias oficiais e análises da comunidade\n\n` +
                    `🎁 Jogos gratuitos e promoções\n\n` +
                    `🖥️ Espaço para compartilhar seu setup\n\n` +
                    `🎙️ Canais de voz para formar squads\n\n` +
                    `---\n\n` +
                    `Respeite os demais membros, divirta-se e bom jogo! 🪂`;

                await channel.send({
                    content: welcomeText
                });
            } else {
                console.log('❌ Canal de boas-vindas não encontrado.');
            }

            if (ids.roles.visitante) {
                await member.roles.add(ids.roles.visitante).catch(() => null);
                console.log(`✅ Cargo Visitante atribuído a ${member.user.tag}`);
            }
        } catch (error) {
            console.error('❌ Erro ao processar novo membro:', error);
            await sendLog(member.client, {
                type: 'error',
                title: '🔴 Falha ao processar novo membro',
                description: `Usuário: ${member.user.tag}\nErro: ${error.message}`
            });
        }
    },
};