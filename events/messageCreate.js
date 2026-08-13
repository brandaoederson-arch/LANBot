const ids = require('../config/ids.json');

module.exports = {
    name: 'messageCreate',

    async execute(message) {

        console.log('📩 Mensagem recebida');

        if (message.author.bot) return;

        const SETUP_CHANNEL_ID = ids.channels.setup;
        const SETUP_ROLE_ID = ids.roles.perfilVerificado;

        console.log('Canal atual:', message.channel.id);
        console.log('Canal esperado:', SETUP_CHANNEL_ID);

        if (message.channel.id !== SETUP_CHANNEL_ID) {
            console.log('❌ Não é o canal setup');
            return;
        }

        console.log('✅ Entrou no canal setup');

        try {
            const member = await message.guild.members.fetch(message.author.id);

            console.log('Usuário:', member.user.tag);
            console.log('Possui cargo?', member.roles.cache.has(SETUP_ROLE_ID));

            await member.roles.add(SETUP_ROLE_ID);

            console.log('✅ Cargo adicionado');

            await message.reply(
                '🎉 Setup registrado com sucesso! Você recebeu o cargo **Setup Registrado**.'
            );

        } catch (error) {
            console.error('❌ ERRO:', error);
        }
    }
};