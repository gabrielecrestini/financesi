// USARE COINCAP (Più stabile e gratuita)
const API_CAP_ASSETS = "https://api.coincap.io/v2/assets";
const NEWS_API = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";

// STATO
let portfolio = JSON.parse(localStorage.getItem('crypto_portfolio')) || [];
let history = JSON.parse(localStorage.getItem('crypto_history')) || [];
let liquidity = parseFloat(localStorage.getItem('crypto_liquidity')) || 0;

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    renderPortfolio(false); // Renderizza subito senza chiamata API
    loadHistory();
    setupConverter();
    setupCalculator();
    setupSettings();
    setupPWA();
    
    // Carica mercato iniziale
    fetchMarket();
    updateHeaderSummary(0, 0);

    // Event listener aggiunta manuale
    document.getElementById('add-transaction-form').addEventListener('submit', addManualTransaction);
    // Event listener refresh prezzi
    document.getElementById('btn-refresh-prices').addEventListener('click', updatePortfolioPrices);
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

// --- PORTFOLIO LOGIC (MANUALE + SYNC OPTIONAL) ---
function addManualTransaction(e) {
    e.preventDefault();
    const name = document.getElementById('asset-name').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const price = parseFloat(document.getElementById('tx-price').value);
    
    portfolio.push({
        id: name.toLowerCase().replace(/\s+/g, '-'), // ID fittizio per coerenza
        name: name,
        amount: amount,
        buyPrice: price,
        currentPrice: price // All'inizio prezzo attuale = prezzo acquisto
    });
    
    localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
    renderPortfolio(false);
    e.target.reset();
    toggleAddForm();
}

