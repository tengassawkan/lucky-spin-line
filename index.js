const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';

// เก็บสถานะของผู้ใช้
const spunUsers = new Map(); // userId -> { spun: true/false, waitingConfirm: true/false }

// รางวัล
const prizes = [
  { text: '🎉 ส่วนลด 50%', image: 'https://i.imgur.com/discount.png' },
  { text: '☕ ฟรีกาแฟ 1 แก้ว', image: 'https://i.imgur.com/coffee.png' },
  { text: '🍪 ขนมฟรี 1 ชิ้น', image: 'https://i.imgur.com/snack.png' }
];

function getRandomPrize() {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  if (!events) return res.sendStatus(400);

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const text = event.message.text.trim();

      const userState = spunUsers.get(userId) || { spun: false, waitingConfirm: false };

      // กรณีเริ่มหมุน
      if (text === 'ลุ้นรางวัล') {
        if (userState.spun) {
          await replyMessage(event.replyToken, [
            { type: 'text', text: 'คุณหมุนรางวัลไปแล้ววันนี้ 🎯 ลองใหม่พรุ่งนี้นะครับ' }
          ]);
        } else {
          // รอการยืนยัน
          userState.waitingConfirm = true;
          spunUsers.set(userId, userState);
          await replyMessage(event.replyToken, [
            { type: 'text', text: 'คุณต้องการหมุนวงล้อใช่หรือไม่? พิมพ์ "ยืนยัน" เพื่อหมุน หรือ "ยกเลิก" เพื่อออก' }
          ]);
        }
      }

      // กรณียืนยันหมุน
      else if (text === 'ยืนยัน') {
        if (userState.waitingConfirm && !userState.spun) {
          const prize = getRandomPrize();
          userState.spun = true;
          userState.waitingConfirm = false;
          spunUsers.set(userId, userState);
          await replyMessage(event.replyToken, [
            { type: 'text', text: `🎉 คุณได้รางวัล: ${prize.text}` },
            { type: 'image', originalContentUrl: prize.image, previewImageUrl: prize.image }
          ]);
        } else {
          await replyMessage(event.replyToken, [
            { type: 'text', text: 'คุณยังไม่ได้เริ่มคำสั่งหมุนรางวัล พิมพ์ "ลุ้นรางวัล" ก่อนครับ' }
          ]);
        }
      }

      // กรณียกเลิก
      else if (text === 'ยกเลิก') {
        if (userState.waitingConfirm) {
          userState.waitingConfirm = false;
          spunUsers.set(userId, userState);
          await replyMessage(event.replyToken, [
            { type: 'text', text: '❌ ยกเลิกการหมุนแล้ว' }
          ]);
        } else {
          await replyMessage(event.replyToken, [
            { type: 'text', text: 'ไม่มีการหมุนที่รออยู่' }
          ]);
        }
      }

      // ข้อความอื่น
      else {
        await replyMessage(event.replyToken, [
          { type: 'text', text: 'พิมพ์ "ลุ้นรางวัล" เพื่อเริ่มหมุนวงล้อ' }
        ]);
      }
    }
  }

  res.sendStatus(200);
});

async function replyMessage(replyToken, messages) {
  return axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken,
    messages
  }, {
    headers: {
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
