/**
 * CRYPTOTOOLKIT ELITE - ENGINE V5 (AUTO-SYNC)
 * API Primary: CoinLore (Public & Fast)
 * API Rates: Frankfurter (Fiat)
 * Features: Real-time Converter, Auto-Update 60s
 */

// --- CONFIGURAZIONE API ---
const API_PRIMARY = "https://api.coinlore.net/api/tickers/"; // Top 100 Coins
const API_RATES = "https://api.frankfurter.app/latest?from=USD&to=EUR";
const API_NEWS = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";

// Dati di emergenza (Fallback)
const FALLBACK_DATA = [
    { symbol: "BTC", name: "Bitcoin", price_usd: "92000.00", percent_change_24h: "0.0" },
    { symbol: "ETH", name: "Ethereum", price_usd: "3200.00", percent_change_24h: "0.0" },
    { symbol: "SOL", name: "Solana", price_usd: "145.00", percent_change_24h: "0.0" },
    { symbol: "BNB", name: "Binance Coin", price_usd: "605.00", percent_change_24h: "0.0" },
    { symbol: "XRP", name: "XRP", price_usd: "0.62", percent_change_24h: "0.0" }
];

// --- STATO APP ---
let portfolio = [];
let history = [];
let liquidity = 0;
let marketData = []; // Array Live sempre aggiornato
let usdToEur = 0.95; // Tasso cambio default

// --- INIZIALIZZAZIONE ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Toolkit V5 Auto-Sync Avviato");

    loadLocalData();
    initNav();
    
    // Setup componenti
    setupSearch();
    setupCalculator();
    setupSettings();
    setupForm();

    // Primo caricamento
    renderPortfolio();
    loadHistory();

    // Fetch Iniziale + Loop 60 Secondi
    fetchMarketData();
    setInterval(() => {
        console.log("Auto-aggiornamento prezzi (60s)...");
        fetchMarketData();
    }, 60000); 
});

// --- DATA MANAGER ---
function loadLocalData() {
    try {
        const p = localStorage.getItem('crypto_portfolio');
        const h = localStorage.getItem('crypto_history');
        const l = localStorage.getItem('crypto_liquidity');

        portfolio = p ? JSON.parse(p) : [];
        history = h ? JSON.parse(h) : [];
        liquidity = l ? parseFloat(l) : 0;

        // Sanificazione dati
        portfolio = portfolio.filter(item => item && item.amount !== null);
        portfolio.forEach(asset => {
            if(!asset.symbol) asset.symbol = asset.name.substring(0,3).toUpperCase();
            asset.amount = parseFloat(asset.amount) || 0;
            asset.buyPrice = parseFloat(asset.buyPrice) || 0;
        });
    } catch (e) {
        console.error("Reset dati locali per corruzione.");
        localStorage.clear();
        portfolio = []; history = []; liquidity = 0;
    }
}

// --- ENGINE API (COINLORE) ---
async function fetchMarketData() {
    try {
        // 1. Aggiorna cambio Fiat
        try {
            const rateRes = await fetch(API_RATES);
            const rateData = await rateRes.json();
            if(rateData.rates && rateData.rates.EUR) usdToEur = rateData.rates.EUR;
        } catch(err) { /* keep old rate */ }

        // 2. Aggiorna Crypto
        const res = await fetch(API_PRIMARY);
        if(!res.ok) throw new Error("API Error");
        
        const json = await res.json();
        marketData = json.data; // Aggiorna l'array globale

        updateStatus("Live");
        
    } catch (e) {
        console.warn("Offline Mode attivata");
        updateStatus("Offline");
        if(marketData.length === 0) marketData = FALLBACK_DATA;
    } finally {
        // AGGIORNAMENTO GLOBALE UI
        renderPortfolio();     // Ricalcola valori portfolio
        renderMarketList();    // Aggiorna lista mercato
        populateConverter();   // Aggiorna lista convertitore (se vuota)
        // Non ricalcoliamo il convertitore automaticamente per non disturbare l'utente mentre scrive
    }
}

function updateStatus(msg) {
    const el = document.getElementById('last-update');
    if(el) el.innerText = `${msg}: ${new Date().toLocaleTimeString()}`;
}

