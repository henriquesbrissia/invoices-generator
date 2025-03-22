# Invoice Generator

A modern, responsive web application for generating professional invoices. Built with Next.js, React, TypeScript, and modern UI frameworks.

## Features

- Easy-to-use invoice form with validation
- Dark and light invoice templates
- PDF export functionality
- Responsive design for all devices
- Form data persistence with localStorage

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Components**: Shadcn UI, Radix UI
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS
- **PDF Generation**: jsPDF

## Architecture Highlights

- **Component Structure**: Modular components with clear separation of concerns
- **Form Validation**: Schema-based validation with Zod
- **State Management**: React Hooks with custom hooks for form persistence
- **Optimization**:
  - Server Components for static parts
  - Client Components only where interactivity is needed
  - Modular file structure with proper naming conventions
  - Reusable components for improved maintainability

## Recent Optimizations

- **Architecture Improvements**:
  - Separated client and server components
  - Implemented React Server Components (RSC) for better performance
  - Modularized components for better maintainability
  
- **Code Quality**:
  - Added Zod schema validation
  - Created reusable components (DateRangePicker, InvoiceItem)
  - Improved type safety throughout the application
  
- **Developer Experience**:
  - Added JSDoc comments for better intellisense
  - Consistent file and component naming conventions
  - Improved code organization with dedicated directories

## Getting Started

### Prerequisites

- Node.js 18.0 or later

### Installation

1. Clone the repository
```bash
git clone https://your-repository-url/invoices-generator.git
cd invoices-generator
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Fill in the invoice form with your details:
   - Sender information
   - Client information
   - Invoice items
   - Payment details

2. Click "Generate Invoice" to view a preview

3. Download the invoice as a PDF file

## License

MIT

## Future Improvements

- Add more invoice templates
- Implement internationalization (i18n) support
- Add cloud storage for invoices
- Integrate payment processing
- Add analytics for invoice tracking
