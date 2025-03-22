'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus } from 'lucide-react';
import { InvoiceItem } from '@/components/invoice-item';
import { useFormPersistence } from '@/hooks/use-form-persistence';
import { formatDateRange, formatCurrency } from '@/lib/utils';
import { InvoiceData, InvoiceItem as InvoiceItemType, invoiceSchema } from '@/lib/schema';

interface InvoiceFormProps {
  onSubmit: (data: InvoiceData) => void;
}

export function InvoiceForm({ onSubmit }: InvoiceFormProps) {
  const [items, setItems] = useState<InvoiceItemType[]>([
    { 
      description: 'Design services', 
      date: '', 
      startDate: null, 
      endDate: null, 
      rate: '0.00', 
      total: '0.00' 
    }
  ]);

  const form = useForm<InvoiceData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: `#${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
      fromCompany: 'My Company',
      fromAddress: 'Sample House\n20 New Main Street\nLondon W123 235 England',
      fromVat: '',
      toCompany: '',
      toAddress: '',
      toEin: '',
      items: items,
      notes: '',
      paymentInfo: {
        accountHolder: '',
        accountNumber: '',
        bankAddress: '',
        contactEmail: ''
      }
    }
  });

  // Handle form persistence with custom transformations
  const { saveFormData } = useFormPersistence<InvoiceData>(
    form,
    'invoiceFormData',
    (data) => data, // No transformation needed before saving
    (loadedData) => {
      // Transform dates after loading from localStorage
      if (loadedData.items) {
        loadedData.items = loadedData.items.map((item: InvoiceItemType) => ({
          ...item,
          startDate: item.startDate ? new Date(item.startDate) : null,
          endDate: item.endDate ? new Date(item.endDate) : null
        }));
        setItems(loadedData.items);
      }
      return loadedData;
    }
  );

  const addItem = () => {
    setItems([...items, { 
      description: '', 
      date: '', 
      startDate: null, 
      endDate: null, 
      rate: '0.00', 
      total: '0.00' 
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      return; // Prevent removing the last item
    }
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof InvoiceItemType, value: string | number | Date | null) => {
    const newItems = [...items];
    
    // For date fields, also update the date text field
    if (field === 'startDate' || field === 'endDate') {
      newItems[index] = { ...newItems[index], [field]: value };
      
      // If both dates are defined, update the date field
      if (newItems[index].startDate && newItems[index].endDate) {
        newItems[index].date = formatDateRange(
          newItems[index].startDate,
          newItems[index].endDate
        );
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.total || '0'), 0).toFixed(2);
  };

  const handleSubmit = (data: InvoiceData) => {
    try {
      // Prepare final data with latest items state
      const finalData = {
        ...data,
        items: items
      };
      
      // Save to localStorage
      saveFormData(finalData);
      
      // Call the onSubmit callback
      onSubmit(finalData);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred when submitting the form. Please try again.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-[850px] mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sender Information */}
          <Card>
            <CardHeader>
              <CardTitle>From (Your Info)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="fromCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fromAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fromVat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Bill To (Client Info)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="toCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="toAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="toEin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EIN/Tax ID (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <h2 className="font-medium my-4">Invoice Items</h2>
              
              {items.map((item, index) => (
                <InvoiceItem
                  key={index}
                  item={item}
                  index={index}
                  onRemove={() => removeItem(index)}
                  onUpdate={(field, value) => updateItem(index, field, value)}
                />
              ))}
              
              <div className='flex justify-between'>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
                
                  <div className="text-right py-4">
                    <div className="text-sm text-gray-500 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold">${calculateTotal()}</div>
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="paymentInfo.accountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentInfo.accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentInfo.bankAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentInfo.contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} placeholder="Any additional notes for the client" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button type="submit" size="lg">
            Generate Invoice
          </Button>
        </div>
      </form>
    </Form>
  );
} 