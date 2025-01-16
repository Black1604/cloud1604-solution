import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodemailer, { SendMailOptions } from 'nodemailer';
import { InvoiceStatus } from '@prisma/client';
import { sendEmail, generateInvoiceStatusEmail } from '../email';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockImplementation((options: SendMailOptions) => 
        Promise.resolve({ messageId: 'test-message-id' })
      )
    }))
  }
}));

describe('Email System', () => {
  const mockEnv = {
    NODE_ENV: 'test',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'test@example.com',
    SMTP_PASS: 'password123',
    SMTP_FROM: 'noreply@example.com',
    COMPANY_NAME: 'Test Company',
    COMPANY_EMAIL: 'info@example.com',
    COMPANY_PHONE: '+1234567890',
    COMPANY_LOGO: 'https://example.com/logo.png',
    BANK_NAME: 'Test Bank',
    BANK_ACCOUNT_NAME: 'Test Account',
    BANK_ACCOUNT_NUMBER: '1234567890',
  };

  beforeEach(() => {
    // Setup process.env
    process.env = { ...mockEnv };
  });

  afterEach(() => {
    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Email Configuration', () => {
    it('should validate email configuration correctly', () => {
      expect(() => {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      }).not.toThrow();
    });

    it('should throw error for invalid email configuration', () => {
      delete process.env.SMTP_HOST;
      expect(() => {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      }).toThrow();
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test Content',
        html: '<p>Test Content</p>',
      };

      const result = await sendEmail(emailOptions);
      expect(result).toBe(true);
    });

    it('should handle email sending failure and retry', async () => {
      // Mock a failing sendMail implementation
      const mockSendMail = vi.fn()
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValueOnce({ messageId: 'test-message-id' });

      nodemailer.createTransport = vi.fn().mockReturnValue({
        sendMail: mockSendMail,
      });

      const emailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test Content',
        html: '<p>Test Content</p>',
      };

      const result = await sendEmail(emailOptions);
      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe('generateInvoiceStatusEmail', () => {
    const baseParams = {
      invoiceNumber: 'INV-001',
      customerName: 'John Doe',
      total: 1000,
      dueDate: new Date('2024-12-31'),
    };

    it('should generate PENDING email correctly', () => {
      const { subject, text, html } = generateInvoiceStatusEmail(
        baseParams.invoiceNumber,
        'PENDING' as InvoiceStatus,
        baseParams.customerName,
        baseParams.total,
        baseParams.dueDate
      );

      expect(subject).toContain('Pending');
      expect(text).toContain('Please process the payment');
      expect(html).toContain('Payment Instructions');
      expect(html).toContain(process.env.BANK_NAME);
    });

    it('should generate OVERDUE email correctly', () => {
      const { subject, text, html } = generateInvoiceStatusEmail(
        baseParams.invoiceNumber,
        'OVERDUE' as InvoiceStatus,
        baseParams.customerName,
        baseParams.total,
        baseParams.dueDate
      );

      expect(subject).toContain('Overdue');
      expect(text).toContain('requires immediate attention');
      expect(html).toContain('Urgent Payment Required');
      expect(html).toContain(process.env.BANK_ACCOUNT_NUMBER);
    });

    it('should generate PAID email correctly', () => {
      const { subject, text, html } = generateInvoiceStatusEmail(
        baseParams.invoiceNumber,
        'PAID' as InvoiceStatus,
        baseParams.customerName,
        baseParams.total,
        baseParams.dueDate
      );

      expect(subject).toContain('Paid');
      expect(text).toContain('received your payment');
      expect(html).not.toContain('Payment Instructions');
    });

    it('should generate CANCELLED email correctly', () => {
      const { subject, text, html } = generateInvoiceStatusEmail(
        baseParams.invoiceNumber,
        'CANCELLED' as InvoiceStatus,
        baseParams.customerName,
        baseParams.total,
        baseParams.dueDate
      );

      expect(subject).toContain('Cancelled');
      expect(text).toContain('has been cancelled');
      expect(html).not.toContain('Payment Instructions');
    });

    it('should handle missing due date correctly', () => {
      const { text, html } = generateInvoiceStatusEmail(
        baseParams.invoiceNumber,
        'PENDING' as InvoiceStatus,
        baseParams.customerName,
        baseParams.total
      );

      expect(text).not.toContain('Due Date:');
      expect(html).not.toContain('Due Date:');
    });

    it('should format currency correctly', () => {
      const { text, html } = generateInvoiceStatusEmail(
        baseParams.invoiceNumber,
        'PENDING' as InvoiceStatus,
        baseParams.customerName,
        1234.56,
        baseParams.dueDate
      );

      expect(text).toContain('$1,234.56');
      expect(html).toContain('$1,234.56');
    });

    it('should format date correctly', () => {
      const { text, html } = generateInvoiceStatusEmail(
        baseParams.invoiceNumber,
        'PENDING' as InvoiceStatus,
        baseParams.customerName,
        baseParams.total,
        new Date('2024-12-31')
      );

      expect(text).toContain('Tuesday, December 31, 2024');
      expect(html).toContain('Tuesday, December 31, 2024');
    });
  });
}); 