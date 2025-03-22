'use client'

import { useState, useEffect } from 'react';
import { InvoiceForm } from '@/components/forms/invoice-form';
import InvoicePreview from '@/components/InvoicePreview';
import InvoicePreviewLight from '@/components/InvoicePreviewLight';
import { InvoiceData } from '@/lib/schema';
import { Button } from '@/components/ui/button';

type InvoiceClientProps = {
  initialTemplate?: 'dark' | 'light';
}

function InvoiceClient({ initialTemplate = 'dark' }: InvoiceClientProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [templateType, setTemplateType] = useState<'dark' | 'light'>(initialTemplate);
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true on component mount - fixes hydration issues
  useEffect(() => {
    setIsClient(true);

    // Check for localStorage support to prevent SSR issues
    if (typeof window !== 'undefined') {
      // Clear any potentially corrupted form data on first load
      // This helps if there's an issue with the saved form data
      const storedData = localStorage.getItem('invoiceFormData');
      if (storedData) {
        try {
          // Just validate that the data can be parsed
          JSON.parse(storedData);
        } catch {
          // If parsing fails, remove the corrupted data
          console.error('Removing corrupted form data from localStorage');
          localStorage.removeItem('invoiceFormData');
        }
      }
    }
  }, []);

  const handleSubmitForm = (data: InvoiceData) => {
    // Ensure dates are properly handled before setting state
    const processedData = {
      ...data,
      items: data.items.map(item => ({
        ...item,
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null
      }))
    };
    
    setInvoiceData(processedData);
    setShowPreview(true);
  };

  const handleBackToForm = () => {
    setShowPreview(false);
    // We don't clear invoice data here, so we can go back to preview
  };

  const handleThemeChange = (value: 'dark' | 'light') => {
    setTemplateType(value);
  };

  const handleClearLocalStorage = () => {
    if (window.confirm('This will clear all saved form data. You will lose any unsaved changes. Continue?')) {
      localStorage.removeItem('invoiceFormData');
      window.location.reload();
    }
  };

  // Only render client-side content after hydration
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading form...</div>
    </div>;
  }

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
        <div>
          <InvoiceForm onSubmit={handleSubmitForm} />
          {/* Add reset button at the bottom for users experiencing persistent issues */}
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearLocalStorage}
              className="text-xs text-muted-foreground"
            >
              Clear saved data (If having issues with the form)
            </Button>
          </div>
        </div>
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
