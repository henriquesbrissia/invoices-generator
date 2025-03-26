'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useFormPersistence } from '@/hooks/use-form-persistence';
import { formatDateRange } from '@/lib/utils';
import { InvoiceData, InvoiceItem as InvoiceItemType, IntervalType, DateSegment, invoiceItemSchema, invoicePaymentInfoSchema } from '@/lib/schema';
import { IntervalSelector } from '@/components/interval-selector';
import { DateRangePicker } from '@/components/date-range-picker';
import { 
  differenceInDays, 
  differenceInMonths, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  isWeekend,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { z } from 'zod';

// Create a modified schema that doesn't validate items, since we handle them separately
const formSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  fromCompany: z.string().min(1, "Company name is required"),
  fromAddress: z.string().min(1, "Address is required"),
  fromVat: z.string(),
  toCompany: z.string().min(1, "Client company name is required"),
  toAddress: z.string().min(1, "Client address is required"),
  toEin: z.string(),
  items: z.array(invoiceItemSchema).optional().default([]), // Made optional
  notes: z.string(),
  paymentInfo: invoicePaymentInfoSchema
});

// Type for our modified form schema
type FormData = z.infer<typeof formSchema>;

interface InvoiceFormProps {
  onSubmit: (data: InvoiceData) => void;
}

// Interface for our interval item cards
interface IntervalItemCard {
  id: string;
  intervalType: IntervalType;
  startDate: Date | null;
  endDate: Date | null;
  segmentCount: number;
  segments: Array<DateSegment> | null;
  amount: string;
  description: string;
}

// Function to calculate date segments based on interval type
const calculateDateSegments = (
  start: Date, 
  end: Date, 
  interval: IntervalType
) => {
  let segments: Array<DateSegment> = [];
  let segmentCount = 0;

  try {
    // Ensure end date is not before start date
    if (end < start) {
      return { segments: null, segmentCount: 0 };
    }

    switch (interval) {
      case 'day':
        // Each day is a segment
        segmentCount = differenceInDays(end, start) + 1;
        segments = eachDayOfInterval({ start, end }).map(date => ({
          start: date,
          end: date
        }));
        break;
        
      case 'week':
        // Each week is a segment
        segments = eachWeekOfInterval(
          { start, end },
          { weekStartsOn: 1 } // 1 = Monday
        ).map(weekStart => {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 4);
          
          // Ensure we don't exceed the selected end date
          const adjustedEnd = weekEnd > end ? end : weekEnd;
          
          return {
            start: weekStart,
            end: adjustedEnd
          };
        });
        segmentCount = segments.length;
        break;
        
      case 'weekend':
        // Each weekend day (Saturday and Sunday) is a segment
        const allDays = eachDayOfInterval({ start, end });
        segments = allDays
          .filter(date => isWeekend(date))
          .map(date => ({
            start: date,
            end: date
          }));
        segmentCount = segments.length;
        break;
        
      case 'month':
        // Each month is a segment
        segmentCount = differenceInMonths(end, start) + 1;
        
        if (segmentCount <= 0) {
          // Handle case where dates are in the same month
          segments = [{
            start: start,
            end: end
          }];
          segmentCount = 1;
        } else {
          // Create segments for each month
          let currentMonth = startOfMonth(start);
          
          for (let i = 0; i < segmentCount; i++) {
            const monthStart = i === 0 ? start : startOfMonth(currentMonth);
            const monthEnd = i === segmentCount - 1 ? end : endOfMonth(currentMonth);
            
            segments.push({
              start: monthStart,
              end: monthEnd
            });
            
            // Move to next month
            currentMonth = new Date(currentMonth);
            currentMonth.setMonth(currentMonth.getMonth() + 1);
          }
        }
        break;
    }

    return { segments, segmentCount };
  } catch (err) {
    console.error("Error calculating segments:", err);
    return { segments: null, segmentCount: 0 };
  }
};

