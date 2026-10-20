import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { db, withTransaction } from "../config/db.js";
import { sendVerificationCode } from "../services/email.js";

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "12h" });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    nick: user.nick,
    age: user.age == null ? null : Number(user.age),
    kontakt_informacija: user.kontakt_informacija,
    avatar: user.avatar || "",
    ir_banots: user.ir_banots,
    isAdmin: user.is_admin,
  };
}

function verificationHash(email, code) {
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(`${email}:${code}`)
    .digest("hex");
}

function sameHash(left, right) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function createEmailCode(email) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = verificationHash(email, code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  return { code, codeHash, expiresAt };
}

export async function register(req, res) {
  const { email, nick, kontakt_informacija = "", password, age } = req.body;
  if (typeof email !== "string" || email.trim().length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (typeof nick !== "string" || !/^[A-Za-z0-9_]{2,50}$/.test(nick.trim())) {
    return res.status(400).json({ error: "Nickname must contain 2 to 50 English letters, numbers, or underscores." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must contain at least 8 characters." });
  }
  if (!Number.isInteger(Number(age)) || Number(age) < 12 || Number(age) > 99) {
    return res.status(400).json({ error: "Age must be an integer between 12 and 99." });
  }
  if (typeof kontakt_informacija !== "string" || kontakt_informacija.length > 200) {
    return res.status(400).json({ error: "Contact information must be at most 200 characters." });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNick = nick.trim();
    const existing = await db.query(
      `SELECT id FROM lietotajs WHERE email = ? OR nick = ?
       UNION ALL
       SELECT id FROM email_registration_verification WHERE email = ? OR nick = ?
       LIMIT 1`,
      [normalizedEmail, normalizedNick, normalizedEmail, normalizedNick],
    );
    if (existing.rows[0]) return res.status(409).json({ error: "Email or nickname is already in use." });

    const passwordHash = await bcrypt.hash(password, 12);
    const { code, codeHash, expiresAt } = await createEmailCode(normalizedEmail);
    await db.query(
      `INSERT INTO email_registration_verification
         (email, nick, age, contact, password_hash, code_hash, expires_at, last_sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        normalizedEmail,
        normalizedNick,
        Number(age),
        kontakt_informacija.trim() || null,
        passwordHash,
        codeHash,
        expiresAt,
      ],
    );
    try {
      await sendVerificationCode(normalizedEmail, code);
    } catch (mailError) {
      await db.query(
        "DELETE FROM email_registration_verification WHERE email = ? AND code_hash = ?",
        [normalizedEmail, codeHash],
      );
      if (mailError.message.startsWith("Email verification is not configured") || mailError.message.startsWith("SMTP_PORT")) {
        return res.status(503).json({ error: "Email verification is temporarily unavailable. Please try again later." });
      }
      throw mailError;
    }
    return res.status(202).json({ verificationRequired: true, email: normalizedEmail });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email or nickname is already in use." });
    throw error;
  }
}

export async function verifyRegistration(req, res) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const code = req.body?.code;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Enter a valid email address and 6-digit code." });
  }

  try {
    const user = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT email, nick, age, contact, password_hash, code_hash, attempts,
                (expires_at > CURRENT_TIMESTAMP) AS is_valid
         FROM email_registration_verification
         WHERE email = ? FOR UPDATE`,
        [email],
      );
      const pending = rows[0];
      if (!pending) return { status: "missing" };
      if (!pending.is_valid) {
        await client.query("DELETE FROM email_registration_verification WHERE email = ?", [email]);
        return { status: "expired" };
      }
      const codeMatches = sameHash(verificationHash(email, code), pending.code_hash);
      if (!codeMatches) {
        if (Number(pending.attempts) >= 4) {
          await client.query("DELETE FROM email_registration_verification WHERE email = ?", [email]);
          return { status: "locked" };
        }
        await client.query(
          "UPDATE email_registration_verification SET attempts = attempts + 1 WHERE email = ?",
          [email],
        );
        return { status: "invalid" };
      }
      if (!Number.isInteger(Number(pending.age)) || Number(pending.age) < 12 || Number(pending.age) > 99) {
        await client.query("DELETE FROM email_registration_verification WHERE email = ?", [email]);
        return { status: "age-required" };
      }

      const inserted = await client.query(
        `INSERT INTO lietotajs (email, nick, age, kontakt_informacija, password_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [pending.email, pending.nick, pending.age, pending.contact, pending.password_hash],
      );
      await client.query("DELETE FROM email_registration_verification WHERE email = ?", [email]);
      const created = await client.query(
        "SELECT id, email, nick, age, kontakt_informacija, avatar, ir_banots FROM lietotajs WHERE id = ?",
        [inserted.insertId],
      );
      return { status: "verified", user: { ...created.rows[0], is_admin: false } };
    });

    if (user.status === "missing") return res.status(404).json({ error: "Verification request not found. Please register again." });
    if (user.status === "expired") return res.status(400).json({ error: "Verification code expired. Request a new code." });
    if (user.status === "locked") return res.status(429).json({ error: "Too many incorrect codes. Register again to receive a new code." });
    if (user.status === "invalid") return res.status(400).json({ error: "Incorrect verification code." });
    if (user.status === "age-required") return res.status(400).json({ error: "This registration predates age verification. Register again and enter an age from 12 to 99." });
    return res.status(201).json({ token: createToken(user.user), user: publicUser(user.user) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email or nickname is already in use." });
    throw error;
  }
}

export async function resendRegistrationCode(req, res) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  const { rows } = await db.query(
    `SELECT email, (TIMESTAMPDIFF(SECOND, last_sent_at, CURRENT_TIMESTAMP) < 60) AS cooldown,
            (expires_at > CURRENT_TIMESTAMP) AS is_valid
     FROM email_registration_verification WHERE email = ?`,
    [email],
  );
  const pending = rows[0];
  if (!pending) return res.json({ sent: true });
  if (pending.cooldown) return res.status(429).json({ error: "Please wait a minute before requesting another code." });

  try {
    const { code, codeHash, expiresAt } = await createEmailCode(email);
    await sendVerificationCode(email, code);
    await db.query(
      `UPDATE email_registration_verification
       SET code_hash = ?, expires_at = ?, last_sent_at = CURRENT_TIMESTAMP, attempts = 0
       WHERE email = ?`,
      [codeHash, expiresAt, email],
    );
    return res.json({ sent: true });
  } catch (error) {
    if (error.message.startsWith("Email verification is not configured") || error.message.startsWith("SMTP_PORT")) {
      return res.status(503).json({ error: "Email verification is temporarily unavailable. Please try again later." });
    }
    throw error;
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.nick, u.age, u.kontakt_informacija, u.avatar, u.password_hash,
            EXISTS (SELECT 1 FROM admin a WHERE a.id = u.id) AS is_admin,
            EXISTS (SELECT 1 FROM lietotaja_bans b WHERE b.lietotajs_id = u.id
              AND b.ir_aktivs = 'ir' AND (b.beigu_datums IS NULL OR b.beigu_datums > CURRENT_TIMESTAMP)) AS ir_banots
     FROM lietotajs u WHERE lower(u.email) = lower(?)`,
    [email.trim()],
  );
  const user = rows[0];
  if (!user || typeof user.password_hash !== "string" || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  if (user.ir_banots) return res.status(403).json({ error: "This account is banned." });
  return res.json({ token: createToken(user), user: publicUser(user) });
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function updateMe(req, res) {
  const { email, nick, age, contact = "", avatar = "", currentPassword, newPassword } = req.body;
  const passwordToSet = newPassword === "" ? null : newPassword;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 100) {
    return res.status(400).json({ error: "Enter a valid email address of at most 100 characters." });
  }
  if (typeof nick !== "string" || nick.trim().length < 2 || nick.trim().length > 50
    || (nick.trim() !== req.user.nick && !/^[A-Za-z0-9_]+$/.test(nick.trim()))) {
    return res.status(400).json({ error: "Nickname must contain 2 to 50 English letters, numbers, or underscores." });
  }
  if (!Number.isInteger(Number(age)) || Number(age) < 12 || Number(age) > 99) {
    return res.status(400).json({ error: "Age must be an integer between 12 and 99." });
  }
  if (typeof contact !== "string" || contact.length > 200) {
    return res.status(400).json({ error: "Contact information must be at most 200 characters." });
  }
  if (typeof avatar !== "string" || avatar.length > 150_000
    || (avatar && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar))) {
    return res.status(400).json({ error: "Avatar must be a supported image under 150 KB." });
  }
  if (passwordToSet != null && (typeof passwordToSet !== "string" || passwordToSet.length < 8 || passwordToSet.length > 100)) {
    return res.status(400).json({ error: "New password must contain 8 to 100 characters." });
  }
  if (passwordToSet && typeof currentPassword !== "string") {
    return res.status(400).json({ error: "Enter your current password to change it." });
  }

  const { rows } = await db.query(
    "SELECT password_hash FROM lietotajs WHERE id = ?",
    [req.user.id],
  );
  const credentialsChanged = email.trim().toLowerCase() !== req.user.email.toLowerCase()
    || nick.trim() !== req.user.nick
    || Boolean(passwordToSet);
  if (credentialsChanged) {
    const passwordMatches = typeof currentPassword === "string"
      && typeof rows[0]?.password_hash === "string"
      && await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!passwordMatches) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }
  }

  try {
    const passwordHash = passwordToSet ? await bcrypt.hash(passwordToSet, 12) : null;
    await db.query(
      `UPDATE lietotajs
       SET email = ?, nick = ?, age = ?, kontakt_informacija = ?, avatar = ?,
           password_hash = COALESCE(?, password_hash)
       WHERE id = ?`,
      [
        email.trim().toLowerCase(), nick.trim(), Number(age), contact.trim() || null,
        avatar || null, passwordHash, req.user.id,
      ],
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email or nickname is already in use." });
    throw error;
  }
  const updated = {
    ...req.user,
    email: email.trim().toLowerCase(),
    nick: nick.trim(),
    age: Number(age),
    kontakt_informacija: contact.trim() || null,
    avatar: avatar || "",
  };
  res.json({ user: publicUser(updated) });
}

export async function ensureBootstrapAdmin() {
  const { ADMIN_EMAIL, ADMIN_NICK, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_NICK || !ADMIN_PASSWORD) return;

  await withTransaction(async (client) => {
    const lock = await client.query(
      "SELECT GET_LOCK(?, 10) AS acquired",
      ["straightforward:bootstrap-admin"],
    );
    if (lock.rows[0]?.acquired !== 1) {
      throw new Error("Could not acquire the bootstrap administrator lock.");
    }

    try {
      const admin = await client.query("SELECT id FROM admin LIMIT 1");
      if (admin.rows[0]) return;

      const existingUser = await client.query(
        "SELECT id, password_hash FROM lietotajs WHERE lower(email) = lower(?)",
        [ADMIN_EMAIL.trim()],
      );
      let userId = existingUser.rows[0]?.id;
      if (!existingUser.rows[0] || !existingUser.rows[0].password_hash) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        if (userId) {
          await client.query("UPDATE lietotajs SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
        } else {
          const inserted = await client.query(
            "INSERT INTO lietotajs (email, nick, password_hash) VALUES (?, ?, ?)",
            [ADMIN_EMAIL.trim().toLowerCase(), ADMIN_NICK.trim(), passwordHash],
          );
          userId = inserted.insertId;
        }
      }

      await client.query(
        "INSERT INTO admin (id, vards) VALUES (?, ?)",
        [userId, ADMIN_NICK.trim()],
      );
    } finally {
      await client.query("SELECT RELEASE_LOCK(?)", ["straightforward:bootstrap-admin"]);
    }
  });
}