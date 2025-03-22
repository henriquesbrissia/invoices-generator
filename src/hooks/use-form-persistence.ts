import { useEffect, useRef } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';

/**
 * Hook to handle form persistence in localStorage
 * @param form The react-hook-form instance
 * @param storageKey The key to use for localStorage
 * @param transformBeforeSave Optional function to transform data before saving
 * @param transformAfterLoad Optional function to transform data after loading
 */
export function useFormPersistence<T extends FieldValues>(
  form: UseFormReturn<T>,
  storageKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformBeforeSave?: (data: T) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformAfterLoad?: (data: any) => Partial<T>
) {
  // Track if we've initialized from localStorage to avoid overriding user changes
  const initialized = useRef(false);

  // Load saved form data on component mount (only once)
  useEffect(() => {
    // Only load from localStorage if we haven't already initialized
    if (initialized.current) return;
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsedData: any = JSON.parse(savedData);
        
        // Apply transformation if provided
        if (transformAfterLoad) {
          parsedData = transformAfterLoad(parsedData);
        }
        
        // Reset the form with parsed data
        form.reset(parsedData);
        initialized.current = true;
      }
    } catch (error) {
      console.error(`Error loading saved data for ${storageKey}:`, error);
      // Clear corrupted data
      localStorage.removeItem(storageKey);
    }
  }, [form, storageKey, transformAfterLoad]);

  // Save form data to localStorage
  const saveFormData = (data: T) => {
    try {
      // Create a deep copy to avoid reference issues
      const dataCopy = JSON.parse(JSON.stringify(data));
      
      // Apply transformation if provided
      const dataToSave = transformBeforeSave ? transformBeforeSave(dataCopy as T) : dataCopy;
      
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      return true;
    } catch (error) {
      console.error(`Error saving data to ${storageKey}:`, error);
      return false;
    }
  };

  return { saveFormData };
} 