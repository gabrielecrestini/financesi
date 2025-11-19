/**
 * CRYPTOTOOLKIT ELITE - ENGINE V8 (FULLY AUTOMATED)
 * - Acquisto: Inserisci Euro -> Calcola Qtà in base al prezzo LIVE
 * - Vendita: Inserisci Qtà -> Calcola Incasso in base al prezzo LIVE
 */

const API_PRIMARY = "https://api.coinlore.net/api/tickers/";
const API_RATES = "https://api.frankfurter.app/latest?from=USD&to=EUR";
const API_NEWS = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";

const FALLBACK_DATA = [
    { symbol: "BTC", name: "Bitcoin", price_usd: "92000.00", percent_change_24h: "0" },
    { symbol: "ETH", name: "Ethereum", price_usd: "3200.00", percent_change_24h: "0" }
];

let portfolio = [];
let history = [];
let liquidity = 0;
let marketData = [];
let usdToEur = 0.95;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Toolkit V8 Auto Avviato");
    loadLocalData();
    initNav();
    
    setupSearch(); // Questa è la funzione chiave per l'acquisto
    setupCalculator();
    setupSettings();
    setupFormSubmit();

    renderPortfolio();
    loadHistory();

    fetchMarketData();
    setInterval(fetchMarketData, 60000); // 60s refresh
});

// --- DATA ---
function loadLocalData() {
    try {
        const p = localStorage.getItem('crypto_portfolio');
        const h = localStorage.getItem('crypto_history');
        const l = localStorage.getItem('crypto_liquidity');
        portfolio = p ? JSON.parse(p) : [];
        history = h ? JSON.parse(h) : [];
        liquidity = l ? parseFloat(l) : 0;
        // Sanity check
        portfolio = portfolio.filter(x => x && x.name);
        portfolio.forEach(a => {
            if(!a.symbol) a.symbol = a.name.substring(0,3).toUpperCase();
            a.amount = parseFloat(a.amount) || 0;
            a.buyPrice = parseFloat(a.buyPrice) || 0;
        });
    } catch (e) { localStorage.clear(); portfolio=[]; }
}

// --- API ENGINE ---
async function fetchMarketData() {
    try {
        try {
            const r = await fetch(API_RATES);
            const d = await r.json();
            if(d.rates && d.rates.EUR) usdToEur = d.rates.EUR;
        } catch(e){}

        const res = await fetch(API_PRIMARY);
        const json = await res.json();
        marketData = json.data;
        updateStatus("Live");
    } catch (e) {
        updateStatus("Offline");
        if(marketData.length===0) marketData=FALLBACK_DATA;
    } finally {
        renderPortfolio();
        renderMarketList();
        populateConverter();
    }
}
function updateStatus(msg) {
    const el = document.getElementById('last-update');
    if(el) el.innerText = `${msg}: ${new Date().toLocaleTimeString()}`;
}

// --- ACQUISTO AUTOMATICO (LOGICA MIGLIORATA) ---
function setupSearch() {
    const inp = document.getElementById('asset-search');
    const box = document.getElementById('search-results');
    if(!inp) return;

    // 1. Ricerca Coin
    inp.addEventListener('input', (e) => {
        const v = e.target.value.toLowerCase();
        if(v.length<2) { box.style.display='none'; return; }
        const res = marketData.filter(c => c.name.toLowerCase().includes(v) || c.symbol.toLowerCase().includes(v)).slice(0,5);
        
        box.innerHTML = '';
        if(res.length>0) {
            box.style.display='block';
            res.forEach(c => {
                const d = document.createElement('div');
                d.className = 'search-item';
                d.innerHTML = `<b>${c.name}</b> (${c.symbol})`;
                
                // CLICK SU RISULTATO
                d.onclick = () => {
                    selectCoinForPurchase(c); // Funzione che popola tutto
                    box.style.display='none';
                };
                box.appendChild(d);
            });
        } else box.style.display='none';
    });
    
    document.addEventListener('click', (e)=>{ if(e.target!==inp && e.target!==box) box.style.display='none'; });

    // Calcolo automatico quando inserisci gli euro
    document.getElementById('tx-invested').addEventListener('input', updatePurchasePreview);
}

