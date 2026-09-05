require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("path");

const categories = require("./config/categories");
const db = require("./lib/db");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "change-me";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.categories = categories;
  next();
});

function findCategory(slug) {
  return categories.find((c) => c.slug === slug);
}

app.get("/", (req, res) => {
  const counts = db.countByCategory();
  res.render("home", { counts });
});

app.get("/kategoria/:slug", (req, res) => {
  const category = findCategory(req.params.slug);
  if (!category) return res.status(404).render("404");

  const cityFilter = (req.query.qytet || "").trim();
  let listings = db.getByCategory(category.slug);
  if (cityFilter) {
    const needle = cityFilter.toLowerCase();
    listings = listings.filter((l) => l.city.toLowerCase().includes(needle));
  }

  res.render("category", { category, listings, cityFilter });
});

app.get("/shto", (req, res) => {
  const preselect = req.query.kategoria || "";
  res.render("add", { error: null, values: { category: preselect }, submitted: false });
});

const addLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Keni bërë shumë regjistrime brenda një ore. Provoni sërish më vonë.",
});

app.post("/shto", addLimiter, async (req, res) => {
  const { category, name, city, phone, note, website } = req.body;

  // Honeypot: real users never fill this hidden field.
  if (website) {
    return res.redirect(`/kategoria/${encodeURIComponent(category || "")}`);
  }

  const values = { category, name, city, phone, note };
  const cat = findCategory(category);

  if (!cat) {
    return res.status(400).render("add", { error: "Zgjidhni një zanat të vlefshëm.", values, submitted: false });
  }
  if (!name || name.trim().length < 2) {
    return res.status(400).render("add", { error: "Shkruani emrin.", values, submitted: false });
  }
  if (!city || city.trim().length < 2) {
    return res.status(400).render("add", { error: "Shkruani vendbanimin / qytetin.", values, submitted: false });
  }
  const phoneDigits = (phone || "").replace(/[^\d+]/g, "");
  if (phoneDigits.length < 6) {
    return res.status(400).render("add", { error: "Shkruani një numër telefoni të vlefshëm.", values, submitted: false });
  }

  await db.add({
    category: cat.slug,
    name: name.trim().slice(0, 80),
    city: city.trim().slice(0, 60),
    phone: phone.trim().slice(0, 30),
    note: (note || "").trim().slice(0, 200),
  });

  res.render("add", { error: null, values: {}, submitted: true, category: cat });
});

function basicAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
    if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Preshevë Lidh Admin"');
  return res.status(401).send("Autentikim i kërkuar.");
}

app.get("/admin", basicAuth, (req, res) => {
  res.render("admin", { listings: db.getAll() });
});

app.post("/admin/fshij/:id", basicAuth, async (req, res) => {
  await db.remove(req.params.id);
  res.redirect("/admin");
});

app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Preshevë Lidh po punon në http://localhost:${PORT}`);
});
