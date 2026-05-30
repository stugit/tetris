#!/usr/bin/env node
// Usage:
//   SUPABASE_SERVICE_KEY=<your-service-role-key> node scripts/print-leaderboard.js
const fs = require('fs');

const SUPABASE_URL = 'https://qifjlcmyafstvocfrzuc.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY;
const GAME_ID      = 'tetris-classic';

if (!SERVICE_KEY) {
    console.error('Error: SUPABASE_SERVICE_KEY environment variable is not set.');
    console.error('Local: Run as "SUPABASE_SERVICE_KEY=xyz node scripts/print-leaderboard.js"');
    console.error('GitHub: Add "SUPABASE_SERVICE_KEY" to your Repository Secrets.');
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
    
    let output = `\n--- GLOBAL LEADERBOARD: ${GAME_ID} (Top 10) ---\n`;
    let markdown = `### 🏆 Global Leaderboard: ${GAME_ID}\n\n| Rank | Username | Score |\n| :--- | :--- | :--- |\n`;

    data.forEach((entry, i) => {
        const rank = (i + 1).toString().padStart(2, ' ');
        const username = entry.username || 'Anonymous';
        const name = username.padEnd(20, ' ');
        
        output += `${rank}. ${name} | ${entry.score.toLocaleString()}\n`;
        markdown += `| ${i + 1} | ${username} | ${entry.score.toLocaleString()} |\n`;
    });

    console.log(output);
    console.log('-------------------------------------------\n');

    // If running in GitHub Actions, append to the Step Summary
    if (SUMMARY_FILE) {
        fs.appendFileSync(SUMMARY_FILE, markdown);
    }
}

printLeaderboard();