const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "..", "data", "listings.json");

function readAll() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// Writes are serialized through this promise chain so two near-simultaneous
// submissions can't read-modify-write over each other and drop one.
let writeQueue = Promise.resolve();

function writeAll(listings) {
  writeQueue = writeQueue.then(
    () =>
      new Promise((resolve, reject) => {
        const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFile(tmpFile, JSON.stringify(listings, null, 2), (err) => {
          if (err) return reject(err);
          fs.rename(tmpFile, DATA_FILE, (err2) => {
            if (err2) return reject(err2);
            resolve();
          });
        });
      })
  );
  return writeQueue;
}

function getByCityAndCategory(citySlug, categorySlug) {
  return readAll()
    .filter((l) => l.city === citySlug && l.category === categorySlug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getAll() {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function countByCity() {
  const counts = {};
  for (const l of readAll()) {
    counts[l.city] = (counts[l.city] || 0) + 1;
  }
  return counts;
}

function countByCategoryForCity(citySlug) {
  const counts = {};
  for (const l of readAll()) {
    if (l.city !== citySlug) continue;
    counts[l.category] = (counts[l.category] || 0) + 1;
  }
  return counts;
}

async function add({ category, name, city, phone, note }) {
  const listings = readAll();
  const entry = {
    id: crypto.randomBytes(8).toString("hex"),
    category,
    name,
    city,
    phone,
    note: note || "",
    createdAt: new Date().toISOString(),
  };
  listings.push(entry);
  await writeAll(listings);
  return entry;
}

async function remove(id) {
  const listings = readAll();
  const next = listings.filter((l) => l.id !== id);
  const removed = next.length !== listings.length;
  if (removed) await writeAll(next);
  return removed;
}

module.exports = { getByCityAndCategory, getAll, countByCity, countByCategoryForCity, add, remove };
