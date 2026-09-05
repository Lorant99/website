require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("path");

const categories = require("./config/categories");
const cities = require("./config/cities");
const db = require("./lib/db");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "change-me";
const SITE_NAME = "Gjeje personin për problemin tënd në qytetin tënd";

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.siteName = SITE_NAME;
  res.locals.categories = categories;
  res.locals.cities = cities;
  next();
});

function findCategory(slug) {
  return categories.find((c) => c.slug === slug);
}

function findCity(slug) {
  return cities.find((c) => c.slug === slug);
}

app.get("/", (req, res) => {
  const counts = db.countByCity();
  res.render("home", { counts });
});

app.get("/qyteti/:citySlug", (req, res) => {
  const city = findCity(req.params.citySlug);
  if (!city) return res.status(404).render("404");

  const counts = db.countByCategoryForCity(city.slug);
  res.render("city", { city, counts });
});

app.get("/qyteti/:citySlug/kategoria/:catSlug", (req, res) => {
  const city = findCity(req.params.citySlug);
  const category = findCategory(req.params.catSlug);
  if (!city || !category) return res.status(404).render("404");

  const listings = db.getByCityAndCategory(city.slug, category.slug);
  res.render("category", { city, category, listings });
});

app.get("/shto", (req, res) => {
  const values = { city: req.query.qyteti || "", category: req.query.kategoria || "" };
  res.render("add", { error: null, values, submitted: false });
});

const addLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Keni bërë shumë regjistrime brenda një ore. Provoni sërish më vonë.",
});

app.post("/shto", addLimiter, async (req, res) => {
  const { category, city, name, phone, note, website } = req.body;

  // Honeypot: real users never fill this hidden field.
  if (website) {
    return res.redirect("/");
  }

  const values = { category, city, name, phone, note };
  const cat = findCategory(category);
  const cty = findCity(city);

  if (!cty) {
    return res.status(400).render("add", { error: "Zgjidhni qytetin.", values, submitted: false });
  }
  if (!cat) {
    return res.status(400).render("add", { error: "Zgjidhni një zanat të vlefshëm.", values, submitted: false });
  }
  if (!name || name.trim().length < 2) {
    return res.status(400).render("add", { error: "Shkruani emrin.", values, submitted: false });
  }
  const phoneDigits = (phone || "").replace(/[^\d+]/g, "");
  if (phoneDigits.length < 6) {
    return res.status(400).render("add", { error: "Shkruani një numër telefoni të vlefshëm.", values, submitted: false });
  }

  await db.add({
    category: cat.slug,
    city: cty.slug,
    name: name.trim().slice(0, 80),
    phone: phone.trim().slice(0, 30),
    note: (note || "").trim().slice(0, 200),
  });

  res.render("add", { error: null, values: {}, submitted: true, city: cty, category: cat });
});

function basicAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
    if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Admin"');
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
  console.log(`${SITE_NAME} po punon në http://localhost:${PORT}`);
});
