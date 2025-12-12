
import nodemailer from 'nodemailer';

async function testMailHog() {
    console.log('Testing connection to MailHog at localhost:1025...');

    const transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        secure: false, // true for 465, false for other ports
        auth: undefined, // No auth for MailHog
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('Verifying transport connection...');
        await transporter.verify();
        console.log('✅ Connection to MailHog successful!');

        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: '"MedCoach Test" <no-reply@medcoach.test>',
            to: "test-mailhog@example.com",
            subject: "Test MailHog Connection",
            text: "If you see this, MailHog is working correctly via Node.js!",
            html: "<b>If you see this, MailHog is working correctly via Node.js!</b>"
        });

        console.log('✅ Message sent: %s', info.messageId);
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to connect or send email:', error);
        process.exit(1);
    }
}

testMailHog();
