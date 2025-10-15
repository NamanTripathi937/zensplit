# ZenSplit - Expense Splitter App

A modern expense splitting application built with Next.js 14, TypeScript, and TailwindCSS.

## Features

- 🧾 Track and manage shared expenses
- 👥 Create and manage groups with friends and family
- 💰 Smart expense splitting algorithms
- 📊 Detailed expense reports and analytics
- 🔐 Secure authentication with Supabase
- 📱 Responsive design for all devices

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd zensplit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Database Configuration (for Drizzle ORM)
DATABASE_URL=your_database_url_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # Reusable React components
│   └── Header.tsx      # Navigation header
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
│   ├── supabase.ts     # Supabase client
│   └── validations.ts  # Zod validation schemas
└── types/              # TypeScript type definitions
    └── index.ts        # Main type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.