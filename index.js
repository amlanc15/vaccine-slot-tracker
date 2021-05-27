const dateFormat = require("dateformat");
const https = require("https");
const openUrl = require("openurl");
const util = require("util");
const fs = require("fs");
const TelegramBot = require('telegraf');

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
const pinCode = fileContent.pinCode;
let reqInterVal = fileContent.requestInterval;
const token = "1846168441:AAGN3xEBYVBgCWTehALyXUTdtPc1Sstsirg";

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot.Telegraf(token);
bot.launch();
const chatIds = [1888901255];

bot.on('text', (msg) => {
    // Explicit usage
    chatIds.push(msg.message.chat.id);
    getRequestedData(msg.message.text).then((resp) => {
        const availableMsg = parseCenters(JSON.parse(resp));
        const statusMsg = availableMsg && availableMsg.length > 0 ? `${constructTheUserReadAbleMsg(availableMsg, msg.message.text)}` : `Sorry ${msg.message.chat.first_name}!! No slots at ${msg.message.text} 😔😔`;
        msg.telegram.sendMessage(msg.message.chat.id, statusMsg);
    }).catch(() => {
        msg.telegram.sendMessage(msg.message.chat.id, `Sorry ${msg.message.chat.first_name} !! Failed to Get Details 😌😌`);
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
        parseResp(JSON.parse(resp), pinCode);
    } catch (error) {
        console.error("Some Error Occured. Skipping this iteration", error);
    }
}

async function delay(time) {
    return new Promise((resolve) => {
        setTimeout(() => {return resolve()}, reqInterVal*1000);
    });
} 

function parseResp(availableCenters, pinNo) {
    const availableMsgs = parseCenters(availableCenters);
    if (availableMsgs.length > 0) {
        console.log("Available Slots for", pinNo, " ->",availableMsgs.join("\n"));
        openUrl.open("https://selfregistration.cowin.gov.in");
        let constructMsg = constructTheUserReadAbleMsg(availableMsgs, pinNo);
        chatIds.forEach((chatId) => {
            bot.telegram.sendMessage(chatId, constructMsg);
        });
    } else {
        console.log("Sorry No Slots available in", pinNo, "at", new Date().toDateString(), new Date().toLocaleTimeString());
    }
}
function constructTheUserReadAbleMsg(availableMsgs, pin) {
    let constructMsg = `Hello Vaccines are available in following Locations for PinNo ${pin}.\n`;
    availableMsgs.forEach((msg, index) => {
        constructMsg = constructMsg + `     ${index + 1}. ${msg}. \n`;
    });
    return constructMsg;
}

function parseCenters(availableCenters) {
    const availableMsg = [];
    availableCenters.centers.forEach((availableCenter) => {
        availableCenter.sessions.forEach((session) => {
            if (session.available_capacity_dose1 > 0) {
                const msgDetails = `Hello in ${availableCenter.address} vaccines are available for minimum age limt ${session.min_age_limit}. ` +
                `Date -> ${session.date} || Total Available -> ${session.available_capacity} || ` +
                `Available for Dose 1 -> ${session.available_capacity_dose1} || Available for Dose 2 -> ${session.available_capacity_dose2}. Book ASAP`;
                availableMsg.push(msgDetails)
            }
        });
    });
    return availableMsg;
}
