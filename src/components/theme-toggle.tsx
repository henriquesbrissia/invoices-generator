'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  value: 'dark' | 'light';
  onChange: (value: 'dark' | 'light') => void;
}

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  
  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return null;
  
  const handleToggle = (checked: boolean) => {
    onChange(checked ? 'dark' : 'light');
  };

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4 text-slate-500" />
      <div className="flex items-center space-x-2">
        <Switch 
          id="theme-toggle"
          checked={value === 'dark'}
          onCheckedChange={handleToggle}
          aria-label="Toggle theme"
        />
        <Label htmlFor="theme-toggle" className="sr-only">
          Toggle theme
        </Label>
      </div>
      <Moon className="h-4 w-4 text-slate-500" />
    </div>
  );
} 