export function InvoiceForm({ onSubmit }: InvoiceFormProps) {
  // Replace items state with interval cards
  const [intervalCards, setIntervalCards] = useState<IntervalItemCard[]>([
    {
      id: crypto.randomUUID(),
      intervalType: 'day',
      startDate: null,
      endDate: null,
      segmentCount: 0,
      segments: null,
      amount: '0.00',
      description: ''
    }
  ]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: `#${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
      fromCompany: '',
      fromAddress: '',
      fromVat: '',
      toCompany: '',
      toAddress: '',
      toEin: '',
      items: [],
      notes: '',
      paymentInfo: {
        accountHolder: '',
        accountNumber: '',
        bankAddress: '',
        swiftNumber: '',
        contactEmail: ''
      }
    },
    mode: 'onChange'
  });

  // Add effect to save form data on field changes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log('Form field changed:', { name, type, value });
      const formData = form.getValues();
      localStorage.setItem('invoiceFormData', JSON.stringify(formData));
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Add effect to load interval cards on mount
  useEffect(() => {
    try {
      const savedIntervalCards = localStorage.getItem('invoiceIntervalCards');
      if (savedIntervalCards) {
        const parsedCards = JSON.parse(savedIntervalCards);
        const restoredCards: IntervalItemCard[] = parsedCards.map((card: Record<string, unknown>) => ({
          ...card,
          startDate: card.startDate ? new Date(card.startDate as string) : null,
          endDate: card.endDate ? new Date(card.endDate as string) : null,
          segments: card.segments ? (card.segments as Array<Record<string, unknown>>).map((segment: Record<string, unknown>) => ({
            start: new Date(segment.start as string),
            end: new Date(segment.end as string)
          })) : null
        }));
        setIntervalCards(restoredCards);
      }
    } catch (error) {
      console.error('Error loading saved interval cards:', error);
    }
  }, []); // Only run on mount

  // Define helper functions for serialization/deserialization
  const serializeItems = (items: InvoiceItemType[]) => {
    return items.map(item => ({
      ...item,
      startDate: item.startDate ? (item.startDate instanceof Date ? item.startDate.toISOString() : item.startDate) : null,
      endDate: item.endDate ? (item.endDate instanceof Date ? item.endDate.toISOString() : item.endDate) : null,
      segments: item.segments ? item.segments.map(segment => ({
        start: segment.start instanceof Date ? segment.start.toISOString() : segment.start,
        end: segment.end instanceof Date ? segment.end.toISOString() : segment.end
      })) : null
    }));
  };

  // Helper to serialize interval cards
  const serializeIntervalCards = (cards: IntervalItemCard[]) => {
    return cards.map(card => ({
      ...card,
      startDate: card.startDate ? (card.startDate instanceof Date ? card.startDate.toISOString() : card.startDate) : null,
      endDate: card.endDate ? (card.endDate instanceof Date ? card.endDate.toISOString() : card.endDate) : null,
      segments: card.segments ? card.segments.map(segment => ({
        start: segment.start instanceof Date ? segment.start.toISOString() : segment.start,
        end: segment.end instanceof Date ? segment.end.toISOString() : segment.end
      })) : null
    }));
  };

  // Handle form persistence with custom transformations
  const { saveFormData } = useFormPersistence<InvoiceData>(
    form,
    'invoiceFormData',
    (data) => {
      try {
        // Create a safe copy before transforming
        const dataClone = JSON.parse(JSON.stringify(data));
        
        // Apply serialization to dates
        if (dataClone.items && Array.isArray(dataClone.items)) {
          // Use specific type for serialized items
          dataClone.items = serializeItems(dataClone.items);
        }
        
        // Store the interval cards separately
        if (intervalCards.length > 0) {
          localStorage.setItem('invoiceIntervalCards', JSON.stringify(serializeIntervalCards(intervalCards)));
        }
        
        return dataClone;
      } catch (error) {
        console.error('Error serializing form data:', error);
        return data; // Return original data if serialization fails
      }
    },
    (loadedData) => {
      try {
        // Transform dates back to Date objects after loading from localStorage
        if (loadedData.items && Array.isArray(loadedData.items)) {
          loadedData.items = loadedData.items.map((item: unknown) => {
            const typedItem = item as Record<string, unknown>;
            return {
              ...item as Omit<InvoiceItemType, 'startDate' | 'endDate' | 'segments'>,
              startDate: typedItem.startDate ? new Date(typedItem.startDate as string) : null,
              endDate: typedItem.endDate ? new Date(typedItem.endDate as string) : null,
              segments: typedItem.segments ? (typedItem.segments as Array<Record<string, unknown>>).map((segment: Record<string, unknown>) => ({
                start: new Date(segment.start as string),
                end: new Date(segment.end as string)
              })) : null
            };
          });
        }
        
        return loadedData;
      } catch (error) {
        console.error('Error deserializing form data:', error);
        return loadedData; // Return original data if deserialization fails
      }
    }
  );

  const addIntervalCard = () => {
    setIntervalCards([
      ...intervalCards, 
      {
        id: crypto.randomUUID(),
        intervalType: 'day',
        startDate: null,
        endDate: null,
        segmentCount: 0,
        segments: null,
        amount: '0.00',
        description: ''
      }
    ]);
  };

  const removeIntervalCard = (id: string) => {
    if (intervalCards.length === 1) {
      return; // Prevent removing the last card
    }
    setIntervalCards(intervalCards.filter(card => card.id !== id));
  };

  const updateIntervalCard = (id: string, field: keyof IntervalItemCard, value: unknown) => {
    setIntervalCards(
      intervalCards.map(card => 
        card.id === id ? { ...card, [field]: value } : card
      )
    );
  };

  // Update interval properties for a card
  const handleIntervalChange = (id: string, intervalType: IntervalType) => {
    // Find the current card
    const currentCard = intervalCards.find(card => card.id === id);
    if (!currentCard) return;

    // If we have valid dates, recalculate segments
    if (currentCard.startDate && currentCard.endDate) {
      const { segments, segmentCount } = calculateDateSegments(
        currentCard.startDate,
        currentCard.endDate,
        intervalType
      );

      // Update the card with new interval type and recalculated segments
      setIntervalCards(
        intervalCards.map(card => 
          card.id === id ? { 
            ...card, 
            intervalType,
            segments,
            segmentCount
          } : card
        )
      );
    } else {
      // If no dates, just update the interval type
      setIntervalCards(
        intervalCards.map(card => 
          card.id === id ? { ...card, intervalType } : card
        )
      );
    }
    
    // Save interval cards to localStorage
    localStorage.setItem('invoiceIntervalCards', JSON.stringify(serializeIntervalCards(intervalCards)));
    
    // This is a workaround to ensure the form knows something has changed
    const currentItems = form.getValues('items');
    form.setValue('items', [...(currentItems || [])], { shouldDirty: true });
  };

  // Update date range for a card
  const handleDatesChange = (
    id: string, 
    startDate: Date | null, 
    endDate: Date | null, 
    segmentCount: number,
    segments: Array<DateSegment> | null
  ) => {
    // Update all date-related properties in a single operation
    const updatedCards = intervalCards.map(card => 
      card.id === id ? { 
        ...card, 
        startDate, 
        endDate, 
        segmentCount, 
        segments 
      } : card
    );
    
    setIntervalCards(updatedCards);
    
    // Save interval cards to localStorage
    localStorage.setItem('invoiceIntervalCards', JSON.stringify(serializeIntervalCards(updatedCards)));
    
    // This is a workaround to ensure the form knows something has changed
    const currentItems = form.getValues('items');
    form.setValue('items', [...(currentItems || [])], { shouldDirty: true });
  };

  // Update amount for a card
  const handleAmountChange = (id: string, value: string) => {
    // Remove non-numeric characters except period
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Ensure valid float format with 2 decimal places
    let formattedValue = '0.00';
    if (numericValue !== '') {
      const floatValue = parseFloat(numericValue);
      if (!isNaN(floatValue)) {
        formattedValue = floatValue.toFixed(2);
      }
    }
    
    // Update the card
    const updatedCards = intervalCards.map(card => 
      card.id === id ? { ...card, amount: formattedValue } : card
    );
    
    setIntervalCards(updatedCards);
    
    // Save interval cards to localStorage
    localStorage.setItem('invoiceIntervalCards', JSON.stringify(serializeIntervalCards(updatedCards)));
    
    // This is a workaround to ensure the form knows something has changed
    const currentItems = form.getValues('items');
    form.setValue('items', [...(currentItems || [])], { shouldDirty: true });
  };

  // Update description for a card
  const handleDescriptionChange = (id: string, value: string) => {
    // Update the card
    const updatedCards = intervalCards.map(card => 
      card.id === id ? { ...card, description: value } : card
    );
    
    setIntervalCards(updatedCards);
    
    // Save interval cards to localStorage
    localStorage.setItem('invoiceIntervalCards', JSON.stringify(serializeIntervalCards(updatedCards)));
    
    // This is a workaround to ensure the form knows something has changed
    const currentItems = form.getValues('items');
    form.setValue('items', [...(currentItems || [])], { shouldDirty: true });
  };

  // Calculate total based on all interval cards
  const calculateTotal = () => {
    return intervalCards.reduce((sum, card) => {
      const amount = parseFloat(card.amount || '0');
      const count = card.segmentCount || 0;
      return sum + (amount * count);
    }, 0).toFixed(2);
  };

  // Convert interval cards to invoice items for submission
  const generateInvoiceItems = (): InvoiceItemType[] => {
    const items: InvoiceItemType[] = [];
    
    // Check if we have any valid cards with segments
    const hasValidItems = intervalCards.some(card => 
      card.startDate && card.endDate && card.segments && card.segmentCount > 0
    );
    
    // If no valid cards with complete data, create a simple item for each card
    if (!hasValidItems) {
      intervalCards.forEach(card => {
        const amount = parseFloat(card.amount) || 0;
        items.push({
          description: card.description || 'Service',
          date: card.startDate && card.endDate 
            ? formatDateRange(card.startDate, card.endDate) 
            : new Date().toLocaleDateString(),
          startDate: card.startDate || new Date(),
          endDate: card.endDate || new Date(),
          rate: '0.00',
          total: amount.toFixed(2),
          intervalType: card.intervalType,
          segmentCount: 1,
          segments: card.segments || null
        });
      });
      return items;
    }
    
    // Process cards with complete segment data
    intervalCards.forEach(card => {
      if (!card.startDate || !card.endDate || !card.segments || card.segmentCount === 0) {
        // For incomplete cards, still create a basic item
        const amount = parseFloat(card.amount) || 0;
        items.push({
          description: card.description || 'Service',
          date: new Date().toLocaleDateString(),
          startDate: new Date(),
          endDate: new Date(),
          rate: '0.00',
          total: amount.toFixed(2),
          intervalType: card.intervalType,
          segmentCount: 1,
          segments: null
        });
        return;
      }
      
      const amountPerSegment = parseFloat(card.amount) || 0;
      
      // Create individual items for each segment
      card.segments.forEach(segment => {
        const segmentDateText = formatDateRange(segment.start, segment.end);
        
        const description = card.description || '';
        
        items.push({
          description,
          date: segmentDateText,
          startDate: segment.start,
          endDate: segment.end,
          rate: '0.00', // keeping for compatibility
          total: amountPerSegment.toFixed(2), // each segment has the same amount
          intervalType: card.intervalType,
          segmentCount: 1, // each item represents 1 segment
          segments: [segment] // keep the segment info for reference
        });
      });
    });
    
    return items;
  };

  const handleSubmit = (data: FormData) => {
    try {
      console.log("Form submission started", { formData: data });
      
      // Generate invoice items from interval cards
      const invoiceItems = generateInvoiceItems();
      console.log("Generated invoice items:", invoiceItems);
      
      // Ensure we have at least one item
      if (!invoiceItems.length) {
        alert('Please add at least one service item with all required information');
        return;
      }
      
      // Prepare final data with generated items
      const finalData: InvoiceData = {
        ...data,
        items: invoiceItems
      };
      
      // Log the data being submitted for debugging
      console.log('Submitting invoice data:', finalData);
      
      // Save to localStorage
      saveFormData(finalData);
      
      // Call the onSubmit callback
      onSubmit(finalData);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred when submitting the form. Please try again.');
    }
  };

  // This function directly submits the form, bypassing validation if needed
  const handleManualSubmit = () => {
    try {
      // Force get all values from the form
      const formValues = form.getValues();
      console.log("Form values:", formValues);
      
      // Generate items directly
      const items = generateInvoiceItems();
      console.log("Generated items:", items);
      
      if (items.length === 0) {
        alert('Please add at least one service item with an amount');
        return;
      }
      
      // Create the final data
      const finalData: InvoiceData = {
        ...formValues,
        items: items
      };
      
      // Submit directly
      console.log("Manually submitting:", finalData);
      onSubmit(finalData);
    } catch (error) {
      console.error("Manual submission error:", error);
      alert("Error submitting form: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  // For debugging form state
  console.log("Form state:", {
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    errors: form.formState.errors
  });

  // Update the form's internal items whenever interval cards change
  useEffect(() => {
    try {
      // Generate items only if we have cards with values
      const hasValues = intervalCards.some(card => 
        card.description || parseFloat(card.amount) > 0
      );
      
      if (hasValues) {
        const items = generateInvoiceItems();
        if (items.length > 0) {
          form.setValue('items', items, { shouldValidate: true, shouldDirty: true });
          console.log("Updated form items:", items);
        }
      }
    } catch (error) {
      console.error("Error updating form items:", error);
    }
  }, [intervalCards, form]);

  // Extract the amount handlers as standalone functions
  const handleAmountInputChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw input value without immediate formatting
    const rawValue = e.target.value;
    // Only allow numbers and a single decimal point
    const numericValue = rawValue.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const cleanValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue;
      
    updateIntervalCard(id, 'amount', cleanValue);
  };

  const handleAmountInputBlur = (id: string, e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Format the value properly when field loses focus
    if (value === '') {
      handleAmountChange(id, '0.00');
    } else {
      // Apply proper currency formatting on blur
      const numericValue = value.replace(/[^0-9.]/g, '');
      const floatValue = parseFloat(numericValue);
      if (!isNaN(floatValue)) {
        handleAmountChange(id, floatValue.toFixed(2));
      }
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
                      <Input {...field} placeholder="Your Company Name" />
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
                      <Textarea {...field} rows={3} placeholder="Your Company Address" />
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
                      <Input {...field} placeholder="VAT-12345678" />
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
                      <Input {...field} placeholder="Client Company Name" />
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
                      <Textarea {...field} rows={3} placeholder="Client Company Address" />
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
                      <Input {...field} placeholder="XX-XXXXXXX" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Invoice Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="INV-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardHeader>
          <CardContent className="space-y-8">
            {intervalCards.map((card, index) => (
              <Card key={card.id} className="border border-muted">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                  <CardTitle className="text-base">Item {index + 1}</CardTitle>
                  {intervalCards.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeIntervalCard(card.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-8">
                  {/* Step 1: Description */}
                  <div>
                    <Label className="mb-2 block">Step 1: Add Description</Label>
                    <Input
                      value={card.description}
                      onChange={(e) => handleDescriptionChange(card.id, e.target.value)}
                      placeholder="Design, consulting, development services, etc."
                      className="w-full"
                    />
                  </div>
                  
                  {/* Extract only the Interval Type part from IntervalDateRangePicker */}
                  <div>
                    <Label className="mb-5 block">Step 2: Select Interval Type</Label>
                    <IntervalSelector 
                      value={card.intervalType}
                      onChange={(intervalType) => handleIntervalChange(card.id, intervalType)}
                    />
                  </div>
                  
                  {/* Step 3: Amount per Interval */}
                  <div>
                    <Label className="mb-2 block">Step 3: Define Interval Rate</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                      <Input
                        id={`item-amount-${card.id}`}
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.]?[0-9]{0,2}"
                        value={card.amount === '0.00' ? '' : card.amount}
                        onChange={(e) => handleAmountInputChange(card.id, e)}
                        onBlur={(e) => handleAmountInputBlur(card.id, e)}
                        placeholder="0.00"
                        className="pl-7 w-full"
                      />
                    </div>
                  </div>
                  
                  {/* Step 4: Date Range */}
                  <div>
                    <Label className="mb-2 block">Step 4: Select Date Range</Label>
                    <DateRangePicker
                      startDate={card.startDate}
                      endDate={card.endDate}
                      onApply={(startDate, endDate) => {
                        if (startDate && endDate) {
                          // We need to calculate segments here similarly to the IntervalDateRangePicker
                          const { segments, segmentCount } = calculateDateSegments(
                            startDate, 
                            endDate, 
                            card.intervalType
                          );
                          handleDatesChange(card.id, startDate, endDate, segmentCount, segments);
                        } else {
                          handleDatesChange(card.id, null, null, 0, null);
                        }
                      }}
                    />
                  </div>
                  
                  {/* Display segments info if available */}
                  {card.segments && card.segmentCount > 0 && (
                    <div className="pt-2">
                      <div className="flex justify-between text-sm">
                        <span>Segments:</span>
                        <span className="font-semibold">{card.segmentCount} {card.intervalType}(s)</span>
                      </div>
                      
                      <div className="flex justify-between text-sm mt-1">
                        <span>Amount per {card.intervalType}:</span>
                        <span className="font-semibold">${card.amount || '0.00'}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm mt-1 pt-1 border-t">
                        <span>Total:</span>
                        <span className="font-semibold">
                          ${((parseFloat(card.amount) || 0) * card.segmentCount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={addIntervalCard}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
            
            <div className="flex justify-end mt-6 text-xl font-bold">
              <span>Total: ${calculateTotal()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes Field */}
        <Card>
          <CardHeader>
            <CardTitle>Notes (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Payment is due within 30 days. Thank you for your business."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <Input {...field} placeholder="Account Holder Name" />
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
                    <Input {...field} placeholder="Bank Account Number" />
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
                    <Textarea 
                      {...field} 
                      rows={3} 
                      placeholder="Bank Name and Address"
                      className="resize-none"
                      style={{ whiteSpace: 'pre-wrap', minHeight: '80px' }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentInfo.swiftNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SWIFT Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="SWIFT/BIC code" />
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
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button 
            type="submit" 
            size="lg"
            onClick={(e) => {
              const isValid = form.formState.isValid;
              console.log("Button clicked, form valid:", isValid);
              
              if (!isValid) {
                // If form validation would fail, use manual submission
                e.preventDefault();
                handleManualSubmit();
              }
            }}
          >
            Generate Invoice
          </Button>
        </div>

        {/* Debug section - only visible in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 border border-dashed border-gray-300 rounded-md">
            <details>
              <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
                Debug Info (Development Only)
              </summary>
              <div className="mt-2 text-xs overflow-auto max-h-60">
                <h4 className="font-semibold mb-1">Interval Cards:</h4>
                <pre className="bg-slate-100 p-2 rounded">
                  {JSON.stringify(intervalCards, null, 2)}
                </pre>
                
                <h4 className="font-semibold mt-3 mb-1">Generated Invoice Items:</h4>
                <pre className="bg-slate-100 p-2 rounded">
                  {JSON.stringify(generateInvoiceItems(), null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </form>
    </Form>
  );
} 