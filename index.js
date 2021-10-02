const TelegramBot = require('node-telegram-bot-api');
const storage = require('node-persist');
const schedule = require('node-schedule');
const escape = require('markdown-escape')

// replace the value below with the Telegram token you receive from @BotFather
const token = 'INSERT_TOKEN_HERE';                                              // TODO before deployment
const BOT_USERNAME = 'INSERT_BOT_NAME_HERE_WITHOUT_@_SYMBOL';                   // TODO before deployment

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

const startPollJob = schedule.scheduleJob('42 0 18 * * 0', function () {
    sendBurgerPoll();
});
const reminderJob = schedule.scheduleJob('30 0 12 * * 2', function () {
    sendReminder();
});
const stopPollJob = schedule.scheduleJob('40 0 13 * * 2', function () {
    stopBurgerPoll();
});
const BURGER_CREW_CHAT_ID = 'burgerCrewChatId';
const BURGER_MSG_ID = 'burgerMsgId';
const BURGER_POLL_MSG_ID = 'burgerPollMsgId';
const TIME_POLL_MSG_ID = 'timePollMsgId';
const BURGER_ARR = 'burgerArr';
async function initStorage() {
    //you must first call storage.init
    await storage.init( /* options ... */);

    if ((!!await storage.getItem(BURGER_ARR)) === false) {
        // default burger
        burgerArr = [
            '[REDACTED](https://REDACTED)',                                     // TODO before deployment
            '[REDACTED](https://REDACTED)',                                     // TODO before deployment
            '[REDACTED](https://REDACTED)',                                     // TODO before deployment
            '[REDACTED](https://REDACTED)',                                     // TODO before deployment
            null, null, null, null];
        await storage.setItem(BURGER_ARR, burgerArr);
    }

    console.log(await storage.getItem('teststorage')); // yourname
}

initStorage();
// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp);

});

// Listen for any kind of message. There are different kinds of
// messages.
async function sendBurgerPoll() {
    const chatId = await storage.getItem(BURGER_CREW_CHAT_ID);

    const pollOpts = {
        'is_anonymous': false,
        'allows_multiple_answers': true
    };

    burgerArr = await storage.getItem(BURGER_ARR);

    let burgerMessage = await bot.sendMessage(chatId, generateBurgerMsg(burgerArr),
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );

    let burgerPoll = await bot.sendPoll(chatId, 'Burger', [
        'Option 1',
        'Option 2',
        'Option 3',
        'Option 4',
        'Option 5',
        'Option 6',
        'Option 7',
        'Option 8'
    ], pollOpts)

    // send a message to the chat acknowledging receipt of their message
    let timePoll = await bot.sendPoll(chatId, 'Zeit', [
        '17:30',
        '18:00',
        '18:30',
        '19:00',
        '19:30',
        'Kann leider nicht',
        'Komme vllt., macht ihr mal ne Zeit aus.'
    ], pollOpts)

    await storage.setItem(BURGER_MSG_ID, burgerMessage.message_id)
    await storage.setItem(BURGER_POLL_MSG_ID, burgerPoll.message_id)
    await storage.setItem(TIME_POLL_MSG_ID, timePoll.message_id)
};

bot.on('message', async (msg) => {
    // Check if bot was added to a group the first time, then save the id
    if (!!msg.new_chat_members && msg.new_chat_member.username === BOT_USERNAME) {
        if ((!! await storage.getItem(BURGER_CREW_CHAT_ID)) === false) {
            // only store id if this is the first time, the bot is added
            await storage.setItem(BURGER_CREW_CHAT_ID, msg.chat.id)
        }
    }

    if (!!msg.reply_to_message
        && (await storage.getItem(BURGER_MSG_ID)) === msg.reply_to_message.message_id) {
        let burgerArr = await storage.getItem(BURGER_ARR);

        let emptyBurgerIndex = burgerArr.findIndex((burger) => burger == null);

        // if there is still an empty space
        if (emptyBurgerIndex >= 0) {
            let burgerStoreName = escape(msg.text);

            if (burgerStoreName.length > 60) {
                burgerStoreName = burgerStoreName.substring(0,55) + '...';
            }

            if (burgerStoreName === undefined) {
                burgerStoreName = null;
            }

            let burger;
            if (!!msg.entities && (0 in msg.entities) && !!msg.entities[0].url) {
                burger = `[${burgerStoreName}](${msg.entities[0].url})`
            } else {
                burger = burgerStoreName
            }

            burgerArr[emptyBurgerIndex] = burger;
            await storage.setItem(BURGER_ARR, burgerArr);

            bot.editMessageText(generateBurgerMsg(burgerArr),
                {
                    chat_id: await storage.getItem(BURGER_CREW_CHAT_ID),
                    message_id: await storage.getItem(BURGER_MSG_ID),
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                })
        }
    }
});

