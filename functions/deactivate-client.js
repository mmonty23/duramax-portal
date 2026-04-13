// functions/deactivate-client.js
// POST /.netlify/functions/deactivate-client
// Body: { clientId }
// Disables auth login + marks client inactive (files preserved)

const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  if (event.headers["x-admin-secret"] !== process.env.ADMIN_SECRET)
    return { statusCode: 401, body: "Unauthorized" };

  const { clientId } = JSON.parse(event.body || "{}");
  if (!clientId) return { statusCode: 400, body: "clientId required" };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    // Find the user by client_id
    const { data: profile } = await supabase
      .from("profiles").select("id").eq("client_id", clientId).single();

    if (profile) {
      // Ban the user (disables login without deleting)
      await supabase.auth.admin.updateUserById(profile.id, { ban_duration: "876600h" }); // ~100 years
    }

    // Mark client inactive
    await supabase.from("clients").update({ active: false }).eq("id", clientId);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: `Client ${clientId} deactivated` }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
