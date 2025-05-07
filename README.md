# Gear-Flow By EO

A modern web application for managing gear, users, and workflows, built with Next.js, Supabase, and TypeScript.

---

## 🚀 Features
- User authentication and roles (Admin, User)
- Gear management and booking
- Notifications and announcements
- Supabase integration for database and authentication
- Modern UI with Radix UI and Tailwind CSS

---

## 🛠️ Project Structure
```
├── src/                # Main application code
│   ├── app/            # Next.js app directory
│   ├── components/     # React components
│   ├── lib/            # Utilities and Supabase clients
│   ├── services/       # Service logic
│   └── types/          # TypeScript types
├── supabase/           # Database schema and migrations
├── scripts/            # Utility scripts (e.g., admin seeding)
├── public/             # Static assets
├── .env.local          # Environment variables (not committed)
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```

---

## ⚡ Getting Started

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Gear-Flow\ By\ EO
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env.local` file in the project root with the following content:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```
- Get these values from your Supabase project dashboard.
- **Never commit your service role key to public repositories.**

### 4. Database Setup
- The database schema is defined in `supabase/schema.sql`.
- You can apply the schema using the Supabase SQL editor or CLI.

#### Seed a Default Admin User
To create a default admin user (email: `adira@edenoasisrealty.com`, password: `Edenoasis123`):

1. Ensure your `.env.local` is set up as above.
2. Run the seeding script:
   ```bash
   npx ts-node scripts/seedAdmin.ts
   ```

---

## 🧩 Scripts
- `scripts/seedAdmin.ts`: Seeds a default admin user into the database.

---

## 🏗️ Development

### Start the Development Server
```bash
npm run dev
```

The app will be available at [http://localhost:9002](http://localhost:9002) (or the port you specify).

---

## 📝 Environment Variables
| Variable                      | Description                        |
|-------------------------------|------------------------------------|
| NEXT_PUBLIC_SUPABASE_URL      | Your Supabase project URL          |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon/public API key       |
| SUPABASE_SERVICE_ROLE_KEY     | Supabase service role (admin) key  |

---

## 🗃️ Tech Stack
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License
[MIT](LICENSE)
