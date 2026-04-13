// functions/create-client.js
// ─────────────────────────────────────────────────────────────
// POST /.netlify/functions/create-client
// Header: Authorization: Bearer <supabase-jwt>
// Body:   { clientName, contactEmail, projectName }
//
// What it does:
//   1. Creates a Supabase Auth user for the client
//   2. Inserts profile row (role=client, client_id)
//   3. Inserts clients row
//   4. Sends branded welcome email via SendGrid
// ─────────────────────────────────────────────────────────────

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

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const { clientName, contactEmail, projectName } = body;
  if (!clientName || !contactEmail)
    return { statusCode: 400, body: "clientName and contactEmail are required" };

  // Service-role client — can bypass RLS
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY   // service_role key (never expose to browser)
  );

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    // 1. Generate slug clientId
    const clientId = clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40);

    // 2. Generate temp password
    const tempPassword = generatePassword();

    // 3. Create Supabase Auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: contactEmail,
      password: tempPassword,
      email_confirm: true,           // skip email verification flow
      user_metadata: { full_name: clientName, client_id: clientId, role: "client" },
    });

    if (authErr) throw new Error("Auth error: " + authErr.message);
    const uid = authData.user.id;

    // 4. Upsert profile row
    const { error: profErr } = await supabase.from("profiles").upsert({
      id: uid,
      email: contactEmail,
      role: "client",
      client_id: clientId,
      full_name: clientName,
    });
    if (profErr) throw new Error("Profile error: " + profErr.message);

    // 5. Upsert client row
    const storagePath = `clients/${clientId}/`;
    const { error: clientErr } = await supabase.from("clients").upsert({
      id: clientId,
      name: clientName,
      email: contactEmail,
      project_name: projectName || "General",
      storage_path: storagePath,
      active: true,
    });
    if (clientErr) throw new Error("Client error: " + clientErr.message);

    // 6. Send branded welcome email
    const portalUrl = process.env.CLIENT_PORTAL_URL || "https://files.duramaxpavingllc.com/client";
    const loginUrl = `${portalUrl}?client=${clientId}`;

    await sgMail.send({
      to: contactEmail,
      from: { email: process.env.ADMIN_EMAIL, name: "Duramax Industrial Paving & Concrete" },
      subject: `Duramax – Your Secure File Portal | ${projectName || clientName}`,
      html: buildEmailHtml({ clientName, projectName, loginUrl, contactEmail, tempPassword }),
      text: buildEmailText({ clientName, projectName, loginUrl, contactEmail, tempPassword }),
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, clientId, uid, message: `Created and emailed ${contactEmail}` }),
    };

  } catch (err) {
    console.error("create-client error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};

// ── Password Generator ───────────────────────────────────────
function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Email Templates ──────────────────────────────────────────
function buildEmailHtml({ clientName, projectName, loginUrl, contactEmail, tempPassword }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f0f2f5;margin:0;padding:0}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #dde0e6}
  .hdr{background:#0f1520;padding:22px 32px;text-align:center;border-bottom:3px solid #2e6db4}
  .hdr h1{font-size:14px;color:#fff;margin:0;letter-spacing:2px;text-transform:uppercase}
  .hdr p{font-size:11px;color:#4a8fd4;margin:4px 0 0;letter-spacing:1px;text-transform:uppercase}
  .body{padding:32px}
  .body p{font-size:15px;color:#3a3f4b;line-height:1.7;margin:0 0 14px}
  .cred{background:#f0f6fd;border:1px solid #b5d4f4;border-radius:6px;padding:18px 22px;margin:20px 0}
  .crow{font-size:14px;margin-bottom:8px;display:flex;gap:12px}
  .clabel{color:#8a9099;width:90px;flex-shrink:0}
  .cval{color:#1a2035;font-weight:600;font-family:monospace}
  .btn{display:block;width:fit-content;margin:24px auto;background:#2e6db4;color:#fff;text-decoration:none;padding:13px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:.5px}
  .note{font-size:13px;color:#8a9099;line-height:1.6;border-top:1px solid #eee;padding-top:16px;margin-top:24px}
  .ftr{background:#f8f9fb;padding:16px 32px;text-align:center;font-size:12px;color:#8a9099;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr"><h1>Duramax Industrial</h1><p>Paving &amp; Concrete LLC</p></div>
  <div class="body">
    <p>Dear <strong>${clientName}</strong>,</p>
    <p>Your secure file portal is ready for project: <strong>${projectName || "General"}</strong>. Upload job site photos and documents with no file size limits.</p>
    <div class="cred">
      <div class="crow"><span class="clabel">Login Email</span><span class="cval">${contactEmail}</span></div>
      <div class="crow"><span class="clabel">Password</span><span class="cval">${tempPassword}</span></div>
    </div>
    <a class="btn" href="${loginUrl}">Access Your File Portal →</a>
    <p class="note">You will be prompted to set a personal password on first login. Your folder is private — only you and the Duramax team can see your files.<br><br>Questions? Call <strong>(877) 812-PAVE</strong> or reply to this email.</p>
  </div>
  <div class="ftr">Duramax Industrial Paving &amp; Concrete, LLC &bull; Wheaton, IL 60187<br>info@DuramaxPavingllc.com &bull; (877) 812-7283</div>
</div>
</body></html>`;
}

function buildEmailText({ clientName, projectName, loginUrl, contactEmail, tempPassword }) {
  return `Dear ${clientName},

Your secure file portal is ready for project: ${projectName || "General"}.

Login Email: ${contactEmail}
Password:    ${tempPassword}

Access your portal: ${loginUrl}

You will be prompted to set a personal password on first login.
Your folder is private — only you and the Duramax team can see your files.

Questions? Call (877) 812-PAVE or email info@DuramaxPavingllc.com

Duramax Industrial Paving & Concrete, LLC — Wheaton, IL 60187`;
}