// --- PORTFOLIO RENDER ---
function renderPortfolio() {
    const list = document.getElementById('holdings-list');
    if(!list) return;

    if(portfolio.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.6;">Portfolio Vuoto.</div>';
        updateTotals(0);
        return;
    }

    list.innerHTML = '';
    let totalValue = 0;

    portfolio.forEach((asset, idx) => {
        // Lookup Prezzo Dinamico
        let livePrice = asset.buyPrice; 
        
        // Cerca nel marketData appena aggiornato
        const coin = marketData.find(c => 
            c.symbol === asset.symbol || 
            c.name.toLowerCase() === asset.name.toLowerCase()
        );

        if(coin) {
            livePrice = parseFloat(coin.price_usd) * usdToEur;
        }

        const val = asset.amount * livePrice;
        const gain = val - (asset.amount * asset.buyPrice);
        totalValue += val;

        list.innerHTML += `
            <div class="asset-item">
                <div class="asset-left">
                    <div class="coin-avatar">${(asset.symbol || "?").substring(0,3)}</div>
                    <div>
                        <h4 style="margin:0;">${asset.name}</h4>
                        <small>${asset.amount} • €${livePrice.toFixed(2)}</small>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:bold;">€${val.toFixed(2)}</div>
                    <div class="${gain >= 0 ? 'text-profit' : 'text-loss'}" style="font-size:0.8rem;">
                        ${gain >= 0 ? '+' : ''}€${gain.toFixed(2)}
                    </div>
                    <div class="asset-actions">
                        <button onclick="prepSell(${idx})" class="btn-action" style="color:#e0aaff;"><i class="fas fa-coins"></i></button>
                        <button onclick="delAsset(${idx})" class="btn-action" style="color:#666;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
    
    updateTotals(totalValue);
}

function updateTotals(assetVal) {
    const liq = liquidity || 0;
    const tot = assetVal + liq;
    
    const elTot = document.getElementById('total-balance');
    const elLiq = document.getElementById('liquidity-val');
    const elAss = document.getElementById('assets-val');

    if(elTot) elTot.innerText = "€ " + tot.toLocaleString('it-IT', {minimumFractionDigits: 2});
    if(elLiq) elLiq.innerText = "€ " + liq.toLocaleString('it-IT', {minimumFractionDigits: 2});
    if(elAss) elAss.innerText = "€ " + assetVal.toLocaleString('it-IT', {minimumFractionDigits: 2});
}

// --- CONVERTITORE REAL-TIME ---
function populateConverter() {
    const sel = document.getElementById('conv-from-crypto');
    // Popola SOLO se è vuoto per non resettare la selezione dell'utente
    if(!sel || sel.children.length > 0) return; 

    let opts = '';
    // Ordiniamo per Rank (CoinLore lo fa di default, ma siamo sicuri)
    marketData.slice(0,60).forEach(c => {
        // NOTA: Usiamo il SIMBOLO come value, non il prezzo statico!
        opts += `<option value="${c.symbol}">${c.name} (${c.symbol})</option>`;
    });
    
    document.getElementById('conv-from-crypto').innerHTML = opts;
    document.getElementById('conv-to-crypto').innerHTML = opts;

    // Listener click
    const btn = document.getElementById('btn-convert');
    if(btn) btn.onclick = calculateConversion;
}

function calculateConversion() {
    const amt = parseFloat(document.getElementById('conv-amount').value) || 0;
    const fromKey = document.getElementById('conv-from').value; // Es: "BTC", "EUR"
    const toKey = document.getElementById('conv-to').value;     // Es: "ETH", "USD"

    // Funzione helper per ottenere prezzo in EUR di una chiave
    const getPriceInEur = (key) => {
        if (key === 'EUR') return 1;
        if (key === 'USD') return usdToEur;
        
        // Cerca nel marketData aggiornato
        const coin = marketData.find(c => c.symbol === key);
        if (coin) return parseFloat(coin.price_usd) * usdToEur;
        
        return 0; // Errore o coin non trovata
    };

    const priceFrom = getPriceInEur(fromKey);
    const priceTo = getPriceInEur(toKey);

    if (priceFrom === 0 || priceTo === 0) {
        document.getElementById('conv-result').value = "Err";
        return;
    }

    // Logica: (Quantità * PrezzoSorgente) / PrezzoDestinazione
    const result = (amt * priceFrom) / priceTo;
    document.getElementById('conv-result').value = result.toFixed(6);
}

// --- MERCATO LISTA ---
function renderMarketList() {
    const div = document.getElementById('market-content-trending');
    if(!div) return;

    let html = '';
    // Mostriamo top 25
    marketData.slice(0, 25).forEach((c, i) => {
        const p = parseFloat(c.price_usd) * usdToEur;
        const ch = parseFloat(c.percent_change_24h);
        
        html += `
        <div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; gap:10px;">
                <span style="color:#666; width:20px;">${i+1}</span>
                <b>${c.symbol}</b>
            </div>
            <div style="text-align:right;">
                <div>€${p.toFixed(2)}</div>
                <div class="${ch>=0?'text-profit':'text-loss'}">${ch}%</div>
            </div>
        </div>`;
    });
    div.innerHTML = html;
}

// --- GESTIONE ASSET & FORM ---
function setupForm() {
    const form = document.getElementById('add-transaction-form');
    if(!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('asset-search').value;
        const sym = document.getElementById('asset-symbol').value;
        const amt = parseFloat(document.getElementById('tx-amount').value);
        const prc = parseFloat(document.getElementById('tx-price').value);

        if(!name || isNaN(amt) || isNaN(prc)) return alert("Dati invalidi");

        portfolio.push({
            id: Date.now(),
            name: name,
            symbol: sym || name.substring(0,3).toUpperCase(),
            amount: amt,
            buyPrice: prc
        });

        localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
        renderPortfolio();
        form.reset();
        toggleAddForm();
    });
}

window.toggleAddForm = function() {
    const el = document.getElementById('add-form-container');
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

window.delAsset = function(idx) {
    if(confirm("Eliminare asset?")) {
        portfolio.splice(idx, 1);
        localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
        renderPortfolio();
    }
}

// --- VENDITA ---
let sellIdx = null;
window.prepSell = function(idx) {
    sellIdx = idx;
    const item = portfolio[idx];
    document.getElementById('sell-asset-name').innerText = "Vendi " + item.name;
    document.getElementById('sell-amount').value = item.amount;
    document.getElementById('sell-modal').style.display = 'flex';
}
window.closeSellModal = function() {
    document.getElementById('sell-modal').style.display = 'none';
    sellIdx = null;
}
window.confirmSell = function() {
    if(sellIdx === null) return;
    const amount = parseFloat(document.getElementById('sell-amount').value);
    const cash = parseFloat(document.getElementById('sell-total-cash').value);

    if(!amount || !cash) return alert("Inserisci i valori");
    const asset = portfolio[sellIdx];
    if(amount > asset.amount) return alert("Quantità eccessiva");

    const profit = cash - (amount * asset.buyPrice);
    liquidity += cash;
    asset.amount -= amount;
    if(asset.amount <= 0) portfolio.splice(sellIdx, 1);

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

function loadHistory() {
    const div = document.getElementById('history-list');
    if(!div) return;
    div.innerHTML = '';
    history.forEach(h => {
        div.innerHTML += `
            <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
                <div><b>${h.name}</b> <small>${h.date}</small></div>
                <div class="${h.profit >= 0 ? 'text-profit' : 'text-loss'}">
                    ${h.profit >= 0 ? '+' : ''}€${h.profit.toFixed(2)}
                </div>
            </div>`;
    });
}

// --- SEARCH ---
function setupSearch() {
    const inp = document.getElementById('asset-search');
    const box = document.getElementById('search-results');
    if(!inp) return;

    inp.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if(val.length < 2) { box.style.display = 'none'; return; }

        const results = marketData.filter(c => 
            c.name.toLowerCase().includes(val) || 
            c.symbol.toLowerCase().includes(val)
        ).slice(0, 5);

        box.innerHTML = '';
        if(results.length > 0) {
            box.style.display = 'block';
            results.forEach(c => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<b>${c.name}</b> (${c.symbol})`;
                div.onclick = () => {
                    inp.value = c.name;
                    document.getElementById('asset-symbol').value = c.symbol;
                    box.style.display = 'none';
                };
                box.appendChild(div);
            });
        } else { box.style.display = 'none'; }
    });
    document.addEventListener('click', (e) => {
        if(e.target !== inp && e.target !== box) box.style.display='none';
    });
}

