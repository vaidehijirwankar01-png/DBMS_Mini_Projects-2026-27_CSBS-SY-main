// PetCare dashboard charts (Chart.js is bundled locally in static/js/chart.umd.js)
(function () {
  const showErr = (id, msg) => { const w = document.getElementById('w' + id.slice(1)); if (w) w.innerHTML = '<p class="mut" style="padding:20px">Chart could not load: ' + msg + '</p>'; };
  if (typeof Chart === 'undefined') { ['c1', 'c2', 'c3', 'c4'].forEach(i => showErr(i, 'Chart.js missing')); return; }

  const P = {violet: '#6c5ce7', indigo: '#4f46e5', teal: '#00b5ad', cyan: '#38bdf8', amber: '#f59e0b', rose: '#e11d48'};
  const SEQ = [P.violet, P.teal, P.amber, P.rose, P.indigo, P.cyan];
  const STATUS = {Scheduled: P.violet, Completed: P.teal, Cancelled: P.rose};
  Chart.defaults.font.family = 'Poppins, sans-serif';
  Chart.defaults.color = '#7a819c';
  Chart.defaults.plugins.tooltip.backgroundColor = '#1f2540';
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;

  const grad = (ctx, c, horiz) => {
    const g = horiz ? ctx.createLinearGradient(0, 0, 400, 0) : ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, c); g.addColorStop(1, c + '66'); return g;
  };
  const centre = {id: 'centre', afterDraw(ch) {
    if (ch.config.type !== 'doughnut') return;
    const d = ch.data.datasets[0].data;
    const t = d.reduce((a, v, i) => a + (ch.getDataVisibility(i) ? v : 0), 0);
    const a = ch.chartArea, x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2, ctx = ch.ctx;
    ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#1f2540'; ctx.font = '600 26px Poppins, sans-serif';
    ctx.fillText(t, x, y + 6); ctx.fillStyle = '#7a819c'; ctx.font = '12px Poppins, sans-serif'; ctx.fillText('Total', x, y + 24); ctx.restore();
  }};
  const go = base => (e, els, ch) => { if (els.length) location.href = base + '?q=' + encodeURIComponent(ch.data.labels[els[0].index]); };
  const pointer = (e, els) => { if (e.native && e.native.target) e.native.target.style.cursor = els.length ? 'pointer' : 'default'; };

  function donut(id, data, base, colors) {
    return new Chart(document.getElementById(id), {type: 'doughnut', plugins: [centre],
      data: {labels: data.map(x => x.label), datasets: [{data: data.map(x => +x.value), backgroundColor: colors || SEQ,
        borderColor: '#ffffff', borderWidth: 3, hoverOffset: 14}]},
      options: {maintainAspectRatio: false, cutout: '66%', onClick: go(base), onHover: pointer,
        plugins: {legend: {position: 'bottom', labels: {usePointStyle: true, boxWidth: 8, padding: 16}},
          tooltip: {callbacks: {label: c => {
            const t = c.dataset.data.reduce((a, b) => a + b, 0);
            return ' ' + c.label + ': ' + c.parsed + ' (' + Math.round(c.parsed / t * 100) + '%)'; }}}}}});
  }
  function bars(id, data, base, horiz, money) {
    return new Chart(document.getElementById(id), {type: 'bar',
      data: {labels: data.map(x => x.label), datasets: [{data: data.map(x => +x.value), borderRadius: 10, maxBarThickness: 44,
        backgroundColor: c => grad(c.chart.ctx, P.violet, horiz), hoverBackgroundColor: P.indigo}]},
      options: {maintainAspectRatio: false, indexAxis: horiz ? 'y' : 'x', onClick: go(base), onHover: pointer,
        plugins: {legend: {display: false}, tooltip: {callbacks: {label: c =>
          money ? ' ₹' + Number(c.parsed.y).toLocaleString('en-IN') : ' Units used: ' + c.parsed.x}}},
        scales: {x: {grid: {display: !!horiz}, beginAtZero: true}, y: {grid: {color: '#eef0f7'}, beginAtZero: true}}}});
  }
  function line(id, data, base) {
    return new Chart(document.getElementById(id), {type: 'line',
      data: {labels: data.map(x => x.label), datasets: [{data: data.map(x => +x.value), borderColor: P.violet, borderWidth: 3,
        tension: .4, fill: true, backgroundColor: c => grad(c.chart.ctx, P.violet), pointRadius: 6, pointHoverRadius: 9,
        pointBackgroundColor: '#fff', pointBorderColor: P.violet, pointBorderWidth: 3}]},
      options: {maintainAspectRatio: false, onClick: go(base), onHover: pointer,
        plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => ' ₹' + Number(c.parsed.y).toLocaleString('en-IN')}}},
        scales: {x: {grid: {display: false}}, y: {grid: {color: '#eef0f7'}, beginAtZero: true}}}});
  }
  const safe = (id, fn) => { try { return fn(); } catch (err) { console.error(id, err); showErr(id, err.message); } };

  fetch('/api/charts').then(r => { if (!r.ok) throw new Error('server returned ' + r.status); return r.json(); }).then(d => {
    safe('c1', () => donut('c1', d.species, '/pets'));
    safe('c2', () => donut('c2', d.status, '/appointments', d.status.map(x => STATUS[x.label] || P.indigo)));
    safe('c4', () => bars('c4', d.meds, '/medicines', true, false));
    let rev = safe('c3', () => bars('c3', d.revenue, '/bills', false, true));
    document.querySelectorAll('#seg button').forEach(b => b.onclick = () => safe('c3', () => {
      document.querySelectorAll('#seg button').forEach(x => x.classList.remove('on')); b.classList.add('on');
      if (rev) rev.destroy();
      rev = b.dataset.t === 'line' ? line('c3', d.revenue, '/bills') : bars('c3', d.revenue, '/bills', false, true);
    }));
  }).catch(err => { console.error(err); ['c1', 'c2', 'c3', 'c4'].forEach(i => showErr(i, err.message)); });
})();
