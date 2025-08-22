(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const nav = { dashboard:$('#nav-dashboard'), questions:$('#nav-questions'), knowledge:$('#nav-knowledge'), search:$('#nav-search'), settings:$('#nav-settings') };
  const views = { dashboard:$('#view-dashboard'), questions:$('#view-questions'), knowledge:$('#view-knowledge'), search:$('#view-search'), settings:$('#view-settings') };
  const tpl = { card: document.getElementById('tpl-card') };
  const list = $('#questions-list');
  const kpAreas = $('#kp-areas');

  DB.openDB().then(async ()=>{
    const theme = await DB.getSetting('theme');
    if(theme) document.documentElement.setAttribute('data-theme', theme);
    renderDashboard();
    renderQuestions();
    renderKPs();
  });

  const CHAPTER_MAP=[{subject:'Biology',chapter:'Molecular Basis of Inheritance',keywords:['dna','rna','replication','polymerase','transcription','translation','gene','chromosome']},{subject:'Biology',chapter:'Human Reproduction',keywords:['spermatogenesis','oogenesis','menstrual','implantation','fertilization','ovary','testes']},{subject:'Chemistry',chapter:'Aldehydes, Ketones',keywords:['aldehyde','ketone','iodoform','carbonyl','acyl','nucleophile']},{subject:'Physics',chapter:'Work, Energy & Power',keywords:['work','energy','power','kinetic','potential']},{subject:'Physics',chapter:'Electrostatics',keywords:['charge','coulomb','electric','capacitor','field','potential']}];
  function detectChapters(text, subjectHint){const t=(text||'').toLowerCase();const hits=new Set();CHAPTER_MAP.forEach(m=>{if(subjectHint && m.subject!==subjectHint) return; m.keywords.forEach(k=>{ if(t.includes(k)) hits.add(m.chapter); });}); return Array.from(hits); }

  Object.keys(nav).forEach(k=> nav[k].addEventListener('click', ()=> showView(k)));
  Object.keys(nav).forEach(k=>nav[k].addEventListener('click', ()=> showView(k)));
  // Add button binding
$('#add-quick').onclick = ()=>{
  showView('questions');
  $('#quick-text').focus();};
  function showView(name){ Object.values(nav).forEach(b=>b.classList.remove('active')); nav[name].classList.add('active'); Object.values(views).forEach(v=>v.classList.add('hidden')); views[name].classList.remove('hidden'); }

  $('#quick-ocr').onclick = async ()=>{ const f = $('#quick-image').files[0]; if(!f) return alert('Upload image first'); $('#quick-ocr').disabled=true; $('#quick-ocr').textContent='Running OCR…'; try{ const data = await fileToDataURL(f); const worker = await Tesseract.createWorker(); await worker.load(); await worker.loadLanguage('eng'); await worker.initialize('eng'); const { data: { text } } = await worker.recognize(data); await worker.terminate(); $('#quick-text').value = ($('#quick-text').value + '\n' + text.trim()).trim(); }catch(e){ alert('OCR error: '+e.message); } $('#quick-ocr').disabled=false; $('#quick-ocr').textContent='OCR'; };

  $('#quick-save').onclick = async (e)=>{ e.preventDefault(); const subj = $('#quick-subject').value; const text = $('#quick-text').value.trim(); if(!subj || !text) return alert('Pick subject and add text'); const img = $('#quick-image').files[0] ? await fileToDataURL($('#quick-image').files[0]) : null; const card = { id: crypto.randomUUID(), subject: subj, text, img, diff: $('#quick-diff').value, tags:'', createdAt: Date.now(), chapters: detectChapters(text, subj), saved:true, notes:'', solution:null }; await DB.saveCard(card); $('#quick-text').value=''; $('#quick-image').value=''; $('#quick-subject').value=''; renderQuestions(); renderDashboard(); };

  async function renderDashboard(){ const cards = await DB.getCards(); const kps = await DB.getKPs(); const wrongs = cards.filter(c=>c.saved).slice(0,6); $('#rev-queue').innerHTML = wrongs.length ? wrongs.map(c=>`<div class="small">${c.subject} — ${escapeHTML(c.text).slice(0,60)}</div>`).join('') : 'No items yet'; $('#recent-kp').innerHTML = kps.slice(0,6).map(k=>`<div class="small">${k.subject}: ${escapeHTML(k.content).slice(0,80)}</div>`).join('') || 'No items yet'; }

  async function renderQuestions(){ const all = await DB.getCards(); const fsub = $('#filter-subject').value; const fdiff = $('#filter-diff').value; const ftag = $('#filter-tag').value.toLowerCase(); const filtered = all.filter(q=>{ if(fsub && q.subject!==fsub) return false; if(fdiff && q.diff!==fdiff) return false; if(ftag){ const hay=(q.tags||'')+' '+(q.text||''); if(!hay.toLowerCase().includes(ftag)) return false; } return true; }); list.innerHTML=''; filtered.forEach(q=> list.appendChild(renderCardNode(q))); }

  function renderCardNode(q){ const node = tpl.card.content.firstElementChild.cloneNode(true); node.dataset.id = q.id; node.querySelector('.pill.subject').textContent = q.subject; node.querySelector('.pill.subject').classList.add(q.subject==='Biology' ? 'bio' : q.subject==='Chemistry' ? 'chem' : 'phy'); node.querySelector('.pill.diff').textContent = q.diff || ''; const front = node.querySelector('.front'); const back = node.querySelector('.back'); const foot = node.querySelector('.card-foot'); front.innerHTML = q.img ? `<img src="${q.img}" style="max-width:100%;border-radius:8px" />` + `<div class="small">${escapeHTML(q.text)}</div>` : `<div class="small">${escapeHTML(q.text)}</div>`; back.innerHTML = q.solution || `<em>No solution yet. Click 'Solve' from options.</em>`; foot.innerHTML = q.chapters && q.chapters.length ? `Chapters: ${q.chapters.join(', ')}` : '<span class="small muted">No chapter detected</span>'; node.querySelector('.flip').onclick = ()=>{ front.classList.toggle('hidden'); back.classList.toggle('hidden'); renderMath(back); }; node.querySelector('.save-qa').onclick = async ()=>{ q.saved = !q.saved; await DB.saveCard(q); renderQuestions(); renderDashboard(); }; node.querySelector('.more').onclick = ()=> showCardMenu(q, node); return node; }

  function showCardMenu(q, node){ const menu = document.createElement('div'); menu.className='card menu'; menu.style.position='absolute'; menu.style.zIndex=999; menu.innerHTML = `<button id="solve">Solve</button> <button id="edit">Edit</button> <button id="delete">Delete</button>`; document.body.appendChild(menu); const rect = node.getBoundingClientRect(); menu.style.left = (rect.right - 200) + 'px'; menu.style.top = (rect.top + 20) + 'px'; menu.querySelector('#solve').onclick = async ()=>{ await solveCard(q); document.body.removeChild(menu); renderQuestions(); }; menu.querySelector('#edit').onclick = async ()=>{ const notes = prompt('Edit notes:', q.notes||''); if(notes!==null){ q.notes=notes; await DB.saveCard(q); renderQuestions(); } document.body.removeChild(menu); }; menu.querySelector('#delete').onclick = async ()=>{ if(confirm('Delete?')){ await DB.deleteCard(q.id); renderQuestions(); renderDashboard(); } document.body.removeChild(menu); }; document.addEventListener('click', function off(e){ if(!menu.contains(e.target)){ menu.remove(); document.removeEventListener('click', off); } }); }

  async function solveCard(q){ const key = await DB.getSetting('openai_key'); let solutionHTML = ''; if(key){ try{ const sys = 'You are a NEET tutor. Provide stepwise solution and cite NCERT chapter/section if relevant. End with 3 quick memory bullets.'; const user = `Subject: ${q.subject}\nQuestion: ${q.text}`; const resp = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization': 'Bearer '+key }, body: JSON.stringify({ model:'gpt-4o-mini', messages:[{role:'system',content:sys},{role:'user',content:user}], temperature:0.2 }) }); const data = await resp.json(); solutionHTML = data.choices?.[0]?.message?.content || 'AI returned no answer.'; }catch(e){ solutionHTML = `<p>AI error: ${escapeHTML(e.message)}</p>` + fallback(q); } } else { solutionHTML = fallback(q); } q.solution = solutionHTML; await DB.saveCard(q); }

  function fallback(q){ const maps = { 'Biology':'Refer NCERT chapter for definitions and diagrams.','Chemistry':'Classify reaction/mechanism and proceed stepwise.','Physics':'Draw diagram, list givens and apply relevant equation.' }; const anchor = detectChapters(q.text, q.subject); const ref = anchor.length ? `<p><strong>Detected chapters:</strong> ${anchor.join(', ')}</p>` : '<p>No chapter detected — check keywords</p>'; return `<div><strong>Approach:</strong> ${maps[q.subject] || 'Break into givens, principle, solution.'}</div>${ref}<ul><li>Step 1: Identify concept</li><li>Step 2: Solve</li><li>Step 3: Check units / reason</li></ul><div class="small">Memory: Summarize in 2 lines.</div>`; }

  async function renderKPs(){ const kps = await DB.getKPs(); if(kps.length===0){ kpAreas.innerHTML = '<div class="small">No knowledge points yet</div>'; return; } const groups = {}; kps.forEach(k=>{ const chapters = k.chapters && k.chapters.length ? k.chapters : ['Miscellaneous']; chapters.forEach(ch=>{ const key = `${k.subject}||${ch}`; groups[key] = groups[key] || { subject:k.subject, chapter:ch, items:[] }; groups[key].items.push(k); }); }); kpAreas.innerHTML = ''; Object.values(groups).forEach(g=>{ const card = document.createElement('div'); card.className='card'; card.innerHTML = `<h3>${g.subject} — ${g.chapter} <span class="small">(${g.items.length})</span></h3>` + g.items.map(i=>`<div class="small">${escapeHTML(i.content)} <button data-id="${i.id}" class="kp-del">Delete</button></div>`).join(''); kpAreas.appendChild(card); }); $$('button.kp-del').forEach(b=> b.onclick= async ()=>{ const id=b.dataset.id; if(confirm('Delete?')){ await DB.deleteKP(id); renderKPs(); } }); }

  document.addEventListener('dblclick', async (e)=>{ const sel = window.getSelection().toString().trim(); if(sel.length>3){ showSaveKP(sel); } });
  document.addEventListener('contextmenu', async (e)=>{ const sel = window.getSelection().toString().trim(); if(sel.length>3){ e.preventDefault(); showSaveKP(sel); } });

  function showSaveKP(text){ const subj = prompt('Subject for this point (Biology/Chemistry/Physics):','Biology'); if(!subj) return; const chapters = detectChapters(text, subj); const kp = { id: crypto.randomUUID(), subject: subj, content: text, createdAt: Date.now(), chapters }; DB.saveKP(kp).then(()=>{ alert('Saved to Knowledge Bank'); renderKPs(); renderDashboard(); }); }

  $('#btn-lookup').onclick = ()=>{ const q = encodeURIComponent($('#lookup-query').value.trim()); $('#lnk-vedantu').href = 'https://www.google.com/search?q=site:vedantu.com+'+q; $('#lnk-doubtnut').href = 'https://www.google.com/search?q=site:doubtnut.com+'+q; $('#lnk-byjus').href = 'https://www.google.com/search?q=site:byjus.com+'+q; $('#lnk-brainly').href = 'https://www.google.com/search?q=site:brainly.in+'+q; if(q) window.open('https://www.google.com/search?q='+q,'_blank'); };

  $('#export-json').onclick = async ()=>{ const data = await DB.exportAll(); const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='neet-flashcards-backup.json'; a.click(); URL.revokeObjectURL(url); };
  $('#import-json').onclick = async ()=>{ const f = $('#import-file').files[0]; if(!f) return alert('Choose file'); const txt = await f.text(); try{ const obj = JSON.parse(txt); await DB.importAll({ cards: obj.cards||obj.questions||[], kps: obj.knowledge||obj.kps||[] }); alert('Imported'); renderQuestions(); renderKPs(); renderDashboard(); }catch(e){ alert('Invalid JSON'); } };

  $('#save-api').onclick = async ()=>{ await DB.setSetting('openai_key',$('#api-key').value.trim()); alert('Saved'); };
  $('#clear-api').onclick = async ()=>{ await DB.setSetting('openai_key',''); $('#api-key').value=''; alert('Cleared'); };

  $('#theme-toggle').onclick = async ()=>{ const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', cur); await DB.setSetting('theme', cur); };

  function escapeHTML(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fileToDataURL(f){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); }); }
  function renderMath(el){ try{ renderMathInElement(el, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]}); }catch(e){} } 
})();
