import { useEffect } from 'react';
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
  // Load saved form data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsedData: any = JSON.parse(savedData);
        
        // Apply transformation if provided
        if (transformAfterLoad) {
          parsedData = transformAfterLoad(parsedData);
        }
        
        form.reset(parsedData);
      } catch (error) {
        console.error(`Error loading saved data for ${storageKey}:`, error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [form, storageKey, transformAfterLoad]);

  // Save form data to localStorage
  const saveFormData = (data: T) => {
    try {
      // Apply transformation if provided
      const dataToSave = transformBeforeSave ? transformBeforeSave(data) : data;
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      return true;
    } catch (error) {
      console.error(`Error saving data to ${storageKey}:`, error);
      return false;
    }
  };

  return { saveFormData };
} 