// --- CALCOLATORE PAC ---
function setupCalculator() {
    const btn = document.getElementById('btn-calc-interest');
    if(!btn) return;
    btn.onclick = () => {
        const init = parseFloat(document.getElementById('calc-initial').value) || 0;
        const month = parseFloat(document.getElementById('calc-monthly').value) || 0;
        const apy = parseFloat(document.getElementById('calc-apy').value) || 0;
        const years = parseFloat(document.getElementById('calc-years').value) || 0;

        let bal = init; let inv = init;
        const rate = (apy / 100) / 12;
        const tbody = document.getElementById('year-list-body');
        if(tbody) tbody.innerHTML = '';

        for(let i=1; i <= years*12; i++) {
            bal = (bal + month) * (1 + rate);
            inv += month;
            if(i % 12 === 0 && tbody) {
                tbody.innerHTML += `<tr><td>${i/12}</td><td>€${inv.toFixed(0)}</td><td class="text-profit">€${(bal-inv).toFixed(0)}</td><td><b>€${bal.toFixed(0)}</b></td></tr>`;
            }
        }
        document.getElementById('calc-results').style.display = 'block';
        document.getElementById('res-total').innerText = "€ " + bal.toFixed(2);
    }
}

// --- SETTINGS ---
function setupSettings() {
    const btnExp = document.getElementById('btn-export');
    const btnImp = document.getElementById('btn-import');
    const btnClr = document.getElementById('btn-clear-data');

    if(btnExp) btnExp.onclick = () => {
        const d = { p: portfolio, h: history, l: liquidity };
        document.getElementById('export-area').style.display = 'block';
        document.getElementById('export-area').value = btoa(JSON.stringify(d));
    };
    if(btnImp) btnImp.onclick = () => {
        try {
            const d = JSON.parse(atob(document.getElementById('import-area').value));
            localStorage.setItem('crypto_portfolio', JSON.stringify(d.p));
            localStorage.setItem('crypto_history', JSON.stringify(d.h));
            localStorage.setItem('crypto_liquidity', d.l);
            location.reload();
        } catch(e) { alert("Backup invalido"); }
    };
    if(btnClr) btnClr.onclick = () => {
        if(confirm("Reset Totale?")) { localStorage.clear(); location.reload(); }
    };
}

