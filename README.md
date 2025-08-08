# Nest - Enterprise Asset Management System

[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, scalable asset management platform built with Next.js, TypeScript, and Supabase. Track, manage, and allocate equipment with real-time updates, automated workflows, and comprehensive reporting.

## ✨ Features

- **🏗️ Asset Management** - Complete equipment lifecycle tracking
- **📱 Responsive Design** - Mobile-first PWA experience
- **🔐 Role-Based Access** - User, Admin, and Super Admin roles
- **📊 Real-time Analytics** - Live dashboards and reporting
- **🔔 Smart Notifications** - Email, in-app, and Google Chat integration
- **📋 Workflow Automation** - Request approval and status management
- **🔍 Advanced Search** - Multi-field filtering and instant results
- **📱 QR Code Integration** - Quick equipment identification

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/nest.git
   cd nest
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Configure your `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_APP_URL=http://localhost:9002
   ```

4. **Run database migrations**

   ```bash
   npx supabase db reset
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:9002](http://localhost:9002) in your browser.

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Deployment**: Vercel
- **Testing**: Jest, React Testing Library
- **Linting**: ESLint, Prettier

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── admin/          # Admin dashboard pages
│   ├── user/           # User interface pages
│   └── api/            # API routes
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   ├── admin/         # Admin-specific components
│   └── user/          # User-specific components
├── hooks/             # Custom React hooks
├── lib/               # Core utilities and configurations
├── services/          # Business logic and API services
└── types/             # TypeScript type definitions
```

## 🔐 User Roles

### User

- Browse and request equipment
- Check-in/out equipment
- View personal history
- Receive notifications

### Admin

- Manage equipment inventory
- Process user requests
- Access analytics dashboard
- Manage user accounts

### Super Admin

- Full system access
- Database management
- System configuration
- Audit controls

## 🚀 Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**

   ```bash
   npm i -g vercel
   vercel --prod
   ```

2. **Configure environment variables** in Vercel dashboard

3. **Set up custom domain** (optional)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | ✅ | Application URL |
| `GOOGLE_CHAT_WEBHOOK_URL` |  ✅ | Google Chat integration |

## 📊 Database Schema

### Core Tables

- **`profiles`** - User accounts and roles
- **`gears`** - Equipment inventory
- **`gear_requests`** - Equipment requests
- **`gear_activity_log`** - Audit trail
- **`notifications`** - System notifications

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📈 Performance

- **Core Web Vitals** optimized
- **Code splitting** for faster loading
- **Image optimization** with Next.js
- **Real-time subscriptions** for live updates
- **Database query optimization**

## 🔒 Security

- **Row Level Security (RLS)** on all tables
- **JWT authentication** with automatic refresh
- **Input validation** with Zod schemas
- **CSRF protection** and XSS prevention
- **Environment variable** security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [docs.nest.edenoasis.com](https://www.nestbyeden.app/documentation)
- **Issues**: [GitHub Issues](https://github.com/your-org/nest/issues)
- **Email**: <gfx2t@edenoasis.com>

---

<div align="center">

**Built with ❤️ by [Daniel Samuel](https://danielsamuel.dev/)**

[Website](https://www.nestbyeden.app/) • [Documentation](https://www.nestbyeden.app/documentation) • [Support](gfx2t@edenoasis.com)

</div>
