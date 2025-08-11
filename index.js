const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';

const prizes = [
  { text: '🎉 ชุดผ้าปู + ปลอกหมอน 6 ฟุค มูลค่า 790 -' },
  { text: '🎉 หมอนหนุน มูลค่า 250 - !' },
  { text: '🎉 หมอนข้าง มูลค่า 350 - !' }
];

const waitingForName = new Set();
const waitingForConfirm = new Set();
const userNames = {};

function getRandomPrize() {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

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

        if (text === 'ลุ้นรางวัล') {
          waitingForName.add(userId);
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: 'กรุณาพิมพ์ชื่อ - นามสกุลของคุณเพื่อเริ่มหมุนวงล้อครับ'
            }
          ]);
        }
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
        else if (text === 'ตกลง' && waitingForConfirm.has(userId)) {
          waitingForConfirm.delete(userId);

          await replyMessage(event.replyToken, [
            { type: 'text', text: '🎯 กำลังหมุนวงล้อ ...' }
          ]);

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
        else {
          // ตรงนี้ไม่ตอบอะไรเลย (หรือจะส่งข้อความทักทายทั่วไปก็ได้)
          // await replyMessage(event.replyToken, [
          //   { type: 'text', text: 'สวัสดีครับ ยินดีให้บริการครับ' }
          // ]);
          // แต่ถ้าไม่อยากตอบอะไรเลยให้เว้นไว้เฉย ๆ
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