// Funzione di rendering pura (senza API)
function renderPortfolio(isLoading = false) {
    const list = document.getElementById('holdings-list');
    if(portfolio.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#666;">Nessun asset.</div>';
        updateHeaderSummary(0,0);
        return;
    }
    
    if(isLoading) list.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-spin"></i> Aggiorno...</div>';
    else list.innerHTML = '';

    if(!isLoading) {
        let currentVal = 0;
        let investedVal = 0;
        
        portfolio.forEach((asset, idx) => {
            // Usa il prezzo corrente salvato (o quello d'acquisto se non aggiornato)
            const price = asset.currentPrice || asset.buyPrice;
            const val = asset.amount * price;
            const cost = asset.amount * asset.buyPrice;
            const pl = val - cost;
            
            currentVal += val;
            investedVal += cost;
            
            list.innerHTML += `
                <div class="asset-item">
                    <div class="asset-left">
                        <div class="coin-avatar">${asset.name.charAt(0)}</div>
                        <div><h4 style="margin:0;">${asset.name}</h4><small>${asset.amount} • Acquisto: €${asset.buyPrice}</small></div>
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
        });
        updateHeaderSummary(currentVal, investedVal);
    }
}

// Funzione per aggiornare i prezzi via API (CoinCap)
async function updatePortfolioPrices() {
    renderPortfolio(true); // Mostra loader
    
    try {
        const res = await fetch(`${API_CAP_ASSETS}?limit=200`); // Prendi top 200
        const json = await res.json();
        const marketData = json.data; // CoinCap restituisce {data:Array}
        
        // Mappa per trovare i prezzi
        // CoinCap usa id come "bitcoin", "ethereum".
        portfolio.forEach(asset => {
            // Cerca corrispondenza approssimativa per nome o id
            const match = marketData.find(c => c.id === asset.id || c.name.toLowerCase() === asset.name.toLowerCase());
            if(match) {
                // CoinCap restituisce USD. Convertiamo in EUR (approx fisso per velocità e stabilità)
                asset.currentPrice = parseFloat(match.priceUsd) * 0.94; 
            }
        });
        
        localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
        renderPortfolio(false);
        
    } catch(e) {
        alert("Impossibile aggiornare prezzi. Riprova.");
        renderPortfolio(false);
    }
}

function updateHeaderSummary(curr, inv) {
    const unrealized = curr - inv;
    const total = curr + liquidity; // Asset + Cash
    document.getElementById('total-balance').innerText = `€ ${total.toLocaleString('it-IT', {minimumFractionDigits:2})}`;
    document.getElementById('liquidity-val').innerText = `€ ${liquidity.toLocaleString('it-IT', {minimumFractionDigits:2})}`;
    const el = document.getElementById('unrealized-pl');
    el.innerText = `${unrealized>=0?'+':''}€ ${unrealized.toFixed(2)}`;
    el.className = unrealized >= 0 ? 'text-profit' : 'text-loss';
}

// --- SELL LOGIC (MANUALE 100%) ---
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
    const totalCashReceived = parseFloat(document.getElementById('sell-total-cash').value); // UTENTE INSERISCE IL TOTALE INCASSATO
    
    if(!amount || !totalCashReceived || selectedAssetIdx === null) return alert("Dati mancanti");
    const asset = portfolio[selectedAssetIdx];
    if(amount > asset.amount) return alert("Quantità eccessiva");
    
    // Calcoli
    const costBasis = amount * asset.buyPrice; // Quanto avevi speso per quella quantità
    const profit = totalCashReceived - costBasis;
    
    // Aggiorna Liquidità
    liquidity += totalCashReceived;
    localStorage.setItem('crypto_liquidity', liquidity);
    
    // Storico
    history.unshift({ 
        name: asset.name, 
        amount: amount, 
        buyPrice: asset.buyPrice, 
        sellTotal: totalCashReceived, 
        profit: profit, 
        date: new Date().toLocaleDateString() 
    });
    localStorage.setItem('crypto_history', JSON.stringify(history));
    
    // Aggiorna Portfolio
    asset.amount -= amount;
    if(asset.amount <= 0) portfolio.splice(selectedAssetIdx, 1);
    localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
    
    closeSellModal();
    renderPortfolio(false);
    loadHistory();
}

function loadHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if(history.length === 0) return;
    history.forEach(h => {
        list.innerHTML += `<div style="border-left:3px solid ${h.profit>=0?'var(--profit)':'var(--loss)'}; background:rgba(255,255,255,0.02); padding:10px; margin-bottom:5px; border-radius:4px; display:flex; justify-content:space-between;">
            <div><b>${h.name}</b><br><small>${h.date}</small></div>
            <div style="text-align:right;"><div>Incasso: €${h.sellTotal.toFixed(2)}</div><div class="${h.profit>=0?'text-profit':'text-loss'}">P/L: ${h.profit>=0?'+':''}€${h.profit.toFixed(2)}</div></div>
        </div>`;
    });
}
function deleteAsset(idx) { if(confirm("Eliminare?")) { portfolio.splice(idx, 1); localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio)); renderPortfolio(false); } }

// --- CONVERTITORE (CoinCap) ---
function setupConverter() {
    fetch(`${API_CAP_ASSETS}?limit=50`)
    .then(r => r.json()).then(json => {
        const opts = json.data.map(c => `<option value="${c.id}">${c.name} (${c.symbol})</option>`).join('');
        document.getElementById('conv-from-crypto').innerHTML = opts;
        document.getElementById('conv-to-crypto').innerHTML = opts;
    });

    document.getElementById('btn-convert').addEventListener('click', async () => {
        const amt = parseFloat(document.getElementById('conv-amount').value);
        const from = document.getElementById('conv-from').value;
        const to = document.getElementById('conv-to').value;
        const res = document.getElementById('conv-result');
        if(!amt) return;
        res.value = "Calcolo...";

        try {
            const getUsd = async(id) => {
                if(id==='usd') return 1;
                if(id==='eur') return 1.06; // Euro statico per velocità
                const r = await fetch(`${API_CAP_ASSETS}/${id}`);
                const j = await r.json();
                return parseFloat(j.data.priceUsd);
            };
            
            const [pFrom, pTo] = await Promise.all([getUsd(from), getUsd(to)]);
            const final = (amt * pFrom) / pTo;
            res.value = final.toFixed(4);
        } catch(e) { res.value = "Err"; }
    });
    
    document.getElementById('btn-swap').addEventListener('click', () => {
        const f = document.getElementById('conv-from'); const t = document.getElementById('conv-to');
        const temp = f.value; f.value = t.value; t.value = temp;
    });
}

// --- MERCATO & NEWS ---
window.switchMarketTab = function(t) { document.getElementById('market-content-trending').style.display=t==='trending'?'block':'none'; document.getElementById('market-content-news').style.display=t==='news'?'block':'none'; if(t==='news') fetchNews(); }

async function fetchMarket() {
    const c = document.getElementById('market-content-trending');
    try {
        const r = await fetch(`${API_CAP_ASSETS}?limit=50`);
        const json = await r.json();
        c.innerHTML = '';
        json.data.forEach((coin,i)=> {
            const priceEur = parseFloat(coin.priceUsd) * 0.94;
            const change = parseFloat(coin.changePercent24Hr);
            c.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div style="display:flex; gap:10px; align-items:center;"><span style="color:#666; font-size:0.8rem;">${i+1}</span><b>${coin.symbol}</b></div>
                <div style="text-align:right;"><div>€${priceEur.toFixed(2)}</div><div class="${change>=0?'text-profit':'text-loss'}">${change.toFixed(2)}%</div></div>
            </div>`;
        });
    } catch(e) { c.innerHTML="<p>Dati non disponibili</p>"; }
}
async function fetchNews() {
    const c = document.getElementById('market-content-news'); if(c.children.length>0) return;
    const r = await fetch(NEWS_API); const d = await r.json();
    c.innerHTML='';
    d.Data.slice(0,10).forEach(n=>{ c.innerHTML += `<a href="${n.url}" target="_blank" class="card" style="display:flex; gap:10px; padding:10px; text-decoration:none; color:white;"><img src="${n.imageurl}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;"><div><h4 style="font-size:0.9rem; margin:0;">${n.title}</h4><small style="color:var(--accent)">${n.source}</small></div></a>`; });
}

// --- CALCOLATORE & SETTINGS ---
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

function setupSettings() {
    document.getElementById('btn-export').addEventListener('click', ()=>{ const d = {p:portfolio, h:history, l:liquidity}; const area = document.getElementById('export-area'); area.style.display='block'; area.value = btoa(JSON.stringify(d)); });
    document.getElementById('btn-import').addEventListener('click', ()=>{ try { const d = JSON.parse(atob(document.getElementById('import-area').value)); localStorage.setItem('crypto_portfolio', JSON.stringify(d.p)); localStorage.setItem('crypto_history', JSON.stringify(d.h)); localStorage.setItem('crypto_liquidity', d.l || 0); location.reload(); } catch(e){alert("Codice errato");} });
    document.getElementById('btn-clear-data').addEventListener('click', ()=>{ if(confirm("Reset?")) {localStorage.clear(); location.reload();} });
}
let deferredPrompt;
function setupPWA() {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('install-app-box').style.display = 'block'; });
    document.getElementById('btn-install-pwa').addEventListener('click', () => { document.getElementById('install-app-box').style.display = 'none'; deferredPrompt.prompt(); });
}