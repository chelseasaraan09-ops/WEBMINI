"use strict";

// ====== Konstanta & State ======
const STORAGE_KEY = "dompetku_transactions";
const THEME_KEY = "dompetku_theme";

let transactions = loadTransactions();

// ====== Elemen DOM ======
const form = document.getElementById("txForm");
const txIdInput = document.getElementById("txId");
const descInput = document.getElementById("desc");
const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");
const categoryInput = document.getElementById("category");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");

const txList = document.getElementById("txList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("search");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const clearAllBtn = document.getElementById("clearAll");

const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("totalIncome");
const expenseEl = document.getElementById("totalExpense");
const themeToggle = document.getElementById("themeToggle");

// ====== Helper ======
function loadTransactions() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatRupiah(number) {
  return "Rp " + Number(number).toLocaleString("id-ID");
}

function formatTanggal(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function getSelectedType() {
  return form.querySelector('input[name="type"]:checked').value;
}

// ====== Validasi ======
function setError(id, message) {
  document.getElementById(id).textContent = message;
}

function validateForm() {
  let valid = true;
  setError("descError", "");
  setError("amountError", "");
  setError("dateError", "");

  if (descInput.value.trim() === "") {
    setError("descError", "Keterangan wajib diisi.");
    valid = false;
  }

  const amount = Number(amountInput.value);
  if (!amountInput.value || amount <= 0) {
    setError("amountError", "Jumlah harus lebih dari 0.");
    valid = false;
  }

  if (!dateInput.value) {
    setError("dateError", "Tanggal wajib diisi.");
    valid = false;
  }

  return valid;
}

// ====== Render ======
function updateSummary() {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  incomeEl.textContent = formatRupiah(income);
  expenseEl.textContent = formatRupiah(expense);
  balanceEl.textContent = formatRupiah(income - expense);
}

function updateCategoryFilter() {
  const current = filterCategory.value;
  const categories = [...new Set(transactions.map((t) => t.category))].sort();

  filterCategory.innerHTML = "";
  const all = new Option("Semua kategori", "all");
  filterCategory.add(all);
  categories.forEach((c) => filterCategory.add(new Option(c, c)));

  filterCategory.value = categories.includes(current) ? current : "all";
}

function getFilteredTransactions() {
  const keyword = searchInput.value.trim().toLowerCase();
  return transactions
    .filter((t) => t.desc.toLowerCase().includes(keyword))
    .filter((t) => filterType.value === "all" || t.type === filterType.value)
    .filter((t) => filterCategory.value === "all" || t.category === filterCategory.value)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function render() {
  updateSummary();
  updateCategoryFilter();

  const list = getFilteredTransactions();
  txList.innerHTML = "";
  emptyState.hidden = list.length > 0;

  list.forEach((t) => {
    const li = document.createElement("li");
    li.className = "tx-item " + t.type;

    const info = document.createElement("div");
    info.className = "tx-info";

    const desc = document.createElement("div");
    desc.className = "tx-desc";
    desc.textContent = t.desc; // textContent -> aman dari XSS

    const meta = document.createElement("div");
    meta.className = "tx-meta";
    meta.textContent = `${t.category} · ${formatTanggal(t.date)}`;

    info.append(desc, meta);

    const amount = document.createElement("div");
    amount.className = "tx-amount";
    amount.textContent = (t.type === "income" ? "+" : "-") + formatRupiah(t.amount);

    const actions = document.createElement("div");
    actions.className = "tx-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.title = "Edit";
    editBtn.setAttribute("aria-label", "Edit transaksi");
    editBtn.addEventListener("click", () => startEdit(t.id));

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.title = "Hapus";
    delBtn.setAttribute("aria-label", "Hapus transaksi");
    delBtn.addEventListener("click", () => deleteTransaction(t.id));

    actions.append(editBtn, delBtn);
    li.append(info, amount, actions);
    txList.appendChild(li);
  });
}

// ====== CRUD ======
function resetForm() {
  form.reset();
  txIdInput.value = "";
  dateInput.value = todayISO();
  formTitle.textContent = "Tambah Transaksi";
  submitBtn.textContent = "Simpan";
  cancelBtn.hidden = true;
  setError("descError", "");
  setError("amountError", "");
  setError("dateError", "");
}

function startEdit(id) {
  const t = transactions.find((x) => x.id === id);
  if (!t) return;

  txIdInput.value = t.id;
  descInput.value = t.desc;
  amountInput.value = t.amount;
  dateInput.value = t.date;
  categoryInput.value = t.category;
  form.querySelector(`input[name="type"][value="${t.type}"]`).checked = true;

  formTitle.textContent = "Edit Transaksi";
  submitBtn.textContent = "Perbarui";
  cancelBtn.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  descInput.focus();
}

function deleteTransaction(id) {
  if (!confirm("Hapus transaksi ini?")) return;
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions();
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const data = {
    desc: descInput.value.trim(),
    amount: Number(amountInput.value),
    date: dateInput.value,
    category: categoryInput.value,
    type: getSelectedType(),
  };

  if (txIdInput.value) {
    const id = Number(txIdInput.value);
    transactions = transactions.map((t) => (t.id === id ? { ...t, ...data } : t));
  } else {
    transactions.push({ id: Date.now(), ...data });
  }

  saveTransactions();
  resetForm();
  render();
});

cancelBtn.addEventListener("click", resetForm);

clearAllBtn.addEventListener("click", () => {
  if (transactions.length === 0) return;
  if (!confirm("Yakin ingin menghapus SEMUA transaksi? Tindakan ini tidak bisa dibatalkan.")) return;
  transactions = [];
  saveTransactions();
  render();
});

// ====== Filter ======
[searchInput, filterType, filterCategory].forEach((el) =>
  el.addEventListener("input", render)
);

// ====== Tema Gelap/Terang ======
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ====== Inisialisasi ======
const savedTheme =
  localStorage.getItem(THEME_KEY) ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
applyTheme(savedTheme);

dateInput.value = todayISO();
render();