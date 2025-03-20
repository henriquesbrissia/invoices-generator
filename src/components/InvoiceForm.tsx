import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Trash2, X } from 'lucide-react';

export type InvoiceItem = {
  description: string;
  date: string;
  startDate: Date | null;
  endDate: Date | null;
  rate: string;
  total: string;
};

export type InvoiceData = {
  invoiceNumber: string;
  fromCompany: string;
  fromAddress: string;
  fromVat: string;
  toCompany: string;
  toAddress: string;
  toEin: string;
  items: InvoiceItem[];
  notes: string;
  paymentInfo: {
    accountHolder: string;
    accountNumber: string;
    bankAddress: string;
    contactEmail: string;
  };
};

export default function InvoiceForm({ onSubmit }: { onSubmit: (data: InvoiceData) => void }) {
  const [items, setItems] = useState<InvoiceItem[]>([
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

  useEffect(() => {
    const savedData = localStorage.getItem('invoiceFormData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        
        if (parsedData.items) {
          parsedData.items = parsedData.items.map((item: InvoiceItem) => ({
            ...item,
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.endDate ? new Date(item.endDate) : null
          }));
        }
        
        form.reset(parsedData);
        setItems(parsedData.items || items);
      } catch (error) {
        console.error('Error loading saved data:', error);
        localStorage.removeItem('invoiceFormData');
      }
    }
  }, [form, items]);

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
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number | Date | null) => {
    const newItems = [...items];
    
    // For date fields, also update the date text field
    if (field === 'startDate' || field === 'endDate') {
      newItems[index] = { ...newItems[index], [field]: value };
      
      // If both dates are defined, update the date field
      if (newItems[index].startDate && newItems[index].endDate) {
        const start = format(newItems[index].startDate as Date, 'MMM dd', { locale: ptBR });
        const end = format(newItems[index].endDate as Date, 'MMM dd', { locale: ptBR });
        const year = format(newItems[index].endDate as Date, 'yyyy');
        
        newItems[index].date = `${start} - ${end} ${year}`;
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    // Remove automatic total calculation when rate is updated
    // to allow the user to edit the fields independently
    
    setItems(newItems);
  };

  const formatCurrency = (value: string): string => {
    // Allow input of values with commas and points
    const cleanValue = value.replace(/[^\d.,]/g, '').replace(/,/g, '.');
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) return '0.00';
    return numValue.toFixed(2);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2);
  };

  const handleSubmit = (data: InvoiceData) => {
    try {
      // Prepare final data
      const finalData = {
        ...data,
        // Ensure we use the latest items state
        items: items.map(item => ({
          ...item,
          // Clone dates to avoid reference issues
          startDate: item.startDate ? new Date(item.startDate.getTime()) : null,
          endDate: item.endDate ? new Date(item.endDate.getTime()) : null
        }))
      };
      
      // Save to localStorage
      try {
        localStorage.setItem('invoiceFormData', JSON.stringify(finalData));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      
      // Call the onSubmit callback
      onSubmit(finalData);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Ocorreu um erro ao enviar o formulário. Por favor, tente novamente.');
    }
  };

  // Custom component for date range picker
  const DateRangePicker = ({ index, item }: { index: number, item: InvoiceItem }) => {
    const [isOpen, setIsOpen] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);
    
    // Close the calendar when clicking outside
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [datePickerRef]);
    
    const handleOpenCalendar = () => {
      // Initialize with default dates if dates are empty
      if (!item.startDate && !item.endDate) {
        const today = new Date();
        updateItem(index, 'startDate', today);
        updateItem(index, 'endDate', addDays(today, 1));
      }
      setIsOpen(!isOpen); // Toggle state
    };
    
    const handleApply = () => {
      if (item.startDate && item.endDate) {
        try {
          const start = format(item.startDate, 'MMM dd', { locale: ptBR });
          const end = format(item.endDate, 'MMM dd', { locale: ptBR });
          const year = format(item.endDate, 'yyyy');
          
          updateItem(index, 'date', `${start} - ${end} ${year}`);
        } catch (error) {
          console.error('Error formatting dates:', error);
          // Fallback to a safe default
          updateItem(index, 'date', '');
        }
      }
      setIsOpen(false);
    };
    
    const handleClear = () => {
      updateItem(index, 'startDate', null);
      updateItem(index, 'endDate', null);
      updateItem(index, 'date', '');
      setIsOpen(false);
    };

    return (
      <div className="date-range-container" ref={datePickerRef}>
        <button 
          type="button"
          className="w-full flex items-center justify-between border border-input rounded-md px-3 py-2 text-sm bg-background date-range-selector cursor-pointer"
          onClick={handleOpenCalendar}
        >
          <span className="flex-grow truncate text-left">
            {item.date || "Select date range"}
          </span>
          <CalendarIcon className="h-4 w-4 opacity-70" />
        </button>
        
        {isOpen && (
          <div className="absolute z-50 mt-1 bg-background border border-input rounded-md shadow-lg p-4 date-range-popover">
            <div className="flex gap-4 mb-4">
              <div>
                <Label className="mb-2 block">Start Date</Label>
                <DatePicker
                  selected={item.startDate}
                  onChange={(date: Date | null) => {
                    if (date !== null) {
                      try {
                        updateItem(index, 'startDate', date);
                      } catch (error) {
                        console.error('Error updating startDate:', error);
                      }
                    }
                  }}
                  selectsStart
                  startDate={item.startDate || undefined}
                  endDate={item.endDate || undefined}
                  dateFormat="MMM dd, yyyy"
                  className="border border-input rounded-md p-2 text-sm bg-background w-full"
                  calendarClassName="bg-background"
                />
              </div>
              <div>
                <Label className="mb-2 block">End Date</Label>
                <DatePicker
                  selected={item.endDate}
                  onChange={(date: Date | null) => {
                    if (date !== null) {
                      try {
                        updateItem(index, 'endDate', date);
                      } catch (error) {
                        console.error('Error updating endDate:', error);
                      }
                    }
                  }}
                  selectsEnd
                  startDate={item.startDate || undefined}
                  endDate={item.endDate || undefined}
                  minDate={item.startDate || undefined}
                  dateFormat="MMM dd, yyyy"
                  className="border border-input rounded-md p-2 text-sm bg-background w-full"
                  calendarClassName="bg-background"
                />
              </div>
            </div>
            <div className="flex justify-between">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive/90"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={handleApply}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Sender Information</h3>
                  
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
                        <FormLabel>VAT Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Client Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="toCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Company</FormLabel>
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
                        <FormLabel>Client Address</FormLabel>
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
                        <FormLabel>EIN Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Invoice Items</h3>
                  <Button type="button" variant="outline" onClick={addItem}>Add Item</Button>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-md">
                    <div className="md:col-span-4">
                      <Label htmlFor={`item-${index}-description`}>Description</Label>
                      <Input
                        id={`item-${index}-description`}
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Service description"
                      />
                    </div>
                    
                    <div className="md:col-span-3">
                      <Label htmlFor={`item-${index}-date`}>Date</Label>
                      <DateRangePicker index={index} item={item} />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label htmlFor={`item-${index}-rate`}>Rate ($)</Label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input
                          id={`item-${index}-rate`}
                          type="text"
                          value={item.rate}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d.,]/g, '');
                            updateItem(index, 'rate', value);
                          }}
                          onFocus={() => {
                            if (item.rate === '0.00') {
                              updateItem(index, 'rate', '');
                            }
                          }}
                          onBlur={(e) => {
                            updateItem(index, 'rate', formatCurrency(e.target.value));
                          }}
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-3">
                      <Label htmlFor={`item-${index}-total`}>Total ($)</Label>
                      <div className="flex items-center">
                        <div className="relative flex-grow">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                          <Input
                            id={`item-${index}-total`}
                            type="text"
                            value={item.total}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d.,]/g, '');
                              updateItem(index, 'total', value);
                            }}
                            onFocus={() => {
                              if (item.total === '0.00') {
                                updateItem(index, 'total', '');
                              }
                            }}
                            onBlur={(e) => {
                              updateItem(index, 'total', formatCurrency(e.target.value));
                            }}
                            className="pl-7"
                            placeholder="0.00"
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="ml-2 w-10 h-10 p-0 flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end text-lg font-bold">
                  Total: ${calculateTotal()} USD
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notes</h3>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea {...field} rows={2} placeholder="Additional notes for the invoice" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentInfo.accountHolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Holder</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Company or individual name" />
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
                          <Input {...field} placeholder="Bank account number" />
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
                          <Input {...field} placeholder="Bank name and address" />
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
                          <Input {...field} type="email" placeholder="contact@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full">Generate Invoice</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 