require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper function to convert 24h to 12h with AM/PM
function formatTimeTo12Hour(timeStr) {
    if (!timeStr) return 'Not specified';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

app.post('/api/book', async (req, res) => {
    const { firstName, lastName, phone, email, service, date, time, message } = req.body;

    // Validation (unchanged)
    const namePattern = /^[a-zA-ZÀ-ÿ\s'\-]{2,30}$/;
    const phonePattern = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!firstName || !lastName || !namePattern.test(firstName) || !namePattern.test(lastName)) {
        return res.status(400).json({ success: false, message: "Invalid first or last name." });
    }
    if (!phone || !phonePattern.test(phone)) {
        return res.status(400).json({ success: false, message: "Invalid phone number." });
    }
    if (!email || !emailPattern.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email address." });
    }
    if (!date || !service || !time) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const bookingDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 6);

    if (bookingDate < today) {
        return res.status(400).json({ success: false, message: "Booking date cannot be in the past." });
    }
    if (bookingDate > maxFutureDate) {
        return res.status(400).json({ success: false, message: "Bookings can only be scheduled up to 6 months in advance." });
    }

    const formattedTime = formatTimeTo12Hour(time);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `New Booking Request - ${service} | ${firstName} ${lastName}`,
        html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%); padding: 32px 24px; text-align: center; color: white;">
                    <h2 style="margin: 0; font-size: 24px; letter-spacing: 1px;">AO DETAILING</h2>
                    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">New Reservation Request</p>
                </div>

                <!-- Content -->
                <div style="padding: 32px 28px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #444; width: 38%;">Client Name</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #222; font-weight: 500;">${firstName} ${lastName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #444;">Service Package</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #007bff; font-weight: 600;">${service}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #444;">Requested Date</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #222;">${date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #444;">Preferred Time</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #222; font-weight: 500;">${formattedTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #444;">Phone</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                                <a href="tel:${phone}" style="color: #007bff; text-decoration: none;">${phone}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #444;">Email</td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                                <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a>
                            </td>
                        </tr>
                    </table>

                    <!-- Message Section -->
                    <div style="margin-top: 28px;">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">Vehicle & Special Requests</h4>
                        <div style="background: #f8f9fa; padding: 18px; border-left: 4px solid #007bff; border-radius: 4px; line-height: 1.5; color: #333; white-space: pre-wrap;">
                            ${message ? message.replace(/\n/g, '<br>') : '<em>No additional details provided.</em>'}
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background: #f8f9fa; padding: 18px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee;">
                    Received via AO Detailing Website • ${new Date().toLocaleDateString()}
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Reservation sent successfully!" });
    } catch (error) {
        console.error("Mail Dispatch Error:", error);
        res.status(500).json({ success: false, message: "Could not send booking request. Please try calling or texting." });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
});