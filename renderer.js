// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

let templates = {};
let selectedDate = new Date();
const dst = 2;
let running = false;
let nextMessage;
let lastMessages = [];


const updateURL = 'https://api.telegram.org/bot' + CONFIG.token + '/getUpdates';
const sendURL = 'https://api.telegram.org/bot' + CONFIG.token + '/sendMessage';


function addTemplate() {
    let template = document.getElementById('template');
    if (!templates[getType()]) {
        templates[getType()] = [];
    }
    templates[getType()].push(template.value);
    template.value = '';
    render();
    saveTemplates();
    return false;
}

function init() {
    running = localStorage.getItem('running') ? true : false;
    nextMessage = JSON.parse(localStorage.getItem('nextMessage'));
    loadTemplates();
    loadTime();
    updateTime();
    loadLastMessages();
    render();
    setInterval(sendRemainingMessages, 20000);
}

async function loadLastMessages() {
    let resp = await fetch(updateURL);
    lastMessages = (await resp.json())['result'];
    renderLastMessages();
}

function renderLastMessages() {
    let card = document.getElementById('last-messages');
    card.innerHTML = '';

    lastMessages.reverse().forEach((messageInfo, i) => {
        let msg = messageInfo['message'];
        console.log('message:', msg);
        card.innerHTML += `<div><span onclick="targetUser(${i})">${msg['from']['first_name']}</span>: <i>${msg['text']}</i></div>`;
    });
}


function targetUser(i) {
    localStorage.setItem('target', JSON.stringify(lastMessages[i]['message']));
}

function getTargetUser() {
    return JSON.parse(localStorage.getItem('target'));
}

async function sendRemainingMessages() {
    console.log('Shoud i send a message?');

    if (new Date().getTime() > (selectedDate.getTime() - (1000 * 60 * 60 * dst))) {
        console.log('Yes!!!');
        let target = getTargetUser();
        if (target) {
            console.log('Sending message to: ', target['chat']['id']);
            console.log(nextMessage['text']);

            try {
                await sendMessage(target['chat']['id'], nextMessage['text']);
                setDateToTomorrow();
                render();
            } catch (e) {
                console.error('Error sending message', e);
            }

        } else {
            console.log('No target User is selected!!');
        }
        // nextMessage;
        // selectedDate;
    } else {
        console.log('Not yet');
    }
}

function setDateToTomorrow() {
    const tomorrow = new Date().getDate() + 1;
    const tomorrowDate = new Date(nextMessage['date']);
    tomorrowDate.setDate(tomorrow);
    nextMessage['date'] = tomorrowDate.toISOString();
    localStorage.setItem('nextMessage', JSON.stringify(nextMessage));
    selectedDate = tomorrowDate;
    localStorage.setItem('selectedDate', tomorrowDate.toISOString());

}

async function sendMessage(chatId, text) {
    const url = sendURL + '?chat_id=' + chatId + "&text=" + text;
    const resp = await fetch(url, {
        method: 'POST'
    });

    let jsonResp = (await resp.json());
    console.log(jsonResp);
}

function start() {
    localStorage.setItem('running', true);
    running = true;
    let nextMessageIndex = Math.floor(Math.random() * templates[1].length);
    nextMessage = {
        text: templates[1][nextMessageIndex],
        date: selectedDate.toISOString()
    };
    localStorage.setItem('nextMessage', JSON.stringify(nextMessage));
    render();
    saveTime();
}

function renderMessageBox() {
    document.getElementById('next-message').style = running ? 'display: flex;' : 'display:none;';

    if (nextMessage) {
        let day = selectedDate.getDate();
        let month = ('0' + selectedDate.getMonth()).slice(-2);
        let year = selectedDate.getFullYear();
        let hour = selectedDate.getHours() - dst;
        let minutes = ('0' + selectedDate.getMinutes()).slice(-2);
        document.getElementById('scheduled-message').innerHTML = `
            ${day}.${month}.${year}, ${hour}:${minutes} - <i>${nextMessage.text}</i> <a href="javascript:;">Abbrechen</a>
        `;
    }
}

function saveTime() {
    let date = document.getElementById('date');
    let time = document.getElementById('time');

    let timeParts = time.value.split(':');
    selectedDate = new Date(date.value);
    selectedDate.setHours(+timeParts[0] + dst);
    selectedDate.setMinutes(timeParts[1]);

    localStorage.setItem('selectedDate', selectedDate.toISOString());
    loadTime();
}

function loadTime() {
    selectedDate = new Date(localStorage.getItem('selectedDate') || new Date());
}

function updateTime() {
    let date = document.getElementById('date');
    let time = document.getElementById('time');

    let day = ("0" + selectedDate.getDate()).slice(-2);
    let month = ("0" + (selectedDate.getMonth() + 1)).slice(-2);

    date.value = selectedDate.getFullYear() + "-" + (month) + "-" + (day);
    time.value = selectedDate.toISOString().substring(11, 16);
}



function render() {
    renderTemplates(1);
    renderTemplates(2);
    renderMessageBox();
}

function renderTemplates(type) {
    let templateList = document.getElementById('templateList' + type);
    templateList.innerHTML = '';

    let tList = templates[type] || [];
    for (let i = 0; i < tList.length; i++) {
        const template = tList[i];
        templateList.innerHTML += listItem(type, i);
    }
}

function deleteTemplate(type, index) {
    templates[type].splice(index, 1);
    saveTemplates();
    render();
}



function listItem(type, index) {
    let template = templates[type][index];
    return `
    <div class="mdl-list__item">
    <span class="mdl-list__item-primary-content">

<i class="material-icons mdl-list__item-avatar">mail</i>
<span>${template}</span>
    </span>
    <span class="mdl-list__item-secondary-content">
<a class="mdl-list__item-secondary-action" href="#" onclick="deleteTemplate(${type}, ${index})"><i class="material-icons">delete</i></a>
</span>
</div>
`;
}

function saveTemplates() {
    localStorage.setItem('templates', JSON.stringify(templates))
}

function loadTemplates() {
    templates = JSON.parse(localStorage.getItem('templates')) || {};
}

function getType() {
    return +document.getElementById('type').value;
}