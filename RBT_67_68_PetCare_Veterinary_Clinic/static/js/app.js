const q = document.getElementById('q'), tbl = document.getElementById('t'), form = document.getElementById('addf');
const prevB = document.getElementById('prev'), nextB = document.getElementById('next');
const PER = 10; let page = 0;

const allRows = () => tbl ? [...tbl.tBodies[0].rows].filter(r => !r.classList.contains('emptyrow')) : [];
const matches = () => { const s = q ? q.value.toLowerCase() : ''; return allRows().filter(r => r.innerText.toLowerCase().includes(s)); };
function render() {
  if (!tbl) return;
  const vis = matches(), pages = Math.max(1, Math.ceil(vis.length / PER));
  if (page >= pages) page = pages - 1;
  allRows().forEach(r => r.style.display = 'none');
  vis.slice(page * PER, (page + 1) * PER).forEach(r => r.style.display = '');
  const info = document.getElementById('pinfo');
  if (info) info.textContent = vis.length ? `Showing ${page * PER + 1}–${Math.min((page + 1) * PER, vis.length)} of ${vis.length}` : 'No matching records';
  if (prevB) prevB.disabled = page === 0;
  if (nextB) nextB.disabled = page >= pages - 1;
}
if (q) q.addEventListener('input', () => { page = 0; render(); });
if (prevB) prevB.onclick = () => { page--; render(); };
if (nextB) nextB.onclick = () => { page++; render(); };

// sorting
document.querySelectorAll('#t th.sortable').forEach(th => th.onclick = () => {
  const idx = th.cellIndex, asc = th.dataset.asc !== '1'; th.dataset.asc = asc ? '1' : '0';
  document.querySelectorAll('#t th').forEach(x => x.classList.remove('asc', 'desc')); th.classList.add(asc ? 'asc' : 'desc');
  const val = r => r.cells[idx].innerText.trim(), num = v => parseFloat(v.replace(/[^0-9.\-]/g, ''));
  const rows = allRows().sort((a, b) => {
    const x = val(a), y = val(b), nx = num(x), ny = num(y);
    const r = (!isNaN(nx) && !isNaN(ny) && /^[\s₹\d.,\-]+$/.test(x + y)) ? nx - ny : x.localeCompare(y, undefined, {numeric: true});
    return asc ? r : -r;
  });
  const body = tbl.tBodies[0]; rows.forEach(r => body.appendChild(r)); page = 0; render();
});

// CSV export
const ex = document.getElementById('exp');
if (ex) ex.onclick = () => {
  const head = [...tbl.tHead.rows[0].cells].slice(0, -1).map(c => c.innerText.trim());
  const body = matches().map(r => [...r.cells].slice(0, -1).map(c => c.innerText.trim()));
  const csv = [head, ...body].map(a => a.map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], {type: 'text/csv'}));
  a.download = (tbl.dataset.name || 'export') + '.csv'; a.click();
};

// add / edit form
function setMode(edit) {
  form.querySelectorAll('label[data-noedit]').forEach(l => {
    l.style.display = edit ? 'none' : ''; l.querySelectorAll('[name]').forEach(el => el.disabled = edit);
  });
  document.getElementById('ftitle').textContent = edit ? 'Edit record' : 'Add new ' + form.dataset.name.replace(/s$/, '');
  document.getElementById('savebtn').textContent = edit ? 'Update' : 'Save';
}
function openAdd() {
  form.reset(); form.action = `/${form.dataset.name}/add`; setMode(false);
  form.classList.remove('hide'); form.scrollIntoView({behavior: 'smooth', block: 'center'});
}
document.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
  const d = await (await fetch(`/api/${b.dataset.name}/${b.dataset.edit}`)).json();
  form.reset(); form.action = `/${b.dataset.name}/edit/${b.dataset.edit}`; setMode(true);
  form.querySelectorAll('[name]').forEach(el => { if (el.name in d && d[el.name] !== null) el.value = d[el.name]; });
  form.classList.remove('hide'); form.scrollIntoView({behavior: 'smooth', block: 'center'});
});

// URL helpers: ?q=search (from charts)  ?add=1 (quick actions)
const params = new URLSearchParams(location.search);
if (q && params.get('q')) q.value = params.get('q');
if (form && params.has('add')) openAdd();
render();

setTimeout(() => document.querySelectorAll('.flash').forEach(f => f.style.opacity = 0), 5000);
