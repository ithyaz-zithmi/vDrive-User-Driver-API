
import { EmailRepository } from './email.repository';
import { Attachment } from 'nodemailer/lib/mailer';

interface InvoicePayload {
    recipient: string;
    filename: string;
    base64_data: string;
    subject: string;
}

export const EmailService = {
    /**
     * Prepares the email content and attachment buffer, then delegates sending to the repository.
     * @param payload - Data received from the frontend (recipient, base64 data, etc.).
     */
    async sendInvoiceEmail(payload: InvoicePayload): Promise<void> {
        const { recipient, filename, base64_data, subject } = payload;

        // 1. Convert Base64 string back into a Buffer
        // This is the core business logic of the service layer
        const pdfBuffer: Buffer = Buffer.from(base64_data, 'base64');

        // 2. Construct the attachment object
        const attachment: Attachment = {
            filename: filename,
            content: pdfBuffer,
            contentType: 'application/pdf',
        };

        // 3. Define the mail options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipient,
            subject: subject,
            html: `
           <p style="margin-bottom: 20px;">Dear Customer,</p>
        <p style="margin-bottom: 20px;">Thanks for riding with <span style="color: #007bff; font-weight: bold;">VDrive!</span></p>

        <div style="
            background-color: #f0f8ff; 
            border: 1px dashed #a0c0ff; 
            padding: 15px; 
            margin-bottom: 25px; 
            border-radius: 5px;
            font-size: 14px;
            color: #333;
        ">
            <p style="margin: 0; font-weight: bold;">
                📄 Invoice Attached:
            </p>
            <p style="margin: 5px 0 0 0;">
                Please find the official invoice (or receipt) for your recent trip attached to this email.
            </p>
        </div>
        <div style="margin-top: 30px; line-height: 1.5;">
            Thanks and Regards,
            <br>
            <strong>The VDrive Team</strong>
        </div>

        <div style="
            font-size: 12px; 
            color: #777; 
            margin-top: 30px; 
            border-top: 1px solid #ddd; 
            padding-top: 15px; 
            line-height: 1.6;
        ">
            <p style="margin: 0; font-weight: bold;">Need Assistance?</p>
            <p style="margin: 0;">
                <strong>Support Email:</strong> support@v-drive.com
            </p>
            <p style="margin-top: 5px; margin-bottom: 0;">
                <a href="[Link to Help Center]" style="color: #2479dd; text-decoration: none;">Visit our Help Center</a>
            </p>
        </div>
            `,
            attachments: [attachment],
        };

        // 4. Delegate to the repository
        await EmailRepository.sendMail(mailOptions);
    }
};