async function stopBurgerPoll() {
    let burgerPollResult = (await bot.stopPoll(
        await storage.getItem(BURGER_CREW_CHAT_ID),
        await storage.getItem(BURGER_POLL_MSG_ID)
    )).options;
    let timePollResult = (await bot.stopPoll(
        await storage.getItem(BURGER_CREW_CHAT_ID),
        await storage.getItem(TIME_POLL_MSG_ID)
    )).options;
    let burgerArr = await storage.getItem(BURGER_ARR);

    burgerPollResult = burgerPollResult.map(option => {
        return {
            voter_count: option.voter_count,
            text: burgerArr[option.text.substr(option.text.length - 1) - 1]
        }
    });
    burgerPollResult = sortByVoterCount(burgerPollResult);
    burgerPollResult.reverse();
    burgerPollResult = burgerPollResult.filter(option => option['text'] !== null);
    let burgerPollResultFirstPlaces = burgerPollResult
        .filter(option => option['voter_count'] == burgerPollResult[0]['voter_count']);
    const burgerPollWinner = burgerPollResultFirstPlaces[Math.floor(Math.random() * burgerPollResultFirstPlaces.length)];

    timePollResult = sortByVoterCount(timePollResult);
    timePollResult.reverse();
    timePollResult = timePollResult.filter(option => option['text'].startsWith('1')); // is a time
    if (timePollResult.length > 0) {
        timePollResult = timePollResult.filter(option => option['voter_count'] == timePollResult[0]['voter_count']);
    }
    const timePollWinner = timePollResult[Math.floor(Math.random() * timePollResult.length)];

    if (timePollWinner !== undefined && burgerPollWinner !== undefined) {
        bot.sendMessage(await storage.getItem(BURGER_CREW_CHAT_ID),
            `Na dann bis um ${timePollWinner.text} bei ${burgerPollWinner.text}.`,
            { parse_mode: 'Markdown', disable_web_page_preview: true });
    }

    burgerPollResult = burgerPollResult.filter(option => option.text != burgerPollWinner.text);
    burgerArr = [null, null, null, null, null, null, null, null];
    burgerArr[0] = (0 in burgerPollResult) ? burgerPollResult[0].text : null;
    burgerArr[1] = (1 in burgerPollResult) ? burgerPollResult[1].text : null;
    burgerArr[2] = (2 in burgerPollResult) ? burgerPollResult[2].text : null;
    burgerArr[3] = (3 in burgerPollResult) ? burgerPollResult[3].text : null;

    await storage.setItem(BURGER_ARR, burgerArr)
}

async function sendReminder() {
    bot.sendMessage(await storage.getItem(BURGER_CREW_CHAT_ID),
        `Letzte Stunde zum Abstimmen.`)
}

function generateBurgerMsg(burgerArr) {
    return `_Um die leeren Optionen zu füllen, antworte einfach auf diese Nachricht. Am besten markierst du deinen Burgerladen vor dem Absenden im Chat und machst über die drei Punkte einen Google-Maps-Link daraus._
    
Diese Woche stehen zur Auswahl:
Option 1: ${burgerArr[0]}
Option 2: ${burgerArr[1]}
Option 3: ${burgerArr[2]}
Option 4: ${burgerArr[3]}
Option 5: ${burgerArr[4]}
Option 6: ${burgerArr[5]}
Option 7: ${burgerArr[6]}
Option 8: ${burgerArr[7]}`
}

// ascending
function sortByVoterCount(array, key) {
    return array.sort(function (a, b) {
        var x = a['voter_count']; var y = b['voter_count'];
        let returnValue = ((x < y) ? -1 : ((x > y) ? 1 : 0));
        return returnValue;
    });
}

process.on('uncaughtException', function(error) {
    //look Ma, I died
    console.log(error);
 });