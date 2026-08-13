const Parser = require('rss-parser');
const { ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ids = require('../config/ids.json');
const { sendLog } = require('./logger');

const parser = new Parser();

const DATA_FILE = path.join(__dirname, '../data/publishedVideos.json');

let publishedGuids = new Set();

let lastCheckTime = null;
let lastCheckOk = true;
let lastFailedFeeds = [];

const NEWS_CHANNEL_ID = ids.channels.novidades;
const CHECK_INTERVAL = 10 * 60 * 1000;

const VIDEO_REACTIONS = ['🔥', '📺', '🙌'];

const feedsToWatch = [

    {
        name: 'Allyz',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZ37Px2cFB6uBzF9DElNS5Q'
    },

    {
        name: 'Tecnosh',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCTrbqPaNpw0Xax4tK_xZJjQ'
    },

    {
        name: 'Netenho',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCSTb9CXPkTlVAE0lhjhvxSg'
    },

    {
        name: 'Sparking',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCgSQCahlt5EY1anu-hVnPqw'
    },

    {
        name: 'ThugFaasT',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCFoexE0XChqIX0EcVhb2u-g'
    },

    {
        name: 'FROGMAN',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCN58xhbOBhmRPVlyW1noq-Q'
    }

];


function loadPublishedVideos() {

    try {

        if (!fs.existsSync(DATA_FILE)) {

            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify({ videos: [] }, null, 4)
            );

        }

        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, 'utf8')
        );

        publishedGuids = new Set(data.videos);

        console.log(`📂 ${publishedGuids.size} vídeos carregados do histórico.`);

    } catch (error) {

        console.log('⚠ Erro ao carregar histórico de vídeos.');
        console.log(error.message);

        publishedGuids = new Set();

    }

}


function savePublishedVideos() {

    try {

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(
                {
                    videos: [...publishedGuids]
                },
                null,
                4
            )
        );

    } catch (error) {

        console.log('⚠ Erro ao salvar histórico.');
        console.log(error.message);

    }

}


async function addReactions(sentMessage, emojis) {

    for (const emoji of emojis) {

        try {

            await sentMessage.react(emoji);

        } catch (error) {

            console.log(`⚠ Não foi possível reagir com ${emoji}`);
            console.log(error.message);

        }

    }

}


function extractVideoId(link) {

    try {

        const url = new URL(link);
        return url.searchParams.get('v');

    } catch (error) {

        return null;

    }

}


function buildVideoEmbed(feedInfo, item) {

    const videoId = extractVideoId(item.link);

    const thumbnailUrl = videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : null;

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(item.title)
        .setURL(item.link)
        .setAuthor({ name: `📺 ${feedInfo.name}` })
        .setDescription('🔥 Novo vídeo publicado!')
        .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date())
        .setFooter({ text: 'Bot Do A LAN • Alan Watcher' });

    if (thumbnailUrl) {
        embed.setImage(thumbnailUrl);
    }

    return embed;

}


function getWatcherStatus() {

    return {
        lastCheckTime,
        ok: lastCheckOk,
        failedFeeds: lastFailedFeeds,
        totalFeeds: feedsToWatch.length
    };

}


function startContentWatcher(client) {


    async function initializeWatcher() {


        console.log('🔄 Sincronizando Alan Watcher...');


        loadPublishedVideos();


        for (const feedInfo of feedsToWatch) {


            try {


                const feed = await parser.parseURL(feedInfo.url);


                if (feed.items.length > 0) {


                    const latest = feed.items[0];

                    const guid = latest.guid || latest.link;


                    if (!publishedGuids.has(guid)) {

                        publishedGuids.add(guid);

                    }


                }


                console.log(`✔ Sincronizado: ${feedInfo.name}`);


            } catch (err) {


                console.log(`⚠ Não foi possível sincronizar ${feedInfo.name}`);


            }


        }


        savePublishedVideos();


        console.log('\n🚀 Alan Watcher iniciado com sucesso!\n');


    }



    async function checkFeeds() {


        console.log('\n========================================');
        console.log('🤖 Alan Watcher iniciando verificação...');
        console.log('========================================');


        const channel = await client.channels.fetch(NEWS_CHANNEL_ID)
            .catch(() => null);



        if (!channel) {

            console.log('❌ Canal de novidades não encontrado.');

            await sendLog(client, {
                type: 'error',
                title: '🔴 Alan Watcher: canal de novidades não encontrado',
                description: 'Verifique se o ID em config/ids.json está correto.'
            });

            lastCheckTime = new Date();
            lastCheckOk = false;
            lastFailedFeeds = feedsToWatch.map(f => f.name);

            return;

        }


        console.log(`📢 Canal encontrado: ${channel.name}\n`);


        const failedFeeds = [];


        for (const feedInfo of feedsToWatch) {


            try {


                console.log(`🔍 Verificando ${feedInfo.name}...`);



                const feed = await parser.parseURL(feedInfo.url);



                if (!feed.items.length) {

                    console.log('⚠ Feed vazio.\n');
                    continue;

                }



                const latestItem = feed.items[0];

                const guid = latestItem.guid || latestItem.link;



                console.log(`📄 Último conteúdo: ${latestItem.title}`);



                if (!publishedGuids.has(guid)) {



                    publishedGuids.add(guid);

                    savePublishedVideos();



                    const embed = buildVideoEmbed(feedInfo, latestItem);



                    if (channel.type === ChannelType.GuildForum) {


                        const thread = await channel.threads.create({

                            name: latestItem.title.substring(0, 100),

                            message: {
                                content: '@everyone',
                                embeds: [embed],
                                allowedMentions: { parse: ['everyone'] }
                            }

                        });

                        const starterMessage = await thread.fetchStarterMessage().catch(() => null);

                        if (starterMessage) {
                            await addReactions(starterMessage, VIDEO_REACTIONS);
                        }


                    } else {


                        const sentMessage = await channel.send({
                            content: '@everyone',
                            embeds: [embed],
                            allowedMentions: { parse: ['everyone'] }
                        });

                        await addReactions(sentMessage, VIDEO_REACTIONS);


                    }



                    console.log('✅ NOVO VÍDEO PUBLICADO!\n');



                } else {


                    console.log('✔ Nenhuma novidade.\n');


                }



            } catch (err) {


                console.log(`❌ Erro em ${feedInfo.name}`);
                console.log(err.message);
                console.log('');

                failedFeeds.push(`**${feedInfo.name}**: ${err.message}`);


            }


        }


        if (failedFeeds.length > 0) {

            await sendLog(client, {
                type: 'error',
                title: `🔴 Alan Watcher: falha em ${failedFeeds.length} canal(is) do YouTube`,
                description: failedFeeds.join('\n')
            });

        }


        lastCheckTime = new Date();
        lastCheckOk = failedFeeds.length === 0;
        lastFailedFeeds = failedFeeds.map(f => f.split('**')[1]).filter(Boolean);


        console.log('🏁 Verificação finalizada.\n');


    }



    initializeWatcher()
        .then(() => {

            checkFeeds();

            setInterval(checkFeeds, CHECK_INTERVAL);

        });


}



module.exports = {
    startContentWatcher,
    feedsToWatch,
    buildVideoEmbed,
    getWatcherStatus,
    NEWS_CHANNEL_ID
};