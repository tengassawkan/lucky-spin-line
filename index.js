const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ใส่ Channel Access Token ของคุณตรงนี้
const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';

// รางวัลและน้ำหนักความน่าจะเป็น
const weightedPrizes = [
  { prize: { text: '🎉 ชุดผ้าปู + ปลอกหมอน 6 ฟุค มูลค่า 790 -', image: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTN6ZG0yMjk4bHZ1b3NpcDgwYnE2bmViNTlqZ2VwcDdiZmgyOGNsZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Wx0CKQMmqPMadG4VUs/giphy.gif' }, weight: 5 },
  { prize: { text: '🎉 หมอนหนุน มูลค่า 250 - !', image: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTN6ZG0yMjk4bHZ1b3NpcDgwYnE2bmViNTlqZ2VwcDdiZmgyOGNsZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Wx0CKQMmqPMadG4VUs/giphy.gif' }, weight: 5 },
  { prize: { text: '🎉 หมอนข้าง มูลค่า 350 - !', image: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTN6ZG0yMjk4bHZ1b3NpcDgwYnE2bmViNTlqZ2VwcDdiZmgyOGNsZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Wx0CKQMmqPMadG4VUs/giphy.gif' }, weight: 5 }
];

// ฟังก์ชันสุ่มรางวัลแบบ weighted
function getRandomPrize() {
  const totalWeight = weightedPrizes.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of weightedPrizes) {
    if (random < item.weight) {
      return item.prize;
    }
    random -= item.weight;
  }
}

// เก็บสถานะผู้ใช้ที่รอยืนยันการหมุน
const waitingForConfirm = new Set();

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events) return res.sendStatus(400);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();

        if (text === 'ลุ้นรางวัล') {
          waitingForConfirm.add(userId);

          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              {
                type: 'text',
                text: 
                  '📢 กติกาการเล่นกิจกรรมเสี่ยงโชค:\n' +
                  '- กรุณา พิมชื่อ - นามสกุล\n' +
                  '- ท่านต้องยืนยันก่อนทำการสุ่มรางวัล\n' +
                  '- หมุนได้ท่านละ 1 ครั้ง\n' +
                  '- รางวัลจะทำการสุ่มตามระบบ\n\n' +
                  'พิมพ์ "ตกลง" เพื่อหมุนวงล้อ'
              }
            ]
          }, {
            headers: {
              Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

        } else if (text === 'ตกลง' && waitingForConfirm.has(userId)) {
          waitingForConfirm.delete(userId);
          const prize = getRandomPrize();

          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              { type: 'text', text: '🎯 กำลังหมุนวงล้อ ...' }
            ]
          }, {
            headers: {
              Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
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
                }
              ]
            }, {
              headers: {
                Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            });
          }, 3000);

        } else {
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              { type: 'text', text: 'พิมพ์ "ลุ้นรางวัล" เพื่อเริ่มหมุนวงล้อได้ครับ' }
            ]
          }, {
            headers: {
              Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
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
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
