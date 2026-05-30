#!/usr/bin/env node
// Usage:
//   SUPABASE_SERVICE_KEY=<your-service-role-key> node scripts/print-leaderboard.js

const SUPABASE_URL = 'https://qifjlcmyafstvocfrzuc.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const GAME_ID      = 'tetris-classic';

if (!SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY environment variable is not set.');
    process.exit(1);
}

async function printLeaderboard() {
    const query = new URLSearchParams({
        select: 'username,score',
        game_id: `eq.${GAME_ID}`,
        order: 'score.desc',
        limit: '10'
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?${query}`, {
        method: 'GET',
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        const body = await res.text();
        console.error(`Failed (${res.status}): ${body}`);
        process.exit(1);
    }

    const data = await res.json();
    console.log(`\n--- GLOBAL LEADERBOARD: ${GAME_ID} (Top 10) ---`);
    data.forEach((entry, i) => {
        const rank = (i + 1).toString().padStart(2, ' ');
        const name = (entry.username || 'Anonymous').padEnd(20, ' ');
        console.log(`${rank}. ${name} | ${entry.score.toLocaleString()}`);
    });
    console.log('-------------------------------------------\n');
}

printLeaderboard();