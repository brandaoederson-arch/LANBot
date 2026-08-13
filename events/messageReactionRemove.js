const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { ROLE_REACTIONS } = require('../services/roleReactions');

const ROLE_MESSAGE_FILE = path.join(__dirname, '../data/roleMessage.json');

module.exports = {
    name: Events.MessageReactionRemove,

    async execute(reaction, user) {

        if (user.bot) return;

        try {

            if (!fs.existsSync(ROLE_MESSAGE_FILE)) return;

            const { messageId } = JSON.parse(fs.readFileSync(ROLE_MESSAGE_FILE, 'utf8'));

            if (reaction.partial) await reaction.fetch().catch(() => null);

            if (reaction.message.id !== messageId) return;

            const match = ROLE_REACTIONS.find(r => r.emoji === reaction.emoji.name);

            if (!match) return;

            const member = await reaction.message.guild.members.fetch(user.id);

            await member.roles.remove(match.roleId);

            console.log(`➖ Cargo ${match.label} removido de ${user.tag}`);

        } catch (error) {

            console.error('❌ Erro ao remover cargo por reação:', error);

        }

    },
};