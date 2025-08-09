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

      if (text === 'ลุ้นรางวัล') {
        const prize = getRandomPrize();

        await axios.post('https://api.line.me/v2/bot/message/reply', {
          replyToken: event.replyToken,
          messages: [
            { type: 'text', text: `🎉 คุณได้รางวัล: ${prize.text}` },
            { type: 'image', originalContentUrl: prize.image, previewImageUrl: prize.image }
          ]
        }, {
          headers: {
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        await axios.post('https://api.line.me/v2/bot/message/reply', {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: 'พิมพ์ "ลุ้นรางวัล" เพื่อเริ่มหมุนวงล้อได้ครับ' }]
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
