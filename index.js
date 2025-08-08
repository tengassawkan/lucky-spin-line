const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const CHANNEL_ACCESS_TOKEN = 'N9MdAkeCqg6kMk2LgwkTl6dy9yhba10ec4l9w5APzRy3SpSfZlur4dfDtQ/CUVQa2p16LaE1kpyGOgOO9jzYy8q5ouh1o+J19/hIQTmPzyEaSMOI3Dh/SJjytIoFm0j5IOT3S/ommuDPGpuXcE4GNQdB04t89/1O/w1cDnyilFU=';
const LIFF_URL = 'https://lucky-spin-line.onrender.com/lucky-spin.html';  // เปลี่ยนเป็นลิงก์เว็บวงล้อหมุนของคุณ

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// เก็บสถานะผู้ใช้รอ confirm
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
                  '📢 กติกาการหมุนวงล้อ:\n' +
                  '- ต้องยืนยันก่อนหมุน\n' +
                  '- หมุนได้ 1 ครั้งต่อคน\n' +
                  '- รางวัลจะสุ่มแจก\n\n' +
                  'ถ้าต้องการหมุนวงล้อ กรุณาพิมพ์ "ตกลง" เพื่อยืนยันและรับลิงก์หมุนวงล้อ'
              }
            ]
          }, {
            headers: {
              'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
        } 
        else if (text === 'ตกลง' && waitingForConfirm.has(userId)) {
          waitingForConfirm.delete(userId);

          // ส่งลิงก์เว็บวงล้อหมุนให้ผู้ใช้
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              {
                type: 'text',
                text: `กดที่ลิงก์นี้เพื่อหมุนวงล้อเลยครับ:\n${LIFF_URL}`
              }
            ]
          }, {
            headers: {
              'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
        }
        else {
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              { type: 'text', text: 'พิมพ์ "ลุ้นรางวัล" เพื่อเริ่มหมุนวงล้อได้ครับ' }
            ]
          }, {
            headers: {
              'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
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

// รับข้อมูลผลรางวัลจากเว็บวงล้อหมุน (LIFF หรือเว็บอื่นส่งมา)
app.post('/api/send-prize', async (req, res) => {
  try {
    const { userId, prize } = req.body;
    if (!userId || !prize) return res.status(400).send('Missing userId or prize');

    // ส่งผลรางวัลกลับทางแชท (push message)
    await axios.post('https://api.line.me/v2/bot/message/push', {
      to: userId,
      messages: [
        { type: 'text', text: `🎉 คุณได้รางวัล: ${prize}` }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
