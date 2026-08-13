const ids = require('../config/ids.json');
const discordLinks = require('../config/pubgDiscordLinks.json');
const { sendLog } = require('./logger');

const ROLE_ASSIGNMENTS = [
    {
        roleId: ids.roles.predadorClã,
        label: 'Predador do Clã',
        getWinner: rankedPlayers => rankedPlayers[0]
    },
    {
        roleId: ids.roles.mvpTemporada,
        label: 'MVP da Temporada',
        getWinner: rankedPlayers => rankedPlayers[0]
    },
    {
        roleId: ids.roles.atiradorElite,
        label: 'Atirador de Elite',
        getWinner: rankedPlayers => [...rankedPlayers].sort((a, b) => a.miraRank - b.miraRank)[0]
    },
    {
        roleId: ids.roles.veterano,
        label: 'Veterano',
        getWinner: rankedPlayers => [...rankedPlayers].sort((a, b) => a.sobrevivenciaRank - b.sobrevivenciaRank)[0]
    },
    {
        roleId: ids.roles.anjoGuarda,
        label: 'Anjo da Guarda',
        getWinner: rankedPlayers => [...rankedPlayers].sort((a, b) => a.companheiroRank - b.companheiroRank)[0]
    }
];


async function updatePubgRoles(guild, rankedPlayers) {

    console.log('\n========================================');
    console.log('🎖️ Atualizando cargos automáticos do ranking...');
    console.log('========================================');

    await guild.members.fetch().catch(() => null);

    for (const assignment of ROLE_ASSIGNMENTS) {

        try {

            const winner = assignment.getWinner(rankedPlayers);

            const role = await guild.roles.fetch(assignment.roleId).catch(() => null);

            if (!role) {
                console.log(`❌ Cargo "${assignment.label}" não encontrado (ID inválido em config/ids.json).`);
                continue;
            }

            const winnerDiscordId = discordLinks[winner.name];

            for (const [memberId, member] of role.members) {

                if (memberId !== winnerDiscordId) {

                    await member.roles.remove(role).catch(() => null);
                    console.log(`➖ Cargo "${assignment.label}" removido de ${member.user.tag}`);

                }

            }

            if (!winnerDiscordId) {

                console.log(`⚠ ${winner.name} venceu "${assignment.label}" mas não tem Discord vinculado.`);

                await sendLog(guild.client, {
                    type: 'warning',
                    title: `⚠ Cargo "${assignment.label}" não atribuído`,
                    description: `${winner.name} venceu esse ranking, mas não tem conta do Discord vinculada em config/pubgDiscordLinks.json.`
                });

                continue;

            }

            const member = await guild.members.fetch(winnerDiscordId).catch(() => null);

            if (!member) {

                console.log(`⚠ Membro do Discord de ${winner.name} não encontrado no servidor.`);
                continue;

            }

            if (!member.roles.cache.has(role.id)) {

                await member.roles.add(role);
                console.log(`✅ Cargo "${assignment.label}" atribuído a ${winner.name} (${member.user.tag})`);

            } else {

                console.log(`✔ ${winner.name} já possui o cargo "${assignment.label}".`);

            }

        } catch (error) {

            console.log(`❌ Erro ao atualizar cargo "${assignment.label}": ${error.message}`);

        }

    }

    console.log('🏁 Atualização de cargos finalizada.\n');

}


module.exports = { updatePubgRoles };