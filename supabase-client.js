import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_KEY, GAME_ID, SCORE_SALT } from './constants.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`Supabase initialized targeting: ${SUPABASE_URL}`);

/**
 * Triggers GitHub OAuth Login
 */
export async function signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) console.error('Error logging in:', error.message);
}

/**
 * Signs out current user
 */
export async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
}

/**
 * Saves score to the leaderboard for a specific game
 */
export async function saveScore(score, linesCleared, level) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const avatarUrl = user.user_metadata.avatar_url || '';

    // Generate Checksum: hash(score + lines + level + gameId + userId + salt)
    const message = `${score}:${linesCleared}:${level}:${GAME_ID}:${user.id}:${avatarUrl}:${SCORE_SALT}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const checksum = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const { data: invokeData, error } = await supabase.functions.invoke('validate-score', {
        body: { 
            score, 
            lines_cleared: linesCleared, 
            level, 
            game_id: GAME_ID, 
            checksum,
            avatar_url: avatarUrl
        }
    });

    if (error) {
        if (error.status === 404 || error.message.includes('404')) {
            console.error('Leaderboard Error: validate-score Edge Function not found. Did you run "supabase functions serve"?');
            return { error: 'Validation service offline' };
        } else {
            console.error('Error invoking validate-score:', error.message);
            return { error: error.message };
        }
    }
    return invokeData || { error: 'Unknown validation error' };
}

/**
 * Fetches top scores for a specific game
 */
export async function getTopScores(limit = 10) {
    const { data, error } = await supabase.from('leaderboard')
        .select('username, score, avatar_url, github_id')
        .eq('game_id', GAME_ID)
        .order('score', { ascending: false })
        .limit(limit);
    
    return error ? [] : data;
}

/**
 * Fetches personal best score for the current user
 */
export async function getPersonalBest() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from('leaderboard')
        .select('score')
        .eq('game_id', GAME_ID)
        .eq('github_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    return error ? null : (data ? data.score : null);
}