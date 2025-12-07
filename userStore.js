const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const USERS_FILE = path.join(__dirname, 'users.json');

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    // File not found or invalid -> start fresh
    if (e.code === 'ENOENT') return [];
    console.warn('userStore read error:', e);
    return [];
  }
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function findUserByEmail(email) {
  const users = await readUsers();
  return users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

async function createUser({ name, email, passwordHash }) {
  const users = await readUsers();
  const user = {
    id: randomUUID(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  return user;
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = {
  readUsers,
  writeUsers,
  findUserByEmail,
  createUser,
  publicUser,
};