function selectCoinForPurchase(coin) {
    // 1. Riempi nome e simbolo
    document.getElementById('asset-search').value = coin.name;
    document.getElementById('asset-symbol').value = coin.symbol;
    
    // 2. Salva prezzo LIVE nascosto
    const priceEur = parseFloat(coin.price_usd) * usdToEur;
    document.getElementById('live-price-hidden').value = priceEur;
    
    // 3. Mostra prezzo UI
    document.getElementById('preview-price').innerText = "€ " + priceEur.toFixed(2);
    document.getElementById('calc-preview-box').style.display = 'block';
    
    updatePurchasePreview();
}

function updatePurchasePreview() {
    const invested = parseFloat(document.getElementById('tx-invested').value) || 0;
    const price = parseFloat(document.getElementById('live-price-hidden').value) || 0;
    
    if(invested > 0 && price > 0) {
        const amount = invested / price;
        document.getElementById('preview-amount').innerText = amount.toFixed(6) + " " + document.getElementById('asset-symbol').value;
    } else {
        document.getElementById('preview-amount').innerText = "...";
    }
}

function setupFormSubmit() {
    const form = document.getElementById('add-transaction-form');
    if(!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('asset-search').value;
        const sym = document.getElementById('asset-symbol').value;
        const invested = parseFloat(document.getElementById('tx-invested').value);
        const price = parseFloat(document.getElementById('live-price-hidden').value);
        
        if(!name || !invested || !price) return alert("Seleziona una crypto e inserisci importo.");
        
        const amount = invested / price;

        portfolio.push({
            id: Date.now(),
            name: name,
            symbol: sym,
            amount: amount,
            buyPrice: price // Salviamo il prezzo originale per calcolare P/L storico
        });

        localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
        renderPortfolio();
        form.reset();
        document.getElementById('calc-preview-box').style.display='none';
        toggleAddForm();
    });
}

