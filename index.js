const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = 'YN9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';

// รางวัล
const prizes = [
  { text: '🎉 ส่วนลด 50%', image: 'https://i.imgur.com/discount.png' },
  { text: '☕ ฟรีกาแฟ 1 แก้ว', image: 'https://i.imgur.com/coffee.png' },
  { text: '🍪 ขนมฟรี 1 ชิ้น', image: 'https://i.imgur.com/snack.png' }
];

// สถานะ
const waitingForConfirm = new Set();
const spinHistory = {}; // เก็บเวลาที่หมุนล่าสุดของแต่ละ user

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

        // เริ่มหมุน
        if (text === 'ลุ้นรางวัล') {
          // เช็ค cooldown (1 นาที)
          if (spinHistory[userId] && Date.now() - spinHistory[userId] < 60000) {
            await reply(event.replyToken, [
              { type: 'text', text: '⏳ กรุณารออย่างน้อย 1 นาทีก่อนหมุนอีกครั้ง' }
            ]);
            continue;
          }

          waitingForConfirm.add(userId);
          await reply(event.replyToken, [
            {
              type: 'text',
              text:
                '📢 กติกาการหมุนวงล้อ:\n- ยืนยันก่อนหมุน\n- หมุนได้ครั้งละ 1 รางวัล\n- รางวัลสุ่มแจก',
              quickReply: {
                items: [
                  {
                    type: 'action',
                    action: { type: 'message', label: 'ตกลง', text: 'ตกลง' }
                  },
                  {
                    type: 'action',
                    action: { type: 'message', label: 'ยกเลิก', text: 'ยกเลิก' }
                  }
                ]
              }
            }
          ]);

        // ตกลงหมุน
        } else if (text === 'ตกลง' && waitingForConfirm.has(userId)) {
          waitingForConfirm.delete(userId);
          spinHistory[userId] = Date.now(); // บันทึกเวลา

          await reply(event.replyToken, [
            { type: 'text', text: '🎰 กำลังหมุน...' },
            {
              type: 'audio',
              originalContentUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
              duration: 3000
            }
          ]);

          setTimeout(async () => {
            const prize = getRandomPrize();
            await push(userId, [
              {
                type: 'flex',
                altText: 'ผลการหมุนวงล้อ',
                contents: {
                  type: 'bubble',
                  hero: {
                    type: 'image',
                    url: prize.image,
                    size: 'full',
                    aspectRatio: '20:13',
                    aspectMode: 'cover'
                  },
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: `คุณได้รางวัล: ${prize.text}`,
                        weight: 'bold',
                        size: 'lg',
                        align: 'center'
                      }
                    ]
                  }
                }
              }
            ]);
          }, 3000);

        } else if (text === 'ยกเลิก') {
          waitingForConfirm.delete(userId);
          await reply(event.replyToken, [
            { type: 'text', text: '❌ ยกเลิกการหมุนแล้ว' }
          ]);

        } else {
          await reply(event.replyToken, [
            { type: 'text', text: 'พิมพ์ "ลุ้นรางวัล" เพื่อเริ่มหมุนวงล้อได้ครับ' }
          ]);
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.sendStatus(500);
  }
});

async function reply(replyToken, messages) {
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

async function push(to, messages) {
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
