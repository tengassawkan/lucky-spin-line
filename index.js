const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ใส่ Channel Access Token ของคุณตรงนี้
const CHANNEL_ACCESS_TOKEN = '';

// รางวัล
const prizes = [
  { text: '🎉 ชุดผ้าปู + ปลอกหมอน 6 ฟุค มูลค่า 790 -' },
  { text: '🎉 หมอนหนุน มูลค่า 250 - !' },
  { text: '🎉 หมอนข้าง มูลค่า 350 - !' }
];

// สถานะผู้ใช้รอกรอกชื่อ
const waitingForName = new Set();
// สถานะผู้ใช้รอยืนยันหมุน
const waitingForConfirm = new Set();
// เก็บชื่อผู้ใช้
const userNames = {};

// ฟังก์ชันสุ่มรางวัลแบบธรรมดา
function getRandomPrize() {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

// ฟังก์ชันส่งข้อความ reply
async function replyMessage(replyToken, messages) {
  await axios.post('https://api.line.me/v2/bot/message/reply', {
    replyToken,
    messages,
  }, {
    headers: {
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events) return res.sendStatus(400);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();

        // กรณีเริ่มเล่น พิมพ์ "ลุ้นรางวัล"
        if (text === 'ลุ้นรางวัล') {
          waitingForName.add(userId);
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: 'กรุณาพิมพ์ชื่อ - นามสกุลของคุณเพื่อเริ่มหมุนวงล้อครับ'
            }
          ]);
        }
        // กรณีรอชื่อ
        else if (waitingForName.has(userId)) {
          userNames[userId] = text;
          waitingForName.delete(userId);
          waitingForConfirm.add(userId);

          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text:
                `📌 ชื่อของคุณ: ${text}\n\n` +
                '📢 กติกาการเล่นกิจกรรมเสี่ยงโชค:\n' +
                '- หมุนได้คนละ 1 ครั้ง\n' +
                '- รางวัลจะทำการสุ่มตามระบบ\n' +
                '- หลังหมุนแล้วไม่สามารถเปลี่ยนรางวัลได้\n\n' +
                'พิมพ์ "ตกลง" เพื่อยืนยันและหมุนวงล้อ'
            }
          ]);
        }
        // กรณีรอยืนยัน "ตกลง"
        else if (text === 'ตกลง' && waitingForConfirm.has(userId)) {
          waitingForConfirm.delete(userId);

          // แจ้งกำลังหมุน
          await replyMessage(event.replyToken, [
            { type: 'text', text: '🎯 กำลังหมุนวงล้อ ...' }
          ]);

          // สุ่มรางวัลและตอบหลัง 3 วิ
          setTimeout(async () => {
            const prize = getRandomPrize();
            await axios.post('https://api.line.me/v2/bot/message/push', {
              to: userId,
              messages: [
                { type: 'text', text: `🎉 คุณได้รางวัล: ${prize.text}` }
              ]
            }, {
              headers: {
                Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            });
          }, 3000);
        }
        // กรณีข้อความอื่น ๆ
        else {
          await replyMessage(event.replyToken, [
            { type: 'text', text: 'พิมพ์ "ลุ้นรางวัล" เพื่อเริ่มหมุนวงล้อได้ครับ' }
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
