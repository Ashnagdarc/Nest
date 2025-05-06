# GearFlow - Equipment Management for Eden Oasis Realty

This is a Next.js application designed to streamline gear management. It uses **Supabase** (PostgreSQL, Authentication, Storage) for the backend and Shadcn/UI with Tailwind CSS for the frontend.

## Getting Started

Follow these steps to get the development environment running:

1.  **Clone the repository (or set it up if you haven't already):**
    ```bash
    git clone https://github.com/DanielNonso12/GearFlow-by-Eden-Oasis.git
    cd GearFlow-by-Eden-Oasis
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    # or
    # pnpm install
    ```

3.  **Set up Supabase Project:**
    *   Create a Supabase project at [https://supabase.com/dashboard/projects](https://supabase.com/dashboard/projects).
    *   Navigate to **Settings** > **API**.
    *   Note down your **Project URL** and **Project API Keys** (`anon` public key).

4.  **Set up Environment Variables:**
    *   Rename the `.env.local.example` file to `.env.local`.
    *   Open `.env.local` and add your Supabase configuration values obtained from the Supabase dashboard:

    ```plaintext
    # .env.local (Supabase Configuration)
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

    # Optional: For server-side admin actions (store this securely)
    # SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

    # Optional: For Genkit/Google AI (if used)
    # GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_API_KEY
    ```
    *   **Make sure these variables are correctly set and saved in `.env.local`.** The application needs these to connect to Supabase.

5.  **Set up Supabase Database Schema:**
    *   Go to your Supabase project dashboard > **SQL Editor**.
    *   Run the SQL script provided in `supabase_schema.sql` to create the necessary tables (`profiles`, `gears`, `requests`, `checkins`, `announcements`, `app_settings`), enums, and policies. This script also sets up Row Level Security (RLS).
    *   The script includes a trigger (`handle_new_user`) to automatically create a `profiles` record when a user signs up via Supabase Auth.

6.  **Generate Supabase Types:**
    *   Install the Supabase CLI if you haven't already (`npm install -g supabase`).
    *   Log in to the Supabase CLI (`supabase login`).
    *   Link your project (`supabase link --project-ref YOUR_PROJECT_REF`). Replace `YOUR_PROJECT_REF` with your Supabase project reference ID.
    *   Generate the types:
        ```bash
        npx supabase gen types typescript --linked --schema public > src/types/supabase.ts
        ```
    *   This command will overwrite `src/types/supabase.ts` with the types generated from your database schema.

7.  **Create the Default Admin User:**
    *   Go to your Supabase project dashboard > **Authentication** > **Users**.
    *   Click **Add user**.
    *   Create a user with the email `admin@gearflow.app` and password `Admin123!`.
    *   **Important:** The SQL script (Step 5) includes an `INSERT` statement that attempts to create the admin profile linked to this Auth user. Ensure the script runs *after* you create the Auth user. If the profile doesn't exist, you might need to manually run the `INSERT` part of the SQL script again or add the profile row via the Supabase table editor. The `id` must match the Auth user's UID.

8.  **Set up Supabase Storage (if needed):**
    *   Go to your Supabase project dashboard > **Storage**.
    *   Create buckets as needed (e.g., `avatars`, `logos`).
    *   Configure Storage policies to control access (e.g., allow authenticated users to upload/download their avatars).

9.  **Run the Development Server:**
    ```bash
    npm run dev
    ```

10. Open [http://localhost:9002](http://localhost:9002) (or your configured port) with your browser to see the result.

## Default Admin Login

*   **Email:** `admin@gearflow.app`
*   **Password:** `Admin123!`
    *(Ensure this user exists in Supabase Authentication and has a corresponding profile row in the `profiles` table - see Step 7)*

## Deployment

Deployment typically involves building the Next.js app and hosting it on a platform like Vercel, Netlify, or using Docker. Ensure your production environment has the necessary Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) configured.

**Example Deployment to Vercel:**

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Connect your repository to Vercel.
3.  Configure the environment variables in your Vercel project settings.
4.  Vercel will automatically build and deploy your Next.js application.

## Key Features

*   User Authentication (Sign up, Login, Forgot Password) with **Supabase Authentication**.
*   Role-based access control (User and Admin) managed via Supabase `profiles` table and RLS policies.
*   **Admin Dashboard:** Manage gears, users, requests, check-ins, announcements, reports, and settings (data stored in Supabase PostgreSQL).
*   **User Dashboard:** Browse gear, submit requests, view request history, check-in equipment, manage personal settings.
*   **Supabase** integration for database (PostgreSQL) and storage (Supabase Storage for avatars, logos).
*   Responsive UI built with Shadcn/UI and Tailwind CSS.
*   Lottie animations for enhanced user feedback.

## Tech Stack

*   **Framework:** Next.js (App Router)
*   **Backend/Database:** **Supabase** (PostgreSQL, Authentication, Storage)
*   **Styling:** Tailwind CSS
*   **UI Components:** Shadcn/UI
*   **Icons:** Lucide React
*   **Animations:** Lottie React
*   **Forms:** React Hook Form + Zod
*   **State Management:** React Context API / Zustand (as needed)
*   **Data Fetching:** React Query / **Supabase Client SDK**

## Troubleshooting

*   **Supabase Connection Errors:** Double-check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correctly set in your `.env.local` file and that the file is named correctly. Restart the development server (`npm run dev`) after modifying `.env.local`.
*   **Login/Profile Issues:** Verify that the SQL script ran successfully and created the tables and RLS policies. Ensure the `handle_new_user` trigger is active. Check that the default admin profile exists in the `profiles` table with the correct Auth UID. Confirm RLS policies are enabled on the necessary tables in the Supabase dashboard.
*   **Type Errors:** Run `npx supabase gen types typescript --linked --schema public > src/types/supabase.ts` again if you've made schema changes.
*   **Deployment Issues:** Ensure environment variables are set correctly in your hosting provider's settings. Check build logs for errors.
