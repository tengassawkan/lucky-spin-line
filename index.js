const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ใส่ Channel Access Token ของคุณตรงนี้
const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';

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
  console.log('Webhook event:', JSON.stringify(req.body, null, 2));

  try {
    const events = req.body.events;
    if (!events) return res.sendStatus(400);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();

        const hasSpun = userPrizes.hasOwnProperty(userId);

        if (text === 'ลุ้นรางวัล') {
          if (hasSpun) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
              replyToken: event.replyToken,
              messages: [
                { type: 'text', text: 'คุณหมุนรางวัลไปแล้วครับ ไม่สามารถหมุนซ้ำได้' },
                { type: 'text', text: buildWinnersText() }
              ]
            }, {
              headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
            });
          } else {
            waitingForConfirm.add(userId);
            await axios.post('https://api.line.me/v2/bot/message/reply', {
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
          const name = text.substring(5).trim();
          if (!name) {
            await axios.post('https://api.line.me/v2/bot/message/reply', {
              replyToken: event.replyToken,
              messages: [{ type: 'text', text: 'กรุณาพิมพ์ชื่อ - นามสกุลหลังคำว่า "ตกลง" ด้วยครับ เช่น ตกลง สมชาย ใจดี' }]
            }, {
              headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
            });
          } else {
            waitingForConfirm.delete(userId);
            if (userPrizes[userId]) {
              await axios.post('https://api.line.me/v2/bot/message/reply', {
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

              await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken: event.replyToken,
                messages: [{ type: 'text', text: '🎯 กำลังหมุนวงล้อ ...' }]
              }, {
                headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
              });

              setTimeout(async () => {
                await axios.post('https://api.line.me/v2/bot/message/push', {
                  to: userId,
                  messages: [
                    { type: 'text', text: `🎉 คุณได้รางวัล: ${prize.text}` },
                    {
                      type: 'image',
                      originalContentUrl: prize.image,
                      previewImageUrl: prize.image
                    },
                    { type: 'text', text: buildWinnersText() }
                  ]
                }, {
                  headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
                });
              }, 3000);
            }
          }
        } else {
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              { type: 'text', text: 'พิมพ์ "ลุ้นรางวัล" เพื่อเริ่มหมุนวงล้อได้ครับ' }
            ]
          }, {
            headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
          });
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
