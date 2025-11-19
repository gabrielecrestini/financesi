const API_URL = "https://api.coingecko.com/api/v3";
const NEWS_API = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";

let portfolio = JSON.parse(localStorage.getItem('crypto_portfolio')) || [];
let history = JSON.parse(localStorage.getItem('crypto_history')) || [];
let realizedProfit = parseFloat(localStorage.getItem('crypto_realized_pl')) || 0;

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    loadPortfolio();
    loadHistory();
    setupSearch();
    setupConverter();
    setupCalculator();
    setupSettings();
    setupPWA();
    
    // Auto Update
    setInterval(() => { if(document.getElementById('view-portfolio').classList.contains('active')) loadPortfolio(true); }, 60000);
    
    fetchMarket();
    updateHeaderSummary(0, 0);
});

function initNav() {
    const links = document.querySelectorAll('.nav-link');
    const header = document.getElementById('app-header');
    links.forEach(l => l.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        l.classList.add('active');
        const target = l.getAttribute('data-target');
        document.getElementById(target).classList.add('active');
        if(target === 'view-portfolio') header.classList.add('visible');
        else header.classList.remove('visible');
        if(target === 'view-mercato') fetchNews();
    }));
    header.classList.add('visible');
}

function toggleAddForm() {
    const f = document.getElementById('add-form-container');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

// --- PORTFOLIO ---
async function loadPortfolio(silent = false) {
    const list = document.getElementById('holdings-list');
    if(portfolio.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#666;">Portfolio vuoto.<br>Inizia aggiungendo un asset!</div>';
        updateHeaderSummary(0, 0);
        return;
    }
    if(!silent) list.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Aggiorno valori...</div>';

    const ids = [...new Set(portfolio.map(p => p.id))].join(',');
    try {
        const res = await fetch(`${API_URL}/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`);
        const prices = await res.json();
        if(!silent) list.innerHTML = '';
        let currentVal = 0;
        let investedVal = 0;

        portfolio.forEach((asset, idx) => {
            const priceData = prices[asset.id] || { eur: asset.buyPrice, eur_24h_change: 0 };
            const val = asset.amount * priceData.eur;
            const cost = asset.amount * asset.buyPrice;
            const pl = val - cost;
            currentVal += val;
            investedVal += cost;

            const html = `
                <div class="asset-item">
                    <div class="asset-left">
                        <div class="coin-avatar">${asset.name.charAt(0)}</div>
                        <div><h4 style="margin:0;">${asset.name}</h4><small>${asset.amount} • €${asset.buyPrice}</small></div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:bold;">€${val.toFixed(2)}</div>
                        <div class="${pl>=0?'text-profit':'text-loss'}" style="font-size:0.8rem;">${pl>=0?'+':''}€${pl.toFixed(2)}</div>
                        <div class="asset-actions">
                            <button onclick="openSellModal(${idx})" class="btn-action" style="color:#e0aaff;"><i class="fas fa-coins"></i></button>
                            <button onclick="deleteAsset(${idx})" class="btn-action" style="color:#666;"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
            if(!silent) list.innerHTML += html;
        });
        updateHeaderSummary(currentVal, investedVal);
        document.getElementById('last-update').innerText = "Aggiornato: " + new Date().toLocaleTimeString();
    } catch(e) { console.log("Errore API", e); }
}

function updateHeaderSummary(current, invested) {
    const unrealized = current - invested;
    const totalBalance = current + realizedProfit;
    document.getElementById('total-balance').innerText = `€ ${totalBalance.toLocaleString('it-IT', {minimumFractionDigits:2})}`;
    const uPlEl = document.getElementById('unrealized-pl');
    uPlEl.innerText = `${unrealized>=0?'+':''}€ ${unrealized.toFixed(2)}`;
    uPlEl.className = unrealized >= 0 ? 'text-profit' : 'text-loss';
    const rPlEl = document.getElementById('realized-pl');
    rPlEl.innerText = `${realizedProfit>=0?'+':''}€ ${realizedProfit.toFixed(2)}`;
    rPlEl.className = realizedProfit >= 0 ? 'text-profit' : 'text-loss';
}

// --- SELL ---
let selectedAssetIdx = null;
window.openSellModal = function(idx) {
    selectedAssetIdx = idx;
    const asset = portfolio[idx];
    document.getElementById('sell-asset-name').innerText = `Vendi ${asset.name} (Max: ${asset.amount})`;
    document.getElementById('sell-amount').value = asset.amount;
    document.getElementById('sell-modal').style.display = 'flex';
}
window.closeSellModal = function() { document.getElementById('sell-modal').style.display = 'none'; selectedAssetIdx = null; }
window.confirmSell = function() {
    const amount = parseFloat(document.getElementById('sell-amount').value);
    const price = parseFloat(document.getElementById('sell-price').value);
    if(!amount || !price || selectedAssetIdx === null) return alert("Dati non validi");
    const asset = portfolio[selectedAssetIdx];
    if(amount > asset.amount) return alert("Quantità insufficiente");
    
    const costBasis = asset.buyPrice * amount;
    const sellValue = price * amount;
    const profit = sellValue - costBasis;
    
    realizedProfit += profit;
    localStorage.setItem('crypto_realized_pl', realizedProfit);
    history.unshift({ name: asset.name, amount: amount, buyPrice: asset.buyPrice, sellPrice: price, profit: profit, date: new Date().toLocaleDateString() });
    localStorage.setItem('crypto_history', JSON.stringify(history));
    
    asset.amount -= amount;
    if(asset.amount <= 0) portfolio.splice(selectedAssetIdx, 1);
    localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
    closeSellModal(); loadPortfolio(); loadHistory();
}
function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if(history.length === 0) return;
    history.forEach(h => {
        list.innerHTML += `<div style="border-left:3px solid ${h.profit>=0?'var(--profit)':'var(--loss)'}; background:rgba(255,255,255,0.02); padding:10px; margin-bottom:5px; border-radius:4px; display:flex; justify-content:space-between;">
            <div><b>${h.name}</b><br><small>${h.date}</small></div>
            <div style="text-align:right;"><div>€${(h.sellPrice*h.amount).toFixed(2)}</div><div class="${h.profit>=0?'text-profit':'text-loss'}">${h.profit>=0?'+':''}€${h.profit.toFixed(2)}</div></div>
        </div>`;
    });
}
function deleteAsset(idx) { if(confirm("Eliminare asset?")) { portfolio.splice(idx, 1); localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio)); loadPortfolio(); } }

// --- CONVERTER (DIRECT) ---
function setupConverter() {
    fetch(`${API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1`)
    .then(r => r.json()).then(d => {
        const opts = d.map(c => `<option value="${c.id}">${c.name} (${c.symbol.toUpperCase()})</option>`).join('');
        document.getElementById('conv-from-crypto').innerHTML = opts;
        document.getElementById('conv-to-crypto').innerHTML = opts;
    });
    document.getElementById('btn-swap').addEventListener('click', () => {
        const f = document.getElementById('conv-from'); const t = document.getElementById('conv-to');
        const temp = f.value; f.value = t.value; t.value = temp;
    });

    document.getElementById('btn-convert').addEventListener('click', async () => {
        const amt = parseFloat(document.getElementById('conv-amount').value);
        const from = document.getElementById('conv-from').value;
        const to = document.getElementById('conv-to').value;
        const res = document.getElementById('conv-result');
        if(!amt) return;
        res.value = "...";

        try {
            // 1. Crypto -> Fiat (Diretto da CoinGecko)
            if(!['eur','usd'].includes(from) && ['eur','usd'].includes(to)) {
                const r = await fetch(`${API_URL}/simple/price?ids=${from}&vs_currencies=${to}`);
                const d = await r.json();
                res.value = (amt * d[from][to]).toFixed(2);
            } 
            // 2. Fiat -> Crypto (Inverso)
            else if(['eur','usd'].includes(from) && !['eur','usd'].includes(to)) {
                const r = await fetch(`${API_URL}/simple/price?ids=${to}&vs_currencies=${from}`);
                const d = await r.json();
                res.value = (amt / d[to][from]).toFixed(6);
            }
            // 3. Crypto -> Crypto (Cross Rate tramite USD se necessario)
            else {
                // Semplificato: uso USD come base se entrambe sono crypto per affidabilità
                const r1 = await fetch(`${API_URL}/simple/price?ids=${from}&vs_currencies=usd`);
                const r2 = await fetch(`${API_URL}/simple/price?ids=${to}&vs_currencies=usd`);
                const d1 = await r1.json();
                const d2 = await r2.json();
                const val = (amt * d1[from].usd) / d2[to].usd;
                res.value = val.toFixed(6);
            }
        } catch(e) { res.value = "Errore"; }
    });
}

// --- CALCULATOR (MATH ONLY) ---
function setupCalculator() {
    document.getElementById('btn-calc-interest').addEventListener('click', () => {
        const init = parseFloat(document.getElementById('calc-initial').value);
        const month = parseFloat(document.getElementById('calc-monthly').value);
        const rate = parseFloat(document.getElementById('calc-apy').value)/100/12;
        const years = parseInt(document.getElementById('calc-years').value);
        let bal = init; let invested = init;
        const tbody = document.getElementById('year-list-body'); tbody.innerHTML = '';
        
        for(let i=1; i<=years; i++) {
            for(let m=0; m<12; m++) { bal = (bal + month) * (1+rate); invested += month; }
            const interest = bal - invested;
            tbody.innerHTML += `<tr><td>${i}</td><td>€ ${invested.toLocaleString('it-IT',{maximumFractionDigits:0})}</td><td class="text-profit">+€ ${interest.toLocaleString('it-IT',{maximumFractionDigits:0})}</td><td><strong>€ ${bal.toLocaleString('it-IT',{maximumFractionDigits:0})}</strong></td></tr>`;
        }
        document.getElementById('res-total').innerText = `€ ${bal.toLocaleString('it-IT', {maximumFractionDigits: 2})}`;
        document.getElementById('calc-results').style.display = 'block';
    });
}

// --- SEARCH & NEWS ---
function setupSearch() {
    const inp = document.getElementById('asset-name'); const box = document.getElementById('search-results');
    let timer;
    inp.addEventListener('input', (e) => {
        clearTimeout(timer);
        if(e.target.value.length<2) { box.style.display='none'; return; }
        timer = setTimeout(async()=>{
            const r = await fetch(`${API_URL}/search?query=${e.target.value}`);
            const d = await r.json();
            box.innerHTML=''; box.style.display='block';
            d.coins.slice(0,5).forEach(c=>{ box.innerHTML+=`<div class="search-item" onclick="selectAsset('${c.id}','${c.name}')"><img src="${c.thumb}"> ${c.name}</div>`; });
        },300);
    });
    document.getElementById('add-transaction-form').addEventListener('submit', (e)=>{
        e.preventDefault();
        const id = document.getElementById('asset-id').value;
        if(!id) return alert("Seleziona da lista");
        portfolio.push({ id:id, name:document.getElementById('asset-name').value, amount:parseFloat(document.getElementById('tx-amount').value), buyPrice:parseFloat(document.getElementById('tx-price').value) });
        localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
        loadPortfolio(); e.target.reset(); toggleAddForm();
    });
    document.getElementById('get-current-price-btn').addEventListener('click', async()=>{
        const id = document.getElementById('asset-id').value;
        if(!id) return;
        const r = await fetch(`${API_URL}/simple/price?ids=${id}&vs_currencies=eur`);
        const d = await r.json();
        document.getElementById('tx-price').value = d[id].eur;
    });
}
window.selectAsset = function(id, name) { document.getElementById('asset-name').value=name; document.getElementById('asset-id').value=id; document.getElementById('search-results').style.display='none'; }
window.switchMarketTab = function(t) { document.getElementById('market-content-trending').style.display=t==='trending'?'block':'none'; document.getElementById('market-content-news').style.display=t==='news'?'block':'none'; if(t==='news') fetchNews(); }
async function fetchMarket() {
    const c = document.getElementById('market-content-trending');
    const r = await fetch(`${API_URL}/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=20&page=1&sparkline=false`);
    const d = await r.json();
    c.innerHTML = '';
    d.forEach((coin,i)=> { c.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05);"><div style="display:flex; gap:10px; align-items:center;"><span style="color:#666; font-size:0.8rem;">${i+1}</span><img src="${coin.image}" width="25"><div><b>${coin.symbol.toUpperCase()}</b></div></div><div style="text-align:right;"><div>€${coin.current_price.toLocaleString()}</div><div class="${coin.price_change_percentage_24h>=0?'text-profit':'text-loss'}">${coin.price_change_percentage_24h.toFixed(2)}%</div></div></div>`; });
}
async function fetchNews() {
    const c = document.getElementById('market-content-news'); if(c.children.length>0) return;
    const r = await fetch(NEWS_API); const d = await r.json();
    c.innerHTML='';
    d.Data.slice(0,10).forEach(n=>{ c.innerHTML += `<a href="${n.url}" target="_blank" class="card" style="display:flex; gap:10px; padding:10px; text-decoration:none; color:white;"><img src="${n.imageurl}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;"><div><h4 style="font-size:0.9rem; margin:0;">${n.title}</h4><small style="color:var(--accent)">${n.source}</small></div></a>`; });
}
function setupSettings() {
    document.getElementById('btn-export').addEventListener('click', ()=>{ const d = {p:portfolio, h:history, r:realizedProfit}; const area = document.getElementById('export-area'); area.style.display='block'; area.value = btoa(JSON.stringify(d)); });
    document.getElementById('btn-import').addEventListener('click', ()=>{ try { const d = JSON.parse(atob(document.getElementById('import-area').value)); localStorage.setItem('crypto_portfolio', JSON.stringify(d.p)); localStorage.setItem('crypto_history', JSON.stringify(d.h)); localStorage.setItem('crypto_realized_pl', d.r); location.reload(); } catch(e){alert("Codice errato");} });
    document.getElementById('btn-clear-data').addEventListener('click', ()=>{ if(confirm("Reset?")) {localStorage.clear(); location.reload();} });
}

// --- PWA INSTALLER ---
let deferredPrompt;
function setupPWA() {
    const installBox = document.getElementById('install-app-box');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBox.style.display = 'block'; // Mostra box in impostazioni
    });
    document.getElementById('btn-install-pwa').addEventListener('click', () => {
        installBox.style.display = 'none';
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => { deferredPrompt = null; });
    });
}