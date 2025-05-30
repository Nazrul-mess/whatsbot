// whatsapp_bot_bridge.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// WhatsApp client setup
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    },
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above to login.');
});

client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
});

// Command listener
client.on('message', async msg => {
    // Ignore if message is from status broadcast
    if (msg.from === 'status@broadcast') return;

    const chat = await msg.getChat();
    const body = msg.body.trim();

    const senderId = chat.isGroup ? msg.author : msg.from;

    console.log(`📥 Command from ${senderId}: ${body}`);

    try {
        const res = await axios.post('http://Nazrulmess.eu.pythonanywhere.com/whatsapp-webhook', {
            sender: senderId,
            chat_id: chat.id._serialized,
            message: body
        });

        if (res.data.reply) {
            const replyParts = splitMessage(res.data.reply);
            for (const part of replyParts) {
                await chat.sendMessage(part);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between messages
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
        await chat.sendMessage('❌ Error processing your command. Please try again.');
    }
});


// Helper function to split long messages
function splitMessage(text, maxLength = 4096) {
    const parts = [];
    while (text.length) {
        const part = text.substring(0, maxLength);
        parts.push(part);
        text = text.substring(maxLength);
    }
    return parts;
}

client.initialize();

// Start local server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Bridge server running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('✅ WhatsApp bot is running!');
});
