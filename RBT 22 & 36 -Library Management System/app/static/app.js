"use strict";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TABS = [["dash","Dashboard"],["books","Books"],["members","Members"],["issue","Issue / Return"],["fines","Fines"],["reports","Reports"]];
let ME = null, CSRF = "", tabNow = "dash";
const page = {books:1, mem:1, issues:1, fines:1, audit:1};
const money = n => "₹" + Number(n || 0);

function toast(msg, ok = true) {
  const t = $("#toast"); t.textContent = msg; t.style.background = ok ? "#1c7a4b" : "#b4322b"; t.style.display = "block";
  clearTimeout(toast.h); toast.h = setTimeout(() => t.style.display = "none", 3500);
}
async function api(url, method = "GET", data) {
  const opt = {method, headers: {}};
  if (method !== "GET") { opt.headers["Content-Type"] = "application/json"; opt.headers["X-CSRF-Token"] = CSRF; opt.body = JSON.stringify(data || {}); }
  let r;
  try { r = await fetch(url, opt); } catch (e) { toast("Cannot reach the server. Check your connection.", false); throw e; }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== "/api/login") { showLogin(); throw j; }
  if (!r.ok) { toast(j.error || "Something went wrong", false); throw j; }
  return j;
}
const table = (head, rows) => rows.length
  ? `<div class="table-wrap"><table><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr>${rows.join("")}</table></div>` : '<div class="empty">No records found.</div>';
function pager(el, key, d, reload) {
  const box = $(el); box.innerHTML = d.pages > 1
    ? `<span>${d.total} records · page ${d.page} of ${d.pages}</span><button class="btn sm ghost" ${d.page<=1?"disabled":""} data-d="-1">Prev</button><button class="btn sm ghost" ${d.page>=d.pages?"disabled":""} data-d="1">Next</button>`
    : `<span>${d.total} record${d.total === 1 ? "" : "s"}</span>`;
  box.onclick = e => { const b = e.target.closest("button[data-d]"); if (b && !b.disabled) { page[key] += +b.dataset.d; reload(); } };
}
const debounce = (fn, ms = 300) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };

// ---------- dialog helper
function ask(title, fields, values = {}) {
  return new Promise(res => {
    const dlg = $("#dlg"); $("#dlgTitle").textContent = title;
    $("#dlgBody").innerHTML = fields.map(f => `<label>${f.label}<input name="${f.name}" type="${f.type || "text"}" value="${esc(values[f.name] ?? "")}" ${f.max ? `maxlength="${f.max}"` : ""} ${f.required ? "required" : ""} ${f.min !== undefined ? `min="${f.min}"` : ""} autocomplete="off"></label>`).join("");
    dlg.onclose = () => {
      if (dlg.returnValue !== "ok") return res(null);
      res(Object.fromEntries(fields.map(f => [f.name, dlg.querySelector(`[name=${f.name}]`).value])));
    };
    dlg.showModal();
  });
}

// ---------- session
function showLogin() { ME = null; $("#appView").hidden = true; $("#loginView").hidden = false; $("#fLogin").reset(); }
async function enter(me) {
  ME = me; CSRF = me.csrf; $("#loginView").hidden = true; $("#appView").hidden = false;
  $("#whoami").textContent = `${me.name} (${me.role})`;
  $("#rules").textContent = `Loan period ${me.loan_days} days · Fine ${money(me.fine_per_day)} per late day · Max ${me.max_books} books per member · one renewal`;
  $("#auditCard").hidden = me.role !== "admin";
  show("dash");
}
$("#fLogin").onsubmit = async e => {
  e.preventDefault(); $("#loginErr").textContent = "";
  try { await api("/api/login", "POST", Object.fromEntries(new FormData(e.target))); await enter(await api("/api/me")); }
  catch (err) { $("#loginErr").textContent = err.error || "Sign in failed"; }
};
$("#btnOut").onclick = async () => { try { await api("/api/logout", "POST"); } catch (_) {} showLogin(); };
$("#btnPw").onclick = async () => {
  const v = await ask("Change password", [{name:"old", label:"Current password", type:"password", required:1}, {name:"new", label:"New password (min 8 characters)", type:"password", required:1}]);
  if (v) { await api("/api/password", "POST", v); toast("Password changed"); }
};

// ---------- tabs
$("#nav").innerHTML = TABS.map(([k, l]) => `<button data-k="${k}">${l}</button>`).join("");
$("#nav").onclick = e => { const k = e.target.dataset.k; if (k) show(k); };
function show(k) {
  tabNow = k;
  document.querySelectorAll(".sec").forEach(s => s.classList.toggle("on", s.id === k));
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.k === k));
  ({dash: loadDash, books: loadBooks, members: loadMem, issue: loadIssue, fines: loadFines, reports: loadReports})[k]();
}

