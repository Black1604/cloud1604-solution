import nodemailer from "nodemailer";
import { InvoiceStatus } from "@prisma/client";
import { z } from "zod";
import { logger } from "./logger";
import { metrics } from "./metrics";
import { queueEmail } from "./queue";
import sanitizeHtml from "sanitize-html";

// Email configuration validation
const emailConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  user: z.string(),
  pass: z.string(),
  from: z.string().email(),
  companyName: z.string(),
  companyEmail: z.string().email(),
  companyPhone: z.string(),
  companyLogo: z.string().optional(),
});

// Parse and validate email configuration
const emailConfig = emailConfigSchema.parse({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
  companyName: process.env.COMPANY_NAME || "Business Solution System",
  companyEmail: process.env.COMPANY_EMAIL || "finance@company.com",
  companyPhone: process.env.COMPANY_PHONE || "+1 (555) 123-4567",
  companyLogo: process.env.COMPANY_LOGO,
});

const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    filename: string;
    path: string;
    contentType: string;
  }>;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const startTime = Date.now();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info('Attempting to send email', {
        to: options.to,
        subject: options.subject,
        attempt,
      });

      const info = await transporter.sendMail({
        from: emailConfig.from,
        ...options,
      });

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        attempt,
      });

      metrics.increment('email.sent');
      metrics.timing('email.delivery_time', Date.now() - startTime);

      return true;
    } catch (error) {
      logger.error('Email sending failed', {
        to: options.to,
        subject: options.subject,
        attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      if (attempt === MAX_RETRIES) {
        logger.error('Max retries reached, giving up.');
        metrics.increment('email.failed');
        return false;
      }

      // Wait before retrying, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt - 1)));
    }
  }

  return false;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Status-specific styling
const statusStyles: Record<InvoiceStatus, { color: string; background: string }> = {
  PENDING: { color: "#2563eb", background: "#dbeafe" },
  OVERDUE: { color: "#dc2626", background: "#fee2e2" },
  PAID: { color: "#16a34a", background: "#dcfce7" },
  CANCELLED: { color: "#4b5563", background: "#f3f4f6" },
};

// Sanitize user input
function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export async function generateAndQueueInvoiceEmail(
  invoiceNumber: string,
  status: InvoiceStatus,
  customerName: string,
  customerEmail: string,
  total: number,
  dueDate?: Date,
  companyName: string = emailConfig.companyName
): Promise<string> {
  // Sanitize user inputs
  const sanitizedCustomerName = sanitizeInput(customerName);
  const sanitizedInvoiceNumber = sanitizeInput(invoiceNumber);

  const emailContent = generateInvoiceStatusEmail(
    sanitizedInvoiceNumber,
    status,
    sanitizedCustomerName,
    total,
    dueDate,
    companyName
  );

  // Queue the email
  return await queueEmail({
    to: customerEmail,
    ...emailContent,
  });
}

export function generateInvoiceStatusEmail(
  invoiceNumber: string,
  status: InvoiceStatus,
  customerName: string,
  total: number,
  dueDate?: Date,
  companyName: string = emailConfig.companyName
) {
  const { color, background } = statusStyles[status];
  const subject = `Invoice ${invoiceNumber} - ${status.charAt(0) + status.slice(1).toLowerCase()} Status Update`;
  
  let statusSpecificMessage = "";
  let callToAction = "";
  let paymentInstructions = "";
  
  switch (status) {
    case "PENDING":
      statusSpecificMessage = `We have issued invoice #${invoiceNumber} for your recent purchase. Please process the payment before the due date to maintain your good standing.`;
      callToAction = dueDate 
        ? `The payment is due by ${formatDate(dueDate)}. Early payment is appreciated.`
        : "Please process the payment at your earliest convenience.";
      paymentInstructions = `
        <div style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 5px;">
          <h4 style="margin-top: 0; color: #0f172a;">Payment Instructions</h4>
          <p style="margin: 5px 0;">Bank: ${process.env.BANK_NAME || "Example Bank"}</p>
          <p style="margin: 5px 0;">Account Name: ${process.env.BANK_ACCOUNT_NAME || "Business Solution"}</p>
          <p style="margin: 5px 0;">Account Number: ${process.env.BANK_ACCOUNT_NUMBER || "XXXX-XXXX-XXXX"}</p>
          <p style="margin: 5px 0;">Reference: INV-${invoiceNumber}</p>
        </div>
      `;
      break;
    case "OVERDUE":
      statusSpecificMessage = `This is a reminder that invoice #${invoiceNumber} is past its due date and requires immediate attention.`;
      callToAction = "To avoid any service interruptions, please process the payment as soon as possible. If you have already made the payment, please disregard this notice and provide us with the payment details.";
      paymentInstructions = `
        <div style="margin-top: 20px; padding: 15px; background-color: #fee2e2; border-radius: 5px;">
          <h4 style="margin-top: 0; color: #991b1b;">Urgent Payment Required</h4>
          <p style="margin: 5px 0;">Bank: ${process.env.BANK_NAME || "Example Bank"}</p>
          <p style="margin: 5px 0;">Account Name: ${process.env.BANK_ACCOUNT_NAME || "Business Solution"}</p>
          <p style="margin: 5px 0;">Account Number: ${process.env.BANK_ACCOUNT_NUMBER || "XXXX-XXXX-XXXX"}</p>
          <p style="margin: 5px 0;">Reference: INV-${invoiceNumber}</p>
        </div>
      `;
      break;
    case "PAID":
      statusSpecificMessage = `We have received your payment for invoice #${invoiceNumber}. Thank you for your prompt payment.`;
      callToAction = "Your account has been credited, and this invoice is now marked as paid. We appreciate your business.";
      break;
    case "CANCELLED":
      statusSpecificMessage = `Invoice #${invoiceNumber} has been cancelled as requested.`;
      callToAction = "No further action is required regarding this invoice. Please contact us if you have any questions.";
      break;
  }

  const text = `
Dear ${customerName},

${statusSpecificMessage}

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Status: ${status}
- Total Amount: ${formatCurrency(total)}
${dueDate ? `- Due Date: ${formatDate(dueDate)}` : ""}

${callToAction}

If you have any questions or concerns, please don't hesitate to contact our finance department.

Best regards,
${companyName}
${emailConfig.companyEmail}
${emailConfig.companyPhone}
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    ${emailConfig.companyLogo ? `
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${emailConfig.companyLogo}" alt="${companyName}" style="max-width: 200px; height: auto;">
      </div>
    ` : ''}
    
    <h2 style="color: #2c3e50; margin-bottom: 20px;">Invoice Status Update</h2>
    
    <p style="margin-bottom: 20px;">Dear ${customerName},</p>
    
    <p style="margin-bottom: 20px;">${statusSpecificMessage}</p>
    
    <div style="background-color: ${background}; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; color: ${color};">Invoice Details</h3>
      <p style="margin: 5px 0;">Invoice Number: <strong>${invoiceNumber}</strong></p>
      <p style="margin: 5px 0;">Status: <strong style="color: ${color};">${status}</strong></p>
      <p style="margin: 5px 0;">Total Amount: <strong>${formatCurrency(total)}</strong></p>
      ${dueDate ? `<p style="margin: 5px 0;">Due Date: <strong>${formatDate(dueDate)}</strong></p>` : ""}
    </div>
    
    <p style="margin-bottom: 20px;">${callToAction}</p>
    
    ${paymentInstructions}
    
    <p style="margin: 20px 0;">If you have any questions or concerns, please don't hesitate to contact our finance department.</p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="margin: 5px 0;">Best regards,</p>
      <p style="margin: 5px 0;"><strong>${companyName}</strong></p>
      <p style="margin: 5px 0; color: #666;">${emailConfig.companyEmail}</p>
      <p style="margin: 5px 0; color: #666;">${emailConfig.companyPhone}</p>
    </div>
  </div>
</body>
</html>
`;

  return {
    subject,
    text,
    html,
  };
} 