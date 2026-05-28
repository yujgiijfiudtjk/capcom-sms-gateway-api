const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS পলিসি ইনেবল করা (যাতে আপনার HTML ফর্ম এটি অ্যাক্সেস করতে পারে)
app.use(cors());
app.use(express.json());

// হোম রুট (সার্ভার লাইভ আছে কিনা চেক করার জন্য)
app.get('/', (req, res) => {
    res.send('Capcom SMS Gateway Backend is Running Perfectly!');
});

// SMS পাঠানোর রুট
app.post('/send-sms', async (req, res) => {
    const { to, message } = req.body;

    // ফোন নম্বর বা মেসেজ না থাকলে এরর দেবে
    if (!to || !message) {
        return res.status(400).json({ success: false, message: 'Phone number (to) and message are required.' });
    }

    // SMSGate API এন্ডপয়েন্ট
    const smsgateUrl = "https://api.sms-gate.app/mobile/v1/sms/send";

    // আপনার স্ক্রিনশট থেকে নেওয়া ফিক্সড ক্রেডেনশিয়ালস
    const payload = {
        deviceId: "MRcMGWllvDu50lt1M4BNZ",
        username: "PLGQYM",
        password: "mhmhzxxjsvic4f",
        to: to,
        message: message
    };

    try {
        // node-fetch বা built-in fetch ব্যবহার করে SMSGate-এ রিকোয়েস্ট পাঠানো
        const response = await fetch(smsgateUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            return res.status(200).json({ success: true, data: result });
        } else {
            return res.status(response.status).json({ success: false, message: result.message || 'Failed to send via SMSGate.' });
        }

    } catch (error) {
        console.error("Error sending SMS:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Connection failed.' });
    }
});

// সার্ভার স্টার্ট করা
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
