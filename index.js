const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';

// รางวัล
const prizes = [
  { text: '🎉 ส่วนลด 50%', image: 'https://i.imgur.com/discount.png' },
  { text: '☕ ฟรีกาแฟ 1 แก้ว', image: 'https://i.imgur.com/coffee.png' },
  { text: '🍪 ขนมฟรี 1 ชิ้น', image: 'https://i.imgur.com/snack.png' }
];

// เก็บสถานะผู้ใช้แบบง่าย ๆ (ถ้าอยากใช้ DB ให้เปลี่ยนตรงนี้)
const waitingForConfirm = new Set();

function getRandomPrize() {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;
    if (!events) return res.sendStatus(400);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();

        if (text === 'ลุ้นรางวัล') {
          // ส่งกติกา + ขอ confirm
          waitingForConfirm.add(userId);

          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              {
                type: 'text',
                text:
                  '📢 กติกาการหมุนวงล้อ:\n' +
                  '- ผู้เล่นต้องยืนยันก่อนหมุน\n' +
                  '- รางวัลจะสุ่มแจก\n' +
                  '- 1 คนหมุนได้ครั้งละ 1 รางวัล\n\n' +
                  'ถ้าต้องการหมุนต่อ กรุณาพิมพ์ "ตกลง" เพื่อหมุนวงล้อ'
              }
            ]
          }, {
            headers: {
              Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
        } 
        else if (text === 'ตกลง' && waitingForConfirm.has(userId)) {
          // ลบสถานะ confirm ของ user
          waitingForConfirm.delete(userId);

          const prize = getRandomPrize();

          // ส่งข้อความ "กำลังหมุนวงล้อ..."
          await axios.post('https://api.line.me/v2/bot/message.reply', {
            replyToken: event.replyToken,
            messages: [
              { type: 'text', text: '🎯 กำลังหมุนวงล้อ...' }
            ]
          }, {
            headers: {
              Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          // รอ 3 วินาที แล้วส่งรางวัล (push message)
          setTimeout(async () => {
            await axios.post('https://api.line.me/v2/bot/message/push', {
              to: userId,
              messages: [
                { type: 'text', text: `🎉 คุณได้: ${prize.text}` },
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
        }
        else {
          // กรณีข้อความอื่น ๆ
          await axios.post('https://api.line.me/v2/bot/message.reply', {
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
    console.error('Error in webhook:', error.response ? error.response.data : error.message);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
