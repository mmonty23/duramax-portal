// functions/verify-admin.js
// ─────────────────────────────────────────────────────────────
// Shared helper: verifies the caller is a logged-in admin
// by checking their Supabase JWT against the profiles table.
// ─────────────────────────────────────────────────────────────

const { createClient } = require("@supabase/supabase-js");

/**
 * Extracts the Bearer token from the request, verifies it with
 * Supabase, and confirms the user has role = 'admin' in profiles.
 *
 * Returns { user, error, statusCode }
 *   - On success: user is the Supabase auth user object
 *   - On failure: error is a message string, statusCode is the HTTP code
 */
async function verifyAdmin(event) {
    const authHeader = event.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
        return { user: null, error: "Missing authorization token", statusCode: 401 };
    }

    // Use service-role client to look up the user from their JWT
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );

    // Verify the JWT and get the user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user) {
        return { user: null, error: "Invalid or expired token", statusCode: 401 };
    }

    // Check that this user is actually an admin
    const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profErr || !profile || profile.role !== "admin") {
        return { user: null, error: "Access denied — admin role required", statusCode: 403 };
    }

    return { user, error: null, statusCode: 200 };
}

module.exports = { verifyAdmin };
