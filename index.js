const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU='; // ใส่ token คุณที่นี่

const prizes = [
  { text: '🎉 ส่วนลด 50%', image: 'https://example.com/discount.png' },
  { text: '☕ ฟรีกาแฟ 1 แก้ว', image: 'https://example.com/coffee.png' },
  { text: '🍪 ขนมฟรี 1 ชิ้น', image: 'https://example.com/snack.png' }
];

function getRandomPrize() {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.sendStatus(200);
});




  for (let event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      if (event.message.text === 'ลุ้นรางวัล') {
        const prize = getRandomPrize();

        await axios.post('https://api.line.me/v2/bot/message/reply', {
          replyToken: event.replyToken,
          messages: [
            { type: 'text', text: 'กำลังหมุนวงล้อ... 🎯' },
            { 
              type: 'image', 
              originalContentUrl: prize.image, 
              previewImageUrl: prize.image 
            },
            { type: 'text', text: `คุณได้: ${prize.text}` }
          ]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
          }
        });
      }
    }
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
