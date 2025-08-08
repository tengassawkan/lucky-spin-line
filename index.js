const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// แทนที่ด้วย Channel Access Token ของคุณ
const CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN';

const prizes = [
  { text: '🎉 ส่วนลด 50%', image: 'https://i.imgur.com/discount.png' },
  { text: '☕ ฟรีกาแฟ 1 แก้ว', image: 'https://i.imgur.com/coffee.png' },
  { text: '🍪 ขนมฟรี 1 ชิ้น', image: 'https://i.imgur.com/snack.png' }
];

// ตัวอย่าง GIF วงล้อหมุน (เปลี่ยนเป็นลิงก์ GIF ที่ชอบได้)
const spinningGif = 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif';

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

          // ตอบกลับทันที "กำลังหมุนวงล้อ..." พร้อม GIF
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

          // รอ 3 วินาที แล้วส่งผลรางวัล (push message)
          setTimeout(async () => {
            await axios.post('https://api.line.me/v2/bot/message/push', {
              to: event.source.userId,
              messages: [
                {
                  type: 'text',
                  text: `🎉 คุณได้: ${prize.text}`
                },
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
