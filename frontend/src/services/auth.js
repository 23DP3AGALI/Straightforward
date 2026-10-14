const USERS_KEY = "sf_users_v1";
const SESSION_KEY = "sf_session_v1";

const initialAdmin = {
  id: 1,
  email: "admin",
  nick: "admin",
  kontakt_informacija: "",
  password: "admin",
  isAdmin: true,
  ir_banots: false,
};

function readUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY));
    if (Array.isArray(users)) {
      if (!users.some((user) => user.isAdmin && user.email === initialAdmin.email)) {
        users.unshift(initialAdmin);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      return users;
    }
  } catch {
    // Reset malformed local data to the initial admin account.
  }

  localStorage.setItem(USERS_KEY, JSON.stringify([initialAdmin]));
  return [initialAdmin];
}

function publicUser(user) {
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

export function register({ email, nick, kontakt_informacija, password }) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNick = nick.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error("An account with this email already exists.");
  }
  if (users.some((user) => user.nick.toLowerCase() === normalizedNick.toLowerCase())) {
    throw new Error("This nickname is already taken.");
  }

  const user = {
    id: Date.now(),
    email: normalizedEmail,
    nick: normalizedNick,
    kontakt_informacija: kontakt_informacija.trim(),
    password,
    isAdmin: false,
    ir_banots: false,
  };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser(user)));
  return publicUser(user);
}

export function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = readUsers().find(
    (account) => account.email.toLowerCase() === normalizedEmail && account.password === password,
  );

  if (!user) throw new Error("Email or password is incorrect.");

  const safeUser = publicUser(user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  return safeUser;
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getUserById(id) {
  const user = readUsers().find((u) => String(u.id) === String(id));
  return user ? publicUser(user) : null;
}
