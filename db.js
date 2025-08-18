const DB_NAME = 'neet-flash-v3';
const DB_VER = 1;
let db;

function openDB(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains('cards')){
        const s = d.createObjectStore('cards',{keyPath:'id'});
        s.createIndex('subject','subject');
      }
      if(!d.objectStoreNames.contains('knowledge')){
        const s2 = d.createObjectStore('knowledge',{keyPath:'id'});
        s2.createIndex('subject','subject');
      }
      if(!d.objectStoreNames.contains('settings'))
        d.createObjectStore('settings',{keyPath:'key'});
    };
    r.onsuccess = ()=>{ db = r.result; res(db); };
    r.onerror = ()=>rej(r.error);
  });
}

function tx(s,m='readonly'){ 
  return db.transaction(s,m).objectStore(s);
}

async function saveCard(c){
  return new Promise(r=>tx('cards','readwrite').put(c).onsuccess=()=>r(c));
}

async function getCards(){
  return new Promise(r=>{
    const out=[];
    const s=tx('cards');
    s.openCursor().onsuccess=e=>{
      const cur=e.target.result;
      if(cur){
        out.push(cur.value);
        cur.continue();
      }else{
        out.sort((a,b)=>b.createdAt-a.createdAt);
        r(out);
      }
    };
  });
}

async function deleteCard(id){
  return new Promise(r=>tx('cards','readwrite').delete(id).onsuccess=()=>r(true));
}

async function saveKP(k){
  return new Promise(r=>tx('knowledge','readwrite').put(k).onsuccess=()=>r(k));
}

async function getKPs(){
  return new Promise(r=>{
    const out=[];
    const s=tx('knowledge');
    s.openCursor().onsuccess=e=>{
      const c=e.target.result;
      if(c){
        out.push(c.value);
        c.continue();
      }else{
        out.sort((a,b)=>b.createdAt-a.createdAt);
        r(out);
      }
    };
  });
}

async function deleteKP(id){
  return new Promise(r=>tx('knowledge','readwrite').delete(id).onsuccess=()=>r(true));
}

async function setSetting(k,v){
  return new Promise(r=>tx('settings','readwrite').put({key:k,value:v}).onsuccess=()=>r(true));
}

async function getSetting(k){
  return new Promise(r=>{
    const s=tx('settings');
    const q=s.get(k);
    q.onsuccess=()=>r(q.result? q.result.value: null);
  });
}

async function exportAll(){
  const [cards,kps] = await Promise.all([getCards(), getKPs()]);
  return {exportedAt:Date.now(), cards, kps};
}

async function importAll(obj){
  const s1 = tx('cards','readwrite');
  const s2 = tx('knowledge','readwrite');
  await Promise.all((obj.cards||[]).map(c=>new Promise(ok=>s1.put(c).onsuccess=()=>ok())));
  await Promise.all((obj.kps||[]).map(k=>new Promise(ok=>s2.put(k).onsuccess=()=>ok())));
  return true;
}

window.DB = {
  openDB, saveCard, getCards, deleteCard,
  saveKP, getKPs, deleteKP,
  setSetting, getSetting,
  exportAll, importAll
};
