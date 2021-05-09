const dateFormat = require("dateformat");
const https = require("https");
const openUrl = require("openurl");
const util = require("util");
const fs = require("fs");
const TelegramBot = require('node-telegram-bot-api');

console.log("========================== Welcome to Vaccine Slot Tracker ==========================");
console.log("==== Developed By -> Amlan Chakrabarty || Email -> Amlan.Chakrabarty15@gmail.com ====");
console.log("========== For Best Result Please provide your area pin in Input.JSON file ===========")

function readInputFile() {
    let fileInput = null;
    try {
        fileInput = JSON.parse(fs.readFileSync("input.json").toString());
    } catch (error) {
        console.error("Error while reading inputFile", error);
    }
    return fileInput;
}
const fileContent = readInputFile();
const pinCode = fileContent && fileContent.pinCode ? fileContent.pinCode : 722155;
let reqInterVal = fileContent && fileContent.requestInterval ? fileContent.requestInterval : 15;
const token = fileContent.telegramBotToken;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
let chatId = null;

bot.on('message', (msg) => {
    chatId = msg.chat.id;
    // console.log("Msg ->", msg.text);
  
    getRequestedData(msg.text).then((resp) => {
        // console.log("Resp ->", resp);
        const availableCenters = parseCenters(JSON.parse(resp));
        const statusMsg = availableCenters && availableCenters.length > 0 ? `Slots available in ${msg.text}` : `Sorry No slots at ${msg.text}`;
        bot.sendMessage(chatId, statusMsg);
    }).catch(() => {
        bot.sendMessage(chatId, 'Fail to get details');
    });
    // send a message to the chat acknowledging receipt of their message
   
  });

if (reqInterVal < 6) {
    console.log("Request Interval Should be above 6. Using 7 as request interval");
    reqInterVal = 7;
}

const url = "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=%s&date=%s";

startQuering();

function getRequestedData(pin) {
    const date = dateFormat(new Date(), "dd-mm-yyyy");
    const actualURL = util.format(url, pin, date);
    return new Promise((resolve, reject) => {
        https.get(actualURL, (res) => {          
            res.on('data', (d) => {
                // console.log("Data ->", d.toString());
                return resolve(d.toString());
            });
          
          }).on('error', (e) => {
            console.error(e);
          });
    });
}

async function startQuering() {
    await getVaccineInfo();
    await delay();
    startQuering();
}

async function getVaccineInfo() {
    try {
        const resp = await getRequestedData(pinCode);
        parseResp(JSON.parse(resp));
    } catch (error) {
        console.error("Some Error Occured. Skipping this iteration", error);
    }
}

async function delay(time) {
    return new Promise((resolve) => {
        setTimeout(() => {return resolve()}, reqInterVal*1000);
    });
} 

function parseResp(availableCenters) {
    const availableArray = parseCenters(availableCenters);
    if (availableArray.length > 0) {
        console.log("Available Slots->", availableArray);
        openUrl.open("https://selfregistration.cowin.gov.in/");
        bot.sendMessage(1888901255, `Slot Details -> ${JSON.stringify(availableArray)}`);
    } else {
        console.log("Sorry No Slots available in", pinCode, "at", new Date().toDateString(), new Date().toLocaleTimeString());
    }
}
function parseCenters(availableCenters) {
    const availableArray = [];
    availableCenters.centers.forEach((availableCenter) => {
        availableCenter.sessions.forEach((session) => {
            if (session.available_capacity > 0) {
                const availableObj = {
                    available_capacity: session.available_capacity,
                    date: session.date,
                    minAgeLimit: session.min_age_limit,
                    vaccineType: session.vaccine,
                    place: availableCenter.name
                };
                availableArray.push(availableObj);
            }
        });
    });
    return availableArray;
}
