#!/usr/bin/env node
// Usage:
//   SUPABASE_SERVICE_KEY=<your-service-role-key> node scripts/reset-leaderboard.js
//
// Get your service role key from:
//   Supabase dashboard → Settings → API → "service_role" (secret key)
//
// WARNING: This deletes ALL rows from the leaderboard. There is no undo.

const SUPABASE_URL = 'https://qifjlcmyafstvocfrzuc.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY environment variable is not set.');
    console.error('Run: SUPABASE_SERVICE_KEY=<your-key> node scripts/reset-leaderboard.js');
    process.exit(1);
}

async function resetLeaderboard() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?id=gt.0`, {
        method: 'DELETE',
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
    });

    if (!res.ok) {
        const body = await res.text();
        console.error(`Failed (${res.status}): ${body}`);
        process.exit(1);
    }

    const deleted = await res.json();
    console.log(`Leaderboard reset. ${deleted.length} row(s) deleted.`);
}

resetLeaderboard();
