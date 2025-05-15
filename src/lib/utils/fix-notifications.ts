import { createClient } from '@/lib/supabase/client';
import { createErrorLogger } from '@/lib/error-handling';

const logError = createErrorLogger('FixNotifications');

export async function fixNotificationPermissions() {
    const supabase = createClient();

    try {
        // First, try to enable RLS using exec_sql
        const { error: rlsError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
            `
        });

        if (rlsError) {
            logError('Failed to enable RLS', {
                error: rlsError
            });
        }

        // Drop existing policies
        const { error: dropError } = await supabase.rpc('exec_sql', {
            sql: `
                DO $$
                DECLARE
                    policy_name text;
                BEGIN
                    FOR policy_name IN (
                        SELECT policyname 
                        FROM pg_policies 
                        WHERE schemaname = 'public' 
                        AND tablename = 'notifications'
                    ) LOOP
                        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', policy_name);
                    END LOOP;
                END $$;
            `
        });

        if (dropError) {
            logError('Failed to drop existing policies', {
                error: dropError
            });
        }

        // Create new policies
        const policies = [
            `
            CREATE POLICY "Users can view their own notifications"
            ON public.notifications
            FOR SELECT
            USING (
                auth.uid() = user_id
                OR 
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                    AND (role = 'Admin' OR role = 'SuperAdmin')
                )
            );
            `,
            `
            CREATE POLICY "Users can update their own notifications"
            ON public.notifications
            FOR UPDATE
            USING (
                auth.uid() = user_id
                OR 
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                    AND (role = 'Admin' OR role = 'SuperAdmin')
                )
            )
            WITH CHECK (
                auth.uid() = user_id
                OR 
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                    AND (role = 'Admin' OR role = 'SuperAdmin')
                )
            );
            `,
            `
            CREATE POLICY "System can insert notifications"
            ON public.notifications
            FOR INSERT
            WITH CHECK (true);
            `,
            `
            CREATE POLICY "Admins can delete notifications"
            ON public.notifications
            FOR DELETE
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                    AND (role = 'Admin' OR role = 'SuperAdmin')
                )
            );
            `
        ];

        // Apply each policy
        for (const policy of policies) {
            const { error: policyError } = await supabase.rpc('exec_sql', {
                sql: policy
            });

            if (policyError) {
                logError('Failed to create policy', {
                    error: policyError,
                    policy
                });
            }
        }

        // Grant permissions
        const { error: grantError } = await supabase.rpc('exec_sql', {
            sql: `
                GRANT SELECT, UPDATE ON public.notifications TO authenticated;
            `
        });

        if (grantError) {
            logError('Failed to grant permissions', {
                error: grantError
            });
        }

        // Create index
        const { error: indexError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE INDEX IF NOT EXISTS idx_notifications_user_read
                ON public.notifications(user_id, read);
            `
        });

        if (indexError) {
            logError('Failed to create index', {
                error: indexError
            });
        }

        return { success: true };
    } catch (error) {
        logError('Unexpected error in fixNotificationPermissions', {
            error
        });
        return { success: false, error };
    }
} 