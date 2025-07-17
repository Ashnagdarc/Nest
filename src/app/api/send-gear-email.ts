// API endpoint for sending gear-related email notifications in Nest by Eden Oasis.

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendGearRequestEmail } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { to, subject, html } = req.body;
    try {
        const result = await sendGearRequestEmail({ to, subject, html });
        res.status(200).json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
} 