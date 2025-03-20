'use client'

import { useState } from 'react';
import InvoiceForm, { InvoiceData } from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import InvoicePreviewLight from '@/components/InvoicePreviewLight';

export default function Home() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [templateType, setTemplateType] = useState<'dark' | 'light'>('dark');

  const handleSubmitForm = (data: InvoiceData) => {
    setInvoiceData(data);
    setShowPreview(true);
  };

  const handleBackToForm = () => {
    setShowPreview(false);
    setInvoiceData(null);
  };

  const toggleTemplate = () => {
    setTemplateType(templateType === 'dark' ? 'light' : 'dark');
  };

  return (
    <main className="min-h-screen py-10 bg-slate-50">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Invoice Generator</h1>
        
        {showPreview && invoiceData ? (
          <div>
            <div className="flex justify-end mb-4">
              <button 
                onClick={toggleTemplate}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm font-medium transition-colors"
              >
                {templateType === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              </button>
            </div>
            
            {templateType === 'dark' ? (
              <InvoicePreview data={invoiceData} onBack={handleBackToForm} />
            ) : (
              <InvoicePreviewLight data={invoiceData} onBack={handleBackToForm} />
            )}
          </div>
        ) : (
          <InvoiceForm onSubmit={handleSubmitForm} />
        )}
      </div>
    </main>
  );
}
