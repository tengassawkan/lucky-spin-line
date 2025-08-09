const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ใส่ Channel Access Token ของคุณตรงนี้
const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';

// รางวัลและรูปภาพประกอบ (แก้ไข URL รูปได้ตามต้องการ)
const prizes = [
  { text: '🎉 โซฟาปรับนอน Recliner มูลค่า 8,900 -!', image: 'https://i.imgur.com/discount.png' },
  { text: '🎉 ชุดผ้าปู + ปลอกหมอน 6 ฟุค มูลค่า 790 -', image: 'https://i.imgur.com/coffee.png' },
  { text: '🎉 หมอนหนุน มูลค่า 250 - !', image: 'https://i.imgur.com/snack.png' },
  { text: '🎉 หมอนข้าง มูลค่า 350 - !', image: '/Users/tengeiei/lucky-spin-line/Photo/1.jpg' }
];

// เก็บสถานะผู้ใช้ที่รอยืนยันการหมุน
const waitingForConfirm = new Set();

// ฟังก์ชันสุ่มรางวัล
function getRandomPrize() {
  return prizes[Math.floor(Math.random() * prizes.length)];
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

        if (text === 'ลุ้นรางวัล') {
          waitingForConfirm.add(userId);

          // ส่งข้อความกติกาและขอ confirm
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

          // ส่งข้อความกำลังหมุน (reply)
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

          // รอ 3 วินาทีแล้วส่งรางวัล (push)
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
          // กรณีข้อความอื่น ๆ
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
