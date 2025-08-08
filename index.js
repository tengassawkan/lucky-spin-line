const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ใส่ Channel Access Token ของคุณตรงนี้
const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';

// รายการรางวัล
const prizes = [
  { text: '🎉 ส่วนลด 50%', image: 'https://i.imgur.com/discount.png' },
  { text: '☕ ฟรีกาแฟ 1 แก้ว', image: 'https://i.imgur.com/coffee.png' },
  { text: '🍪 ขนมฟรี 1 ชิ้น', image: 'https://i.imgur.com/snack.png' }
];

// URL GIF วงล้อหมุน
const spinningGif = 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWltY3YyOGduajd5aHl6cTZ3cmdudjBqZzlzbTBpc3ZxbXV1NmY0byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/IOQSeZmdDRSu7J5Xcr/giphy.gif';


function getRandomPrize() {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

app.post('/webhook', async (req, res) => {
  try {
    const events = req.body.events;

    if (!events) return res.sendStatus(400);

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        if (event.message.text === 'ลุ้นรางวัล') {
          const prize = getRandomPrize();

          // ส่งข้อความตอบกลับ "กำลังหมุนวงล้อ" + GIF
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              { type: 'text', text: '🎯 กำลังหมุนวงล้อ...' },
              {
                type: 'image',
                originalContentUrl: spinningGif,
                previewImageUrl: spinningGif
              }
            ]
          }, {
            headers: {
              Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          // รอ 3 วินาที แล้วส่งข้อความแจ้งผลรางวัล (push message)
          setTimeout(async () => {
            await axios.post('https://api.line.me/v2/bot/message/push', {
              to: event.source.userId,
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
