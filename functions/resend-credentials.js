// functions/resend-credentials.js
// POST /.netlify/functions/resend-credentials
// Body: { clientId }

const { createClient } = require("@supabase/supabase-js");
const sgMail = require("@sendgrid/mail");
const { verifyAdmin } = require("./verify-admin");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode: 405, body: "Method Not Allowed" };

  // Verify caller is a logged-in admin via their Supabase JWT
  const auth = await verifyAdmin(event);
  if (auth.error) {
    return { statusCode: auth.statusCode, body: JSON.stringify({ success: false, error: auth.error }) };
  }

  const { clientId } = JSON.parse(event.body || "{}");
  if (!clientId) return { statusCode: 400, body: "clientId required" };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    // Get client record
    const { data: client, error: cErr } = await supabase
      .from("clients").select("*").eq("id", clientId).single();
    if (cErr || !client) throw new Error("Client not found");

    // Get profile to find uid
    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("id").eq("client_id", clientId).single();
    if (pErr || !profile) throw new Error("Profile not found");

    // Generate new temp password
    const tempPassword = generatePassword();

    // Update auth user password
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password: tempPassword }
    );
    if (updateErr) throw new Error("Password update failed: " + updateErr.message);

    // Re-send email
    const portalUrl = process.env.CLIENT_PORTAL_URL || "https://files.duramaxpavingllc.com/client";
    const loginUrl = `${portalUrl}?client=${clientId}`;

    await sgMail.send({
      to: client.email,
      from: { email: process.env.ADMIN_EMAIL, name: "Duramax Industrial Paving & Concrete" },
      subject: `Duramax – Updated Portal Access | ${client.project_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px;background:#fff;border-radius:8px;border:1px solid #dde0e6">
          <div style="background:#0f1520;padding:18px 24px;border-radius:6px 6px 0 0;border-bottom:3px solid #2e6db4;text-align:center;margin:-32px -32px 24px">
            <h2 style="color:#fff;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase">Duramax Industrial</h2>
            <p style="color:#4a8fd4;font-size:11px;margin:3px 0 0;letter-spacing:1px;text-transform:uppercase">Paving & Concrete LLC</p>
          </div>
          <p style="color:#3a3f4b;font-size:15px;line-height:1.7">Your login credentials have been reset. Use the details below to access your portal:</p>
          <div style="background:#f0f6fd;border:1px solid #b5d4f4;border-radius:6px;padding:16px 20px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:14px"><span style="color:#8a9099;width:80px;display:inline-block">Email</span> <strong style="font-family:monospace">${client.email}</strong></p>
            <p style="margin:0;font-size:14px"><span style="color:#8a9099;width:80px;display:inline-block">Password</span> <strong style="font-family:monospace">${tempPassword}</strong></p>
          </div>
          <a href="${loginUrl}" style="display:block;width:fit-content;margin:20px auto;background:#2e6db4;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Access My Portal →</a>
          <p style="font-size:13px;color:#8a9099;margin-top:20px;border-top:1px solid #eee;padding-top:16px">Questions? Call (877) 812-PAVE</p>
        </div>`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Password reset and email sent" }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
