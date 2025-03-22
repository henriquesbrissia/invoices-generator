import { z } from 'zod';

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.string(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  rate: z.string(),
  total: z.string()
});

export const invoicePaymentInfoSchema = z.object({
  accountHolder: z.string().min(1, "Account holder is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  bankAddress: z.string(),
  contactEmail: z.string().email("Invalid email format").optional().default("")
});

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  fromCompany: z.string().min(1, "Company name is required"),
  fromAddress: z.string().min(1, "Address is required"),
  fromVat: z.string(),
  toCompany: z.string().min(1, "Client company name is required"),
  toAddress: z.string().min(1, "Client address is required"),
  toEin: z.string(),
  items: z.array(invoiceItemSchema).min(1, "At least one invoice item is required"),
  notes: z.string(),
  paymentInfo: invoicePaymentInfoSchema
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type InvoicePaymentInfo = z.infer<typeof invoicePaymentInfoSchema>;
export type InvoiceData = z.infer<typeof invoiceSchema>; 