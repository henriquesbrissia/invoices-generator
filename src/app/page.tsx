'use client'

import { useState } from 'react';
import { InvoiceForm } from '@/components/forms/invoice-form';
import InvoicePreview from '@/components/InvoicePreview';
import InvoicePreviewLight from '@/components/InvoicePreviewLight';
import { InvoiceData } from '@/lib/schema';

type InvoiceClientProps = {
  initialTemplate?: 'dark' | 'light';
}

function InvoiceClient({ initialTemplate = 'dark' }: InvoiceClientProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [templateType, setTemplateType] = useState<'dark' | 'light'>(initialTemplate);

  const handleSubmitForm = (data: InvoiceData) => {
    setInvoiceData(data);
    setShowPreview(true);
  };

  const handleBackToForm = () => {
    setShowPreview(false);
    setInvoiceData(null);
  };

  const handleThemeChange = (value: 'dark' | 'light') => {
    setTemplateType(value);
  };

  return (
    <>
      {showPreview && invoiceData ? (
        <div>
          {templateType === 'dark' ? (
            <InvoicePreview 
              data={invoiceData} 
              onBack={handleBackToForm} 
              onThemeChange={handleThemeChange}
              currentTheme={templateType}
            />
          ) : (
            <InvoicePreviewLight 
              data={invoiceData} 
              onBack={handleBackToForm} 
              onThemeChange={handleThemeChange}
              currentTheme={templateType}
            />
          )}
        </div>
      ) : (
        <InvoiceForm onSubmit={handleSubmitForm} />
      )}
    </>
  );
}

// Server component page
export default function Home() {
  return (
    <main className="min-h-screen py-10 bg-slate-50">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Invoice Generator</h1>
        <InvoiceClient initialTemplate="dark" />
      </div>
    </main>
  );
}