// --- PORTFOLIO RENDER ---
function renderPortfolio() {
    const list = document.getElementById('holdings-list');
    if(!list) return;

    if(portfolio.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; opacity:0.5;">Nessun asset.</div>';
        updateTotals(0);
        return;
    }

    list.innerHTML = '';
    let totalValue = 0;

    portfolio.forEach((asset, idx) => {
        // Prezzo attuale LIVE
        let livePrice = asset.buyPrice;
        const coin = marketData.find(c => c.symbol===asset.symbol || c.name.toLowerCase()===asset.name.toLowerCase());
        if(coin) livePrice = parseFloat(coin.price_usd) * usdToEur;

        const val = asset.amount * livePrice; // Valore Oggi
        const cost = asset.amount * asset.buyPrice; // Costo Iniziale
        const gain = val - cost; 
        totalValue += val;

        list.innerHTML += `
            <div class="asset-item">
                <div class="asset-left">
                    <div class="coin-avatar">${(asset.symbol||"?").substring(0,3)}</div>
                    <div>
                        <h4 style="margin:0;">${asset.name}</h4>
                        <small>${asset.amount.toFixed(5)} • €${livePrice.toFixed(2)}</small>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:bold;">€${val.toFixed(2)}</div>
                    <div class="${gain>=0?'text-profit':'text-loss'}" style="font-size:0.8rem;">
                        ${gain>=0?'+':''}€${gain.toFixed(2)}
                    </div>
                    <div class="asset-actions">
                        <button onclick="prepSell(${idx})" class="btn-action" style="color:#e0aaff;"><i class="fas fa-coins"></i></button>
                        <button onclick="delAsset(${idx})" class="btn-action" style="color:#666;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    });
    updateTotals(totalValue);
}

function updateTotals(val) {
    const t = document.getElementById('total-balance');
    const l = document.getElementById('liquidity-val');
    const a = document.getElementById('assets-val');
    if(t) t.innerText = "€ " + (val+liquidity).toLocaleString('it-IT', {minimumFractionDigits:2});
    if(l) l.innerText = "€ " + liquidity.toLocaleString('it-IT', {minimumFractionDigits:2});
    if(a) a.innerText = "€ " + val.toLocaleString('it-IT', {minimumFractionDigits:2});
}

// --- VENDITA INTELLIGENTE (AUTO-CALCOLO INCASSO) ---
let sellIdx = null;
let sellLivePrice = 0;

window.prepSell = function(idx) {
    sellIdx = idx;
    const item = portfolio[idx];
    
    // Cerca prezzo live
    const coin = marketData.find(c => c.symbol===item.symbol || c.name.toLowerCase()===item.name.toLowerCase());
    sellLivePrice = coin ? (parseFloat(coin.price_usd) * usdToEur) : item.buyPrice;

    document.getElementById('sell-asset-name').innerText = "Vendi " + item.name;
    document.getElementById('sell-live-price').innerText = "€ " + sellLivePrice.toFixed(2);
    document.getElementById('sell-amount').value = item.amount; // Default: vendi tutto
    updateSellTotal(); // Calcola subito

    document.getElementById('sell-modal').style.display = 'flex';
}

// Listener per calcolo mentre scrivi la quantità da vendere
document.getElementById('sell-amount').addEventListener('input', updateSellTotal);

function updateSellTotal() {
    const amt = parseFloat(document.getElementById('sell-amount').value) || 0;
    const total = amt * sellLivePrice;
    document.getElementById('sell-estimated-total').innerText = "€ " + total.toFixed(2);
}

window.closeSellModal = function() { document.getElementById('sell-modal').style.display='none'; sellIdx=null; }

window.confirmSell = function() {
    if(sellIdx === null) return;
    const amt = parseFloat(document.getElementById('sell-amount').value);
    // Calcola il cash basandosi sul prezzo LIVE visualizzato, non input manuale
    const cash = amt * sellLivePrice; 

    if(!amt) return alert("Inserisci quantità");
    const asset = portfolio[sellIdx];
    if(amt > asset.amount) return alert("Non hai abbastanza crypto");

    // Profitto = Incasso Reale - (Quantità * Prezzo Medio Acquisto)
    const costBasis = amt * asset.buyPrice;
    const profit = cash - costBasis;

    liquidity += cash;
    asset.amount -= amt;
    if(asset.amount <= 0.0000001) portfolio.splice(sellIdx,1);

    history.unshift({
        name: asset.name,
        profit: profit,
        sellTotal: cash,
        date: new Date().toLocaleDateString()
    });

    localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
    localStorage.setItem('crypto_liquidity', liquidity);
    localStorage.setItem('crypto_history', JSON.stringify(history));

    closeSellModal();
    renderPortfolio();
    loadHistory();
}

// --- UTILS ---
window.toggleAddForm = function() {
    const el = document.getElementById('add-form-container');
    if(el) el.style.display = el.style.display==='none'?'block':'none';
}
window.delAsset = function(idx) {
    if(confirm("Eliminare asset?")) {
        portfolio.splice(idx,1);
        localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
        renderPortfolio();
    }
}
function loadHistory() {
    const d = document.getElementById('history-list');
    if(!d) return;
    d.innerHTML = '';
    history.forEach(h => {
        d.innerHTML += `<div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
            <div><b>${h.name}</b> <small>${h.date}</small></div>
            <div style="text-align:right;">
                <div>Incasso: €${h.sellTotal.toFixed(2)}</div>
                <div class="${h.profit>=0?'text-profit':'text-loss'}">P/L: ${h.profit>=0?'+':''}€${h.profit.toFixed(2)}</div>
            </div>
        </div>`;
    });
}

// --- OTHER FEATURES (Converter, etc same as before) ---
function populateConverter() {
    const sel = document.getElementById('conv-from-crypto');
    if(!sel || sel.children.length>0) return;
    let o = '';
    marketData.slice(0,50).forEach(c => o+=`<option value="${c.symbol}">${c.name}</option>`);
    document.getElementById('conv-from-crypto').innerHTML=o;
    document.getElementById('conv-to-crypto').innerHTML=o;
    const btn = document.getElementById('btn-convert');
    if(btn) btn.onclick = () => {
        const amt = parseFloat(document.getElementById('conv-amount').value)||0;
        const f = document.getElementById('conv-from').value;
        const t = document.getElementById('conv-to').value;
        const getP = (k) => {
            if(k==='EUR') return 1; if(k==='USD') return usdToEur;
            const c = marketData.find(x=>x.symbol===k); return c?parseFloat(c.price_usd)*usdToEur:0;
        };
        const p1=getP(f); const p2=getP(t);
        if(p1&&p2) document.getElementById('conv-result').value = ((amt*p1)/p2).toFixed(6);
    };
}
function renderMarketList() {
    const d = document.getElementById('market-content-trending');
    if(!d) return;
    let h = '';
    marketData.slice(0,20).forEach((c,i) => {
        const p = parseFloat(c.price_usd)*usdToEur;
        const ch = parseFloat(c.percent_change_24h);
        h += `<div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; gap:10px;"><span style="color:#666;">${i+1}</span><b>${c.symbol}</b></div>
            <div style="text-align:right;"><div>€${p.toFixed(2)}</div><div class="${ch>=0?'text-profit':'text-loss'}">${ch}%</div></div>
        </div>`;
    });
    d.innerHTML = h;
}
function setupCalculator() {
    const btn = document.getElementById('btn-calc-interest');
    if(btn) btn.onclick = () => {
        const init = parseFloat(document.getElementById('calc-initial').value)||0;
        const mo = parseFloat(document.getElementById('calc-monthly').value)||0;
        const r = (parseFloat(document.getElementById('calc-apy').value)||0)/100/12;
        const y = parseFloat(document.getElementById('calc-years').value)||0;
        let b = init, inv = init;
        const tb = document.getElementById('year-list-body');
        if(tb) tb.innerHTML='';
        for(let i=1; i<=y*12; i++){
            b = (b+mo)*(1+r); inv+=mo;
            if(i%12===0 && tb) tb.innerHTML += `<tr><td>${i/12}</td><td>€${inv.toFixed(0)}</td><td class="text-profit">€${(b-inv).toFixed(0)}</td><td><b>€${b.toFixed(0)}</b></td></tr>`;
        }
        document.getElementById('calc-results').style.display='block';
        document.getElementById('res-total').innerText = "€ "+b.toFixed(2);
    };
}
function setupSettings() {
    const exp = document.getElementById('btn-export');
    if(exp) exp.onclick = () => {
        const d = {p:portfolio, h:history, l:liquidity};
        document.getElementById('export-area').style.display='block';
        document.getElementById('export-area').value = btoa(JSON.stringify(d));
    };
    const imp = document.getElementById('btn-import');
    if(imp) imp.onclick = () => {
        try {
            const d = JSON.parse(atob(document.getElementById('import-area').value));
            localStorage.setItem('crypto_portfolio',JSON.stringify(d.p));
            localStorage.setItem('crypto_history',JSON.stringify(d.h));
            localStorage.setItem('crypto_liquidity',d.l);
            location.reload();
        } catch(e){alert("Err");}
    };
    const clr = document.getElementById('btn-clear-data');
    if(clr) clr.onclick=()=>{if(confirm("Reset?")){localStorage.clear();location.reload();}};
}
function initNav() {
    const lnk = document.querySelectorAll('.nav-link');
    const hdr = document.getElementById('app-header');
    lnk.forEach(l => l.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
        l.classList.add('active');
        const t = l.getAttribute('data-target');
        document.getElementById(t).classList.add('active');
        if(hdr) hdr.classList.toggle('visible', t==='view-portfolio');
        if(t==='view-mercato') fetchNews();
    }));
    if(hdr) hdr.classList.add('visible');
}
window.switchMarketTab = function(t) {
    document.getElementById('market-content-trending').style.display = t==='trending'?'block':'none';
    document.getElementById('market-content-news').style.display = t==='news'?'block':'none';
    if(t==='news') fetchNews();
}
async function fetchNews() {
    const d = document.getElementById('market-content-news');
    if(!d || d.children.length>0) return;
    try{
        const r = await fetch(API_NEWS); const j = await r.json();
        d.innerHTML='';
        j.Data.slice(0,10).forEach(n => d.innerHTML+=`<a href="${n.url}" target="_blank" class="card" style="display:flex; gap:10px; padding:10px; color:white; text-decoration:none;"><img src="${n.imageurl}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;"><div><h4 style="font-size:0.9rem; margin:0;">${n.title}</h4><small style="color:var(--accent)">${n.source}</small></div></a>`);
    }catch(e){d.innerHTML="No News";}
}