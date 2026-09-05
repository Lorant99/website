const DIACRITICS = { ë: "e", ç: "c", š: "s", ž: "z", č: "c", đ: "gj" };
const COMBINING_MARKS = /[̀-ͯ]/g;

function slugify(label) {
  let s = label.toLowerCase();
  for (const [from, to] of Object.entries(DIACRITICS)) {
    s = s.split(from).join(to);
  }
  return s
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = slugify;
