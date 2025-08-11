const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ใส่ Channel Access Token ของคุณตรงนี้
const CHANNEL_ACCESS_TOKEN = 'mEViaFJkpE5dnTgBCAbm6C5JzTgmtXy6a61N7YuC2J9SO1MxfhSfDiLN2NBsWFVg8tYw9yClgDfAufC2RnNR+JgiKc4pKUbcTKSSMhCWxKlCXKONCtp6oysq98g2bWa6YaGZe8IdH3jDlmzRRoSVGAdB04t89/1O/w1cDnyilFU=';

// รางวัลและน้ำหนักความน่าจะเป็น
const weightedPrizes = [
  { prize: { text: '🎉 ชุดผ้าปู + ปลอกหมอน 6 ฟุต มูลค่า 790.-' }, weight: 1 },
  { prize: { text: '🎉 หมอนหนุน มูลค่า 250.-' }, weight: 1 },
  { prize: { text: '🎉 หมอนข้าง มูลค่า 350.-' }, weight: 1 }
];

// ฟังก์ชันสุ่มรางวัลแบบ weighted
function getRandomPrize() {
  const totalWeight = weightedPrizes.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of weightedPrizes) {
    if (random < item.weight) return item.prize;
    random -= item.weight;
  }
}

// เก็บสถานะผู้ใช้
const waitingForName = new Set();       // คนที่รอพิมพ์ชื่อ
const waitingForConfirm = new Set();    // คนที่รอยืนยันหมุน
const alreadyPlayed = new Set();        // คนที่เคยหมุนแล้ว
const userNames = {};                   // userId -> ชื่อ-นามสกุล

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events) return res.sendStatus(400);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();

        // เริ่มลุ้นรางวัล
        if (text === 'ลุ้นรางวัล') {
          if (alreadyPlayed.has(userId)) {
            await replyMessage(event.replyToken, [
              { type: 'text', text: '❌ คุณได้หมุนไปแล้ว ไม่สามารถหมุนซ้ำได้' }
            ]);
            continue;
          }
          waitingForName.add(userId);
          await replyMessage(event.replyToken, [
            { type: 'text', text: 'กรุณาพิมพ์ "ชื่อ-นามสกุล" ของคุณเพื่อยืนยันตัวตน' }
          ]);

        // รับชื่อ
        } else if (waitingForName.has(userId)) {
          userNames[userId] = text;
          waitingForName.delete(userId);
          waitingForConfirm.add(userId);
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text:
                `📌 ชื่อของคุณ: ${text}\n` +
                'พิมพ์ "ตกลง" เพื่อยืนยันและหมุนวงล้อ'
            }
          ]);

        // ยืนยันหมุน
        } else if (text === 'ตกลง' && waitingForConfirm.has(userId)) {
          waitingForConfirm.delete(userId);
          alreadyPlayed.add(userId);

          const prize = getRandomPrize();

          await replyMessage(event.replyToken, [
            { type: 'text', text: '🎯 กำลังหมุนวงล้อ ...' }
          ]);

          setTimeout(async () => {
            await pushMessage(userId, [
              { type: 'text', text: `🎉 คุณ ${userNames[userId]} ได้รางวัล: ${prize.text}` }
            ]);
          }, 3000);

        // ข้อความอื่น
        } else {
          await replyMessage(event.replyToken, [
            { type: 'text', text: 'พิมพ์ "ลุ้นรางวัล" เพื่อเริ่มหมุนวงล้อ' }
          ]);
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error in webhook:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ฟังก์ชันส่งข้อความตอบกลับ
async function replyMessage(replyToken, messages) {
  await axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken,
    messages
  }, {
    headers: {
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

// ฟังก์ชันส่ง push message
async function pushMessage(to, messages) {
  await axios.post('https://api.line.me/v2/bot/message/push', {
    to,
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