// --- NEWS & NAV ---
function initNav() {
    const links = document.querySelectorAll('.nav-link');
    const head = document.getElementById('app-header');
    links.forEach(l => {
        l.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(x => x.classList.remove('active'));
            document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
            l.classList.add('active');
            const t = l.getAttribute('data-target');
            document.getElementById(t).classList.add('active');
            if(head) head.classList.toggle('visible', t === 'view-portfolio');
            if(t === 'view-mercato') fetchNews();
        });
    });
    if(head) head.classList.add('visible');
}
window.switchMarketTab = function(t) {
    document.getElementById('market-content-trending').style.display = t === 'trending' ? 'block' : 'none';
    document.getElementById('market-content-news').style.display = t === 'news' ? 'block' : 'none';
    if(t === 'news') fetchNews();
}
async function fetchNews() {
    const div = document.getElementById('market-content-news');
    if(!div || div.children.length > 0) return;
    try {
        const r = await fetch(API_NEWS); const d = await r.json();
        div.innerHTML = '';
        d.Data.slice(0,10).forEach(n => {
            div.innerHTML += `<a href="${n.url}" target="_blank" class="card" style="display:flex; gap:10px; padding:10px; text-decoration:none; color:white;"><img src="${n.imageurl}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;"><div><h4 style="font-size:0.9rem; margin:0;">${n.title}</h4><small style="color:var(--accent)">${n.source}</small></div></a>`;
        });
    } catch(e) { div.innerHTML = "News offline."; }
}