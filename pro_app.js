// ProgressiveLife Professional JS
(function(){
  const el = sel => document.querySelector(sel);
  const elAll = sel => Array.from(document.querySelectorAll(sel));

  const weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const storageKey = 'pl_planner_v1';

  // Elements
  const tbl = el('#planner');
  const btnBuild = el('#btnBuild');
  const startHourSel = el('#startHour');
  const hourSpanSel = el('#hourSpan');
  const btnNewRow = el('#btnNewRow');
  const btnDeleteRow = el('#btnDeleteRow');
  const btnClear = el('#btnClear');
  const btnExport = el('#btnExport');
  const btnPrint = el('#btnPrint');
  const btnTheme = el('#btnTheme');
  const music = el('#music');
  const aPlay = el('#aPlay');
  const aPause = el('#aPause');
  const aVolume = el('#aVolume');
  const aMute = el('#aMute');
  const aStatus = el('#aStatus');
  const year = el('#year');

  // ---------- Utilities ----------
  function pad2(n){ return String(n).padStart(2,'0'); }
  function hourLabel(h){ const hh = ((h + 24) % 24); return pad2(hh) + ':00'; }
  function save(){ localStorage.setItem(storageKey, JSON.stringify(snapshot())); }
  function load(){ try{ return JSON.parse(localStorage.getItem(storageKey)||'null'); }catch{ return null; } }

  // ---------- Table Builder ----------
  function buildTable(startHour=8, hours=12, rowsData){
    // Build head
    tbl.innerHTML = '';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'row-head';
    corner.textContent = 'เวลา';
    trh.appendChild(corner);
    weekdays.forEach(d=>{
      const th = document.createElement('th');
      th.className = 'day-head';
      th.textContent = d;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    tbl.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    for(let i=0; i<hours; i++){
      const tr = document.createElement('tr');
      tr.dataset.row = i;
      const th = document.createElement('th');
      th.className = 'row-head';
      th.textContent = hourLabel(startHour + i);
      tr.appendChild(th);

      for(let c=0; c<weekdays.length; c++){
        const td = document.createElement('td');
        const div = document.createElement('div');
        div.className = 'cell';
        div.contentEditable = 'true';
        div.spellcheck = false;
        div.addEventListener('input', save);
        div.addEventListener('keydown', e=>{
          if(e.key === 'Enter'){ e.preventDefault(); }
        });
        td.appendChild(div);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);

    // Apply data if any
    if(rowsData && Array.isArray(rowsData)){
      const cells = elAll('.cell');
      rowsData.forEach((val, idx)=>{
        if(cells[idx]) cells[idx].textContent = val;
      });
    }

    // Row selection
    elAll('.row-head').forEach((thEl)=>{
      thEl.addEventListener('click', ()=>{
        elAll('tr').forEach(r=>r.classList.remove('row-selected'));
        const row = thEl.parentElement;
        row.classList.add('row-selected');
        btnDeleteRow.disabled = false;
      });
    });

    // Double-click last row to add new
    const tbodyRows = tbody.querySelectorAll('tr');
    const last = tbodyRows[tbodyRows.length-1];
    last.addEventListener('dblclick', ()=> addRow());
  }

  function addRow(){
    const body = tbl.tBodies[0];
    const rows = body.querySelectorAll('tr');
    const lastRow = rows[rows.length-1];
    const idx = rows.length;
    const start = parseInt(startHourSel.value,10);
    const span = rows.length;
    const tr = document.createElement('tr');
    tr.dataset.row = idx;
    const th = document.createElement('th');
    th.className = 'row-head';
    const lastHour = start + span;
    th.textContent = hourLabel(lastHour);
    tr.appendChild(th);
    for(let c=0; c<weekdays.length; c++){
      const td = document.createElement('td');
      const div = document.createElement('div');
      div.className = 'cell';
      div.contentEditable = 'true';
      div.spellcheck = false;
      div.addEventListener('input', save);
      td.appendChild(div);
      tr.appendChild(td);
    }
    body.appendChild(tr);
    save();
  }

  function deleteSelectedRow(){
    const sel = el('tr.row-selected');
    if(!sel) return;
    sel.remove();
    btnDeleteRow.disabled = true;
    save();
  }

  function snapshot(){
    // Save structure + values
    const start = parseInt(startHourSel.value,10);
    const rows = elAll('#planner tbody tr');
    const text = elAll('.cell').map(c=>c.textContent);
    return {
      startHour: start,
      rows: rows.length,
      values: text,
      theme: document.documentElement.classList.contains('light') ? 'light' : 'dark'
    };
  }

  function restore(){
    const data = load();
    // populate start hour select
    startHourSel.innerHTML = '';
    for(let h=0; h<24; h++){
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = hourLabel(h);
      if(data && data.startHour === h) opt.selected = true;
      startHourSel.appendChild(opt);
    }

    if(data){
      hourSpanSel.value = String(Math.max(1, data.rows));
      buildTable(data.startHour, data.rows, data.values);
      if(data.theme === 'light'){
        document.documentElement.classList.add('light');
        btnTheme.setAttribute('aria-pressed','true');
        btnTheme.textContent = 'โหมดสว่าง';
      }
    }else{
      buildTable(8, 12);
    }
  }

  // ---------- Export PNG (simple grid painter) ----------
  function exportPNG(){
    const rows = elAll('#planner tbody tr');
    const cols = weekdays.length + 1; // time + 7 days

    const cellW = 180;
    const timeW = 110;
    const cellH = 42;
    const pad = 10;
    const w = timeW + weekdays.length * cellW + 2;
    const h = 40 + rows.length * cellH + 2;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // bg
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--panel').trim() || '#fff';
    ctx.fillRect(0,0,w,h);

    // fonts
    ctx.font = '600 14px Inter, Arial, sans-serif';
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#000';

    // Header
    // Time header
    ctx.fillText('เวลา', pad, 26);
    // Day headers
    weekdays.forEach((d, i)=>{
      const x = timeW + i*cellW + pad;
      ctx.fillText(d, x, 26);
    });

    // Grid lines
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--outline').trim() || '#bbb';
    ctx.lineWidth = 1;
    // outer border
    ctx.strokeRect(0.5, 0.5, w-1, h-1);

    // header bottom line
    ctx.beginPath();
    ctx.moveTo(0, 40.5);
    ctx.lineTo(w, 40.5);
    ctx.stroke();

    // vertical lines
    ctx.beginPath();
    ctx.moveTo(timeW + 0.5, 0);
    ctx.lineTo(timeW + 0.5, h);
    for(let i=1;i<=weekdays.length;i++){
      const x = timeW + i*cellW + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    ctx.stroke();

    // rows
    rows.forEach((tr, rIdx)=>{
      const y = 40 + rIdx*cellH + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      // time
      const time = tr.querySelector('.row-head').textContent;
      ctx.fillText(time, pad, 40 + rIdx*cellH + 26);

      // cells text
      const cells = Array.from(tr.querySelectorAll('.cell'));
      cells.forEach((c, i)=>{
        const text = c.textContent || '';
        const x = timeW + i*cellW + pad;
        const yy = 40 + rIdx*cellH + 26;
        wrapText(ctx, text, x, yy, cellW - pad*2, 16);
      });
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planner.png';
    a.click();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = text.split(/\s+/);
    let line = '';
    for(let n=0; n<words.length; n++){
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if(metrics.width > maxWidth && n>0){
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      }else{
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  // ---------- Theme ----------
  function toggleTheme(){
    const light = document.documentElement.classList.toggle('light');
    btnTheme.setAttribute('aria-pressed', light ? 'true' : 'false');
    btnTheme.textContent = light ? 'โหมดสว่าง' : 'โหมดมืด';
    save();
  }

  // ---------- Audio ----------
  function audioInit(){
    aPlay.addEventListener('click', async ()=>{
      try{
        await music.play();
        aStatus.textContent = 'กำลังเล่น';
      }catch(e){
        aStatus.textContent = 'ไม่สามารถเล่นได้: ' + e.message;
      }
    });
    aPause.addEventListener('click', ()=>{ music.pause(); aStatus.textContent = 'หยุดชั่วคราว'; });
    aVolume.addEventListener('input', ()=>{ music.volume = Number(aVolume.value); });
    aMute.addEventListener('click', ()=>{
      const pressed = aMute.getAttribute('aria-pressed') === 'true';
      music.muted = !pressed;
      aMute.setAttribute('aria-pressed', (!pressed).toString());
      aMute.textContent = music.muted ? 'เปิดเสียง' : 'ปิดเสียง';
    });
    music.addEventListener('ended', ()=>{ aStatus.textContent = 'เล่นจบแล้ว'; });
  }

  // ---------- Events ----------
  btnBuild.addEventListener('click', ()=>{
    const s = parseInt(startHourSel.value,10);
    const span = parseInt(hourSpanSel.value,10);
    buildTable(s, span);
    save();
  });
  btnNewRow.addEventListener('click', addRow);
  btnDeleteRow.addEventListener('click', deleteSelectedRow);
  btnClear.addEventListener('click', ()=>{
    if(confirm('ล้างข้อมูลทั้งหมดในตารางใช่หรือไม่?')){
      elAll('.cell').forEach(c=>c.textContent='');
      save();
    }
  });
  btnExport.addEventListener('click', exportPNG);
  btnPrint.addEventListener('click', ()=> window.print());
  btnTheme.addEventListener('click', toggleTheme);

  document.addEventListener('input', (e)=>{
    if(e.target.classList.contains('cell')) save();
  });

  // Init
  year.textContent = new Date().getFullYear();
  audioInit();
  restore();
})();