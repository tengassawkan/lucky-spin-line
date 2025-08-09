const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ใส่ Channel Access Token ของคุณตรงนี้
const CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN';

// รางวัลและรูปภาพประกอบ (แก้ URL ตามต้องการ)
const prizes = [
  { text: '🎉 ส่วนลด 50 บาท !', image: 'https://i.imgur.com/discount.png' },
  { text: '☕ ฟรีเครื่องดื่ม 1 แก้ว', image: 'https://i.imgur.com/coffee.png' },
  { text: '🎉 ส่วนลด 80 บาท !', image: 'https://i.imgur.com/snack.png' },
  { text: '🎉 ส่วนลด 100 บาท !', image: 'https://i.imgur.com/snack.png' }
];

// เก็บสถานะผู้ใช้ที่รอยืนยันการหมุน
const waitingForConfirm = new Set();

// เก็บข้อมูลผู้ใช้ที่ได้รางวัล { userId: { prize, name } }
const userPrizes = {};

// ฟังก์ชันสุ่มรางวัล
function getRandomPrize() {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

// สร้างข้อความรายชื่อผู้ได้รางวัลแบบข้อความ
function buildWinnersText() {
  if (Object.keys(userPrizes).length === 0) {
    return 'ยังไม่มีผู้ได้รางวัลนะครับ';
  }
  let text = '🎊 รายชื่อผู้โชคดีที่ได้รางวัล:\n';
  let i = 1;
  for (const [userId, info] of Object.entries(userPrizes)) {
    text += `${i}. ${info.name || userId} — ${info.prize}\n`;
    i++;
  }
  return text;
}

// webhook รับ event จาก LINE
app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events) return res.sendStatus(400);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();

        // ถ้ายังไม่เคยหมุน
        const hasSpun = userPrizes.hasOwnProperty(userId);

        if (text === 'ลุ้นรางวัล') {
          if (hasSpun) {
            // เคยหมุนแล้ว แจ้งไปเลย
            await axios.post('https://api.line.me/v2/bot/message.reply', {
              replyToken: event.replyToken,
              messages: [
                { type: 'text', text: 'คุณหมุนรางวัลไปแล้วครับ ไม่สามารถหมุนซ้ำได้' },
                { type: 'text', text: buildWinnersText() }
              ]
            }, {
              headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
            });
          } else {
            // รอ confirm หมุน
            waitingForConfirm.add(userId);
            await axios.post('https://api.line.me/v2/bot/message.reply', {
              replyToken: event.replyToken,
              messages: [
                {
                  type: 'text',
                  text: 
                    '📢 กติกาการเล่นกิจกรรมเสี่ยงโชค:\n' +
                    '- กรุณาพิมพ์ชื่อ - นามสกุลของคุณ\n' +
                    '- ต้องยืนยันก่อนหมุน\n' +
                    '- หมุนได้คนละ 1 ครั้ง\n' +
                    '- รางวัลจะสุ่มแจก\n\n' +
                    'พิมพ์ "ตกลง ชื่อ-นามสกุล" เพื่อยืนยันและหมุนวงล้อ'
                }
              ]
            }, {
              headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
            });
          }

        } else if (text.startsWith('ตกลง') && waitingForConfirm.has(userId)) {
          // ดึงชื่อจากข้อความ "ตกลง ชื่อ-นามสกุล"
          const name = text.substring(5).trim();
          if (!name) {
            // ถ้าไม่ใส่ชื่อ แจ้งกลับ
            await axios.post('https://api.line.me/v2/bot/message.reply', {
              replyToken: event.replyToken,
              messages: [{ type: 'text', text: 'กรุณาพิมพ์ชื่อ - นามสกุลหลังคำว่า "ตกลง" ด้วยครับ เช่น ตกลง สมชาย ใจดี' }]
            }, {
              headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
            });
          } else {
            // ลบสถานะรอ confirm
            waitingForConfirm.delete(userId);
            if (userPrizes[userId]) {
              // เคยหมุนแล้ว
              await axios.post('https://api.line.me/v2/bot/message.reply', {
                replyToken: event.replyToken,
                messages: [
                  { type: 'text', text: 'คุณหมุนรางวัลไปแล้วครับ ไม่สามารถหมุนซ้ำได้' },
                  { type: 'text', text: buildWinnersText() }
                ]
              }, {
                headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
              });
            } else {
              const prize = getRandomPrize();
              userPrizes[userId] = { prize: prize.text, name };

              // ส่งข้อความกำลังหมุน
              await axios.post('https://api.line.me/v2/bot/message.reply', {
                replyToken: event.replyToken,
                messages: [{ type: 'text', text: '🎯 กำลังหมุนวงล้อ ...' }]
              }, {
                headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
              });

              // รอ 3 วินาทีแล้วส่งรางวัลพร้อมรายชื่อผู้โชคดี (push)
