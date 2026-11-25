const API_URL="https://myfinance-api.pradhamaryando28.workers.dev";
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
async function api(path,options={}) {
  const r=await fetch(API_URL+path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
  const d=await r.json().catch(()=>({success:false,message:"Respons server tidak valid"}));
  if(!r.ok||d.success===false) throw new Error(d.message||"Permintaan gagal");
  return d;
}
function addChat(text,cls="bot"){
  const el=document.createElement("div");el.className="bubble "+cls;el.textContent=text;
  document.querySelector("#chat").appendChild(el);el.scrollIntoView({block:"end"});
}
function amountFrom(text){
  const s=text.toLowerCase().replace(/\./g,"").replace(/,/g,".");
  const m=[...s.matchAll(/(\d+(?:\.\d+)?)\s*(juta|jt|ribu|rb|k)?/g)];
  if(!m.length)return 0;
  const x=m[m.length-1],u=x[2]||"";
  return Math.round(Number(x[1])*(["juta","jt"].includes(u)?1e6:["ribu","rb","k"].includes(u)?1e3:1));
}
function parseChat(text,profile){
  const s=text.toLowerCase();
  if(/\b(transfer|pindah saldo|kirim saldo)\b/.test(s))throw Error("Fitur transfer belum tersedia.");
  const income=/\b(gaji|bonus|pemasukan|terima|dapat|komisi|hasil jual|masuk)\b/.test(s);
  const amount=amountFrom(text);
  if(!amount)throw Error("Nominal belum terbaca. Contoh: Makan 25000 atau Gaji 3 juta.");
  let category=income?(/gaji/.test(s)?"Gaji":"Pemasukan Lainnya"):(/makan|minum|kopi/.test(s)?"Makanan":/bensin|bbm|parkir|tol/.test(s)?"Transportasi":/belanja|pasar|sembako/.test(s)?"Belanja":/listrik|wifi|pulsa/.test(s)?"Tagihan":"Pengeluaran Lainnya");
  const desc=text.replace(/\d+(?:[.,]\d+)?\s*(juta|jt|ribu|rb|k)?/ig,"").replace(/\b(gaji|pemasukan|pengeluaran|masuk|keluar)\b/ig,"").replace(/\s+/g," ").trim()||"Transaksi";
  return {profile,type:income?"income":"expense",amount,category,description:desc,transaction_date:new Date().toLocaleDateString("en-CA")};
}
document.querySelector("#chatForm").addEventListener("submit",e=>{
  e.preventDefault();const input=document.querySelector("#messageInput"),text=input.value.trim();if(!text)return;
  addChat(text,"mine");input.value="";
  try{const t=parseChat(text,window.activeProfile);window.pending=t;showConfirm(t);}catch(err){addChat(err.message);}
});
function showConfirm(t){
  document.querySelector("#confirmArea").innerHTML=`<div class="confirm"><b>Konfirmasi transaksi</b>
  <div class="formgrid">
  <label>Profil<select id="pProfile"><option ${t.profile==="Suami"?"selected":""}>Suami</option><option ${t.profile==="Istri"?"selected":""}>Istri</option></select></label>
  <label>Jenis<select id="pType"><option value="expense" ${t.type==="expense"?"selected":""}>Pengeluaran</option><option value="income" ${t.type==="income"?"selected":""}>Pemasukan</option></select></label>
  <label>Nominal<input id="pAmount" type="number" value="${t.amount}"></label>
  <label>Kategori<input id="pCategory" value="${t.category}"></label>
  <label class="wide">Keterangan<input id="pDesc" value="${t.description.replace(/"/g,"&quot;")}"></label>
  </div><button class="btn" id="saveTx">Simpan Transaksi</button> <button class="btn light" id="cancelTx">Batal</button><p id="saveError" class="error"></p></div>`;
  document.querySelector("#saveTx").onclick=saveTx;document.querySelector("#cancelTx").onclick=()=>{window.pending=null;document.querySelector("#confirmArea").innerHTML="";};
}
async function saveTx(){
  const t={profile:pProfile.value,type:pType.value,amount:Number(pAmount.value),category:pCategory.value,description:pDesc.value,transaction_date:new Date().toLocaleDateString("en-CA")};
  try{await api("/api/transactions",{method:"POST",body:JSON.stringify(t)});document.querySelector("#confirmArea").innerHTML="";addChat("Transaksi berhasil disimpan.");await loadApp();}
  catch(e){document.querySelector("#saveError").textContent=e.message;}
}
async function loadApp(){
  try{
    const [s,tx]=await Promise.all([api("/api/summary"),api("/api/transactions")]);
    document.querySelector("#balance").textContent=money(s.data.balance);
    document.querySelector("#income").textContent=money(s.data.income);
    document.querySelector("#expense").textContent=money(s.data.expense);
    document.querySelector("#history").innerHTML=tx.data.length?tx.data.map(x=>`<div class="historyrow"><div><b>${esc(x.description)}</b><small>${esc(x.profile)} · ${esc(x.category_name||"-")} · ${esc(x.transaction_date)}</small></div><strong class="${x.type}">${x.type==="income"?"+":"−"}${money(x.amount)}</strong></div>`).join(""):"<p>Belum ada transaksi.</p>";
  }catch(e){document.querySelector("#appError").textContent=e.message;}
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
window.startProfile=p=>{window.activeProfile=p;sessionStorage.setItem("mf_profile",p);document.querySelector("#choose").hidden=true;document.querySelector("#app").hidden=false;document.querySelector("#profileName").textContent=p;loadApp();};
window.changeProfile=()=>{sessionStorage.removeItem("mf_profile");location.reload();};
const saved=sessionStorage.getItem("mf_profile");if(["Suami","Istri"].includes(saved))startProfile(saved);
