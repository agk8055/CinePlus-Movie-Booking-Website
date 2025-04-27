// backend/utils/emailService.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter using Gmail and App Password
    // Ensure your .env file is loaded correctly in server.js before this might be called
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE, // Should be 'gmail' from .env
        auth: {
            user: process.env.EMAIL_USER, // Your services.cineplus@gmail.com
            pass: process.env.EMAIL_PASS, // Your 16-character App Password from .env
        },
        // Note: Sometimes local firewalls/antivirus can interfere with TLS.
        // If you face 'self signed certificate' errors in dev, uncommenting tls might help,
        // but investigate the root cause for production.
        // tls: {
        //     rejectUnauthorized: process.env.NODE_ENV === 'production', // Only enforce in production
        // }
    });

    // 2. Define the email options
    const mailOptions = {
        from: process.env.EMAIL_FROM || `"Cineplus" <${process.env.EMAIL_USER}>`, // Sender address
        to: options.email, // Recipient's email address (passed in options)
        subject: options.subject, // Subject line (passed in options)
        text: options.message, // Plain text body (optional, passed in options)
        html: options.html, // HTML body (preferred, passed in options)
    };

    // 3. Actually send the email
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${options.email}: Message ID - ${info.messageId}`);
        return info; // Indicate success
    } catch (error) {
        console.error(`Error sending email to ${options.email}:`, error);
        // Re-throw the error so the calling function knows sending failed
        // The calling function (bookingController) should decide how to handle this
        throw new Error(`Email could not be sent. Reason: ${error.message}`);
    }
};

module.exports = sendEmail; // Export the function using CommonJS syntax