// ---------- screens
async function loadDash() {
  const s = await api("/api/stats");
  $("#stats").innerHTML = [["Titles", s.titles], ["Copies on shelf", s.copies], ["Members", s.members], ["Books issued", s.issued],
    ["Overdue", s.overdue, s.overdue > 0], ["Unpaid fines", money(s.unpaid), s.unpaid > 0], ["Fines collected", money(s.collected)]]
    .map(([l, v, w]) => `<div class="stat ${w ? "warn" : ""}"><b>${v}</b><span>${l}</span></div>`).join("");
  const o = await api("/api/issues?status=open&per_page=8");
  $("#dashOpen").innerHTML = table(["Member", "Book", "Issued", "Due", "Status"], o.items.map(r =>
    `<tr><td>${esc(r.Member)}</td><td>${esc(r.Title)}</td><td>${r.Issue_Date}</td><td>${r.Due_Date}</td><td><span class="tag ${r.Overdue ? "t-bad" : "t-n"}">${r.Overdue ? "Overdue" : "On time"}</span></td></tr>`));
}
async function loadBooks() {
  const d = await api(`/api/books?q=${encodeURIComponent($("#qBook").value)}&page=${page.books}`);
  if (!d.items.length && page.books > 1) { page.books = 1; return loadBooks(); }
  $("#tBooks").innerHTML = table(["ID", "Title", "Author", "Category", "Available", ""], d.items.map(r =>
    `<tr><td>${r.Book_ID}</td><td>${esc(r.Title)}</td><td>${esc(r.Author)}</td><td>${esc(r.Category)}</td>
     <td><span class="tag ${r.Quantity > 0 ? "t-ok" : "t-bad"}">${r.Quantity}</span></td>
     <td><div class="acts"><button class="btn sm" data-edit="${r.Book_ID}">Edit</button>${ME.role === "admin" ? `<button class="btn sm red" data-del="${r.Book_ID}">Delete</button>` : ""}</div></td></tr>`));
  pager("#pBooks", "books", d, loadBooks); window.__books = Object.fromEntries(d.items.map(b => [b.Book_ID, b]));
}
$("#tBooks").onclick = async e => {
  const ed = e.target.dataset.edit, del = e.target.dataset.del;
  if (ed) {
    const b = window.__books[ed];
    const v = await ask("Edit book", [{name:"title", label:"Title", max:120, required:1}, {name:"author", label:"Author", max:80, required:1}, {name:"category", label:"Category", max:40}, {name:"quantity", label:"Copies available", type:"number", min:0}],
      {title:b.Title, author:b.Author, category:b.Category, quantity:b.Quantity});
    if (v) { await api("/api/books/" + ed, "PUT", v); toast("Book updated"); loadBooks(); }
  } else if (del && confirm("Delete this book?")) { await api("/api/books/" + del, "DELETE"); toast("Book deleted"); loadBooks(); }
};
async function loadMem() {
  const d = await api(`/api/members?q=${encodeURIComponent($("#qMem").value)}&page=${page.mem}`);
  if (!d.items.length && page.mem > 1) { page.mem = 1; return loadMem(); }
  $("#tMem").innerHTML = table(["ID", "Name", "Department", "Phone", "Joined", ""], d.items.map(r =>
    `<tr><td>${r.Member_ID}</td><td>${esc(r.Name)}</td><td>${esc(r.Department)}</td><td>${esc(r.Phone)}</td><td>${r.Joined_On || ""}</td>
     <td><div class="acts"><button class="btn sm" data-edit="${r.Member_ID}">Edit</button>${ME.role === "admin" ? `<button class="btn sm red" data-del="${r.Member_ID}">Delete</button>` : ""}</div></td></tr>`));
  pager("#pMem", "mem", d, loadMem); window.__mem = Object.fromEntries(d.items.map(m => [m.Member_ID, m]));
}
$("#tMem").onclick = async e => {
  const ed = e.target.dataset.edit, del = e.target.dataset.del;
  if (ed) {
    const m = window.__mem[ed];
    const v = await ask("Edit member", [{name:"name", label:"Name", max:80, required:1}, {name:"department", label:"Department", max:40}, {name:"phone", label:"Phone (10 digits)", max:10}],
      {name:m.Name, department:m.Department, phone:m.Phone});
    if (v) { await api("/api/members/" + ed, "PUT", v); toast("Member updated"); loadMem(); }
  } else if (del && confirm("Delete this member?")) { await api("/api/members/" + del, "DELETE"); toast("Member deleted"); loadMem(); }
};
async function loadIssue() {
  const [m, b] = await Promise.all([api("/api/members?per_page=100"), api("/api/books?available=1&per_page=100")]);
  const sm = $("#selM").value, sb = $("#selB").value;
  $("#selM").innerHTML = m.items.map(x => `<option value="${x.Member_ID}">${esc(x.Name)} (#${x.Member_ID})</option>`).join("");
  $("#selB").innerHTML = b.items.map(x => `<option value="${x.Book_ID}">${esc(x.Title)} — ${x.Quantity} left</option>`).join("");
  if (sm) $("#selM").value = sm; if (sb) $("#selB").value = sb;
  const d = await api(`/api/issues?q=${encodeURIComponent($("#qIss").value)}&status=${$("#stIss").value}&page=${page.issues}`);
  $("#tIssues").innerHTML = table(["ID", "Member", "Book", "Issued", "Due", "Returned", "Fine", ""], d.items.map(r =>
    `<tr><td>${r.Issue_ID}</td><td>${esc(r.Member)}</td><td>${esc(r.Title)}</td><td>${r.Issue_Date}</td><td>${r.Due_Date}${r.Renewed ? " <span class='tag t-n'>renewed</span>" : ""}</td>
     <td>${r.Return_Date || `<span class="tag ${r.Overdue ? "t-bad" : "t-n"}">${r.Overdue ? "Overdue" : "Issued"}</span>`}</td><td>${r.Fine ? money(r.Fine) + (r.Paid ? " (paid)" : "") : "—"}</td>
     <td><div class="acts">${r.Return_Date ? "" : `<button class="btn sm" data-ret="${r.Issue_ID}">Return</button>${r.Renewed || r.Overdue ? "" : `<button class="btn sm gold" data-ren="${r.Issue_ID}">Renew</button>`}`}</div></td></tr>`));
  pager("#pIssues", "issues", d, loadIssue);
}
$("#tIssues").onclick = async e => {
  const ret = e.target.dataset.ret, ren = e.target.dataset.ren;
  if (ret) { const r = await api("/api/return/" + ret, "POST"); toast(r.fine ? `Returned ${r.days_late} day(s) late. Fine ${money(r.fine)}` : "Book returned on time"); loadIssue(); }
  if (ren) { const r = await api("/api/renew/" + ren, "POST"); toast("Renewed. New due date " + r.due); loadIssue(); }
};
async function loadFines() {
  const d = await api(`/api/fines?status=${$("#stFine").value}&page=${page.fines}`);
  $("#tFines").innerHTML = table(["Fine ID", "Issue", "Member", "Book", "Amount", "Status", ""], d.items.map(r =>
    `<tr><td>${r.Fine_ID}</td><td>${r.Issue_ID}</td><td>${esc(r.Member)}</td><td>${esc(r.Title)}</td><td>${money(r.Amount)}</td>
     <td><span class="tag ${r.Paid ? "t-ok" : "t-bad"}">${r.Paid ? "Paid" : "Unpaid"}</span></td><td>${r.Paid ? "" : `<button class="btn sm" data-pay="${r.Fine_ID}">Mark paid</button>`}</td></tr>`));
  pager("#pFines", "fines", d, loadFines);
}
$("#tFines").onclick = async e => { const id = e.target.dataset.pay; if (id) { await api(`/api/fines/${id}/pay`, "POST"); toast("Fine marked as paid"); loadFines(); } };
async function loadReports() {
  const r = await api("/api/reports/summary");
  $("#rOver").innerHTML = table(["Member", "Book", "Due", "Days late", "Fine so far"], r.overdue.map(x =>
    `<tr><td>${esc(x.Member)}</td><td>${esc(x.Title)}</td><td>${x.Due_Date}</td><td><span class="tag t-bad">${x.Days_Late}</span></td><td>${money(x.Fine_So_Far)}</td></tr>`));
  $("#rTop").innerHTML = table(["Book", "Times issued"], r.top_books.map(x => `<tr><td>${esc(x.Title)}</td><td>${x.Times_Issued}</td></tr>`));
  $("#rCat").innerHTML = table(["Category", "Titles", "Copies"], r.categories.map(x => `<tr><td>${esc(x.Category)}</td><td>${x.Titles}</td><td>${x.Copies}</td></tr>`));
  if (ME.role === "admin") {
    const a = await api(`/api/audit?page=${page.audit}&per_page=8`);
    $("#tAudit").innerHTML = table(["Time", "User", "Action", "Detail"], a.items.map(x => `<tr><td>${x.Logged_At}</td><td>${esc(x.Username)}</td><td><span class="tag t-n">${esc(x.Action)}</span></td><td>${esc(x.Detail)}</td></tr>`));
    pager("#pAudit", "audit", a, loadReports);
  }
}

// ---------- forms
function bindForm(sel, url, done, msg) {
  $(sel).onsubmit = async e => {
    e.preventDefault(); const f = e.target, b = f.querySelector("button"); b.disabled = true;
    try { const r = await api(url, "POST", Object.fromEntries(new FormData(f))); toast(typeof msg === "function" ? msg(r) : msg); f.reset(); done(); } catch (_) {} finally { b.disabled = false; }
  };
}
bindForm("#fBook", "/api/books", loadBooks, "Book added");
bindForm("#fMem", "/api/members", loadMem, "Member registered");
bindForm("#fIssue", "/api/issue", loadIssue, r => "Book issued. Due on " + r.due);
$("#qBook").oninput = debounce(() => { page.books = 1; loadBooks(); });
$("#qMem").oninput = debounce(() => { page.mem = 1; loadMem(); });
$("#qIss").oninput = debounce(() => { page.issues = 1; loadIssue(); });
$("#stIss").onchange = () => { page.issues = 1; loadIssue(); };
$("#stFine").onchange = () => { page.fines = 1; loadFines(); };

(async () => { try { const r = await fetch("/api/me"); r.ok ? enter(await r.json()) : showLogin(); } catch (_) { showLogin(); } })();
