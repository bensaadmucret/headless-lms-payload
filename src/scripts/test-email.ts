import { getPayload } from 'payload'
import config from '../payload.config'

const testEmail = async () => {
    try {
        console.log('Initializing Payload...');
        const payload = await getPayload({
            config,
        });

        console.log('Payload initialized. Checking email configuration...');

        if (!payload.sendEmail) {
            console.error('❌ payload.sendEmail is NOT defined. Email service is disabled or not configured correctly.');
            process.exit(1);
        }

        console.log('Attempting to send a test email...');
        const result = await payload.sendEmail({
            to: 'test-email-verification@example.com',
            from: 'no-reply@medcoach.test',
            subject: 'Test Email from MedCoach',
            html: '<p>This is a test email to verify SMTP configuration.</p>',
            text: 'This is a test email to verify SMTP configuration.',
        });

        console.log('✅ Email successfully sent!');
        console.log('Result:', result);
        process.exit(0);

    } catch (error) {
        console.error('❌ Failed to send email:', error);
        process.exit(1);
    }
};

testEmail();
