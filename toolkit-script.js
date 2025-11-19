/**
 * CRYPTOTOOLKIT ELITE - ENGINE V12 (ONLY COINLORE)
 * - Primary API: CoinLore (No CoinCap)
 * - Fallback: 50+ Crypto hardcoded for Offline Mode
 * - Fix: 50 Crypto Market List Limit
 */

const API_PRIMARY = "https://api.coinlore.net/api/tickers/?start=0&limit=50";
const API_RATES = "https://api.frankfurter.app/latest?from=USD&to=EUR";
const API_NEWS = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";

// LISTA EMERGENZA MASSICCIA (50 Coin per quando internet non va)
const FALLBACK_DATA = [
    {symbol:"BTC",name:"Bitcoin",price_usd:"92000.00",percent_change_24h:"0.5"},
    {symbol:"ETH",name:"Ethereum",price_usd:"3200.00",percent_change_24h:"-0.2"},
    {symbol:"USDT",name:"Tether",price_usd:"1.00",percent_change_24h:"0.0"},
    {symbol:"BNB",name:"BNB",price_usd:"600.00",percent_change_24h:"1.2"},
    {symbol:"SOL",name:"Solana",price_usd:"145.00",percent_change_24h:"2.5"},
    {symbol:"USDC",name:"USDC",price_usd:"1.00",percent_change_24h:"0.0"},
    {symbol:"XRP",name:"XRP",price_usd:"0.62",percent_change_24h:"-0.5"},
    {symbol:"ADA",name:"Cardano",price_usd:"0.45",percent_change_24h:"1.0"},
    {symbol:"AVAX",name:"Avalanche",price_usd:"35.00",percent_change_24h:"3.0"},
    {symbol:"DOGE",name:"Dogecoin",price_usd:"0.15",percent_change_24h:"-1.0"},
    {symbol:"SHIB",name:"Shiba Inu",price_usd:"0.000025",percent_change_24h:"0.5"},
    {symbol:"DOT",name:"Polkadot",price_usd:"7.00",percent_change_24h:"0.0"},
    {symbol:"LINK",name:"Chainlink",price_usd:"14.00",percent_change_24h:"1.5"},
    {symbol:"TRX",name:"TRON",price_usd:"0.12",percent_change_24h:"0.1"},
    {symbol:"MATIC",name:"Polygon",price_usd:"0.70",percent_change_24h:"-0.8"},
    {symbol:"BCH",name:"Bitcoin Cash",price_usd:"450.00",percent_change_24h:"1.1"},
    {symbol:"NEAR",name:"NEAR Protocol",price_usd:"6.50",percent_change_24h:"4.0"},
    {symbol:"LTC",name:"Litecoin",price_usd:"80.00",percent_change_24h:"0.2"},
    {symbol:"DAI",name:"Dai",price_usd:"1.00",percent_change_24h:"0.0"},
    {symbol:"LEO",name:"LEO Token",price_usd:"5.80",percent_change_24h:"0.1"},
    {symbol:"UNI",name:"Uniswap",price_usd:"7.50",percent_change_24h:"2.2"},
    {symbol:"ATOM",name:"Cosmos",price_usd:"9.00",percent_change_24h:"-1.5"},
    {symbol:"ETC",name:"Ethereum Classic",price_usd:"25.00",percent_change_24h:"0.5"},
    {symbol:"XLM",name:"Stellar",price_usd:"0.11",percent_change_24h:"0.3"},
    {symbol:"XMR",name:"Monero",price_usd:"120.00",percent_change_24h:"-0.5"},
    {symbol:"OKB",name:"OKB",price_usd:"55.00",percent_change_24h:"0.1"},
    {symbol:"CRO",name:"Cronos",price_usd:"0.12",percent_change_24h:"1.8"},
    {symbol:"FIL",name:"Filecoin",price_usd:"6.00",percent_change_24h:"-2.0"},
    {symbol:"HBAR",name:"Hedera",price_usd:"0.10",percent_change_24h:"3.5"},
    {symbol:"LDO",name:"Lido DAO",price_usd:"2.00",percent_change_24h:"1.2"},
    {symbol:"ARB",name:"Arbitrum",price_usd:"1.10",percent_change_24h:"-1.0"},
    {symbol:"VET",name:"VeChain",price_usd:"0.04",percent_change_24h:"0.8"},
    {symbol:"RNDR",name:"Render",price_usd:"10.00",percent_change_24h:"5.0"},
    {symbol:"MKR",name:"Maker",price_usd:"3000.00",percent_change_24h:"2.0"},
    {symbol:"INJ",name:"Injective",price_usd:"25.00",percent_change_24h:"-0.5"},
    {symbol:"GRT",name:"The Graph",price_usd:"0.30",percent_change_24h:"1.5"},
    {symbol:"OP",name:"Optimism",price_usd:"2.50",percent_change_24h:"-1.2"},
    {symbol:"RUNE",name:"Thorchain",price_usd:"5.50",percent_change_24h:"3.0"},
    {symbol:"ALGO",name:"Algorand",price_usd:"0.20",percent_change_24h:"0.0"},
    {symbol:"AAVE",name:"Aave",price_usd:"90.00",percent_change_24h:"1.8"},
    {symbol:"EGLD",name:"MultiversX",price_usd:"40.00",percent_change_24h:"0.5"},
    {symbol:"FLOW",name:"Flow",price_usd:"0.90",percent_change_24h:"-0.2"},
    {symbol:"QNT",name:"Quant",price_usd:"100.00",percent_change_24h:"0.8"},
    {symbol:"FTM",name:"Fantom",price_usd:"0.80",percent_change_24h:"2.5"},
    {symbol:"SAND",name:"The Sandbox",price_usd:"0.45",percent_change_24h:"-1.0"},
    {symbol:"AXS",name:"Axie Infinity",price_usd:"7.00",percent_change_24h:"0.5"},
    {symbol:"THETA",name:"Theta Network",price_usd:"2.00",percent_change_24h:"1.0"},
    {symbol:"MANA",name:"Decentraland",price_usd:"0.40",percent_change_24h:"-0.5"},
    {symbol:"EOS",name:"EOS",price_usd:"0.80",percent_change_24h:"0.2"},
    {symbol:"XTZ",name:"Tezos",price_usd:"1.00",percent_change_24h:"0.0"}
];

let portfolio = [];
let history = [];
let liquidity = 0;
let marketData = [];
let usdToEur = 0.95;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Engine V12 (CoinLore) Started");
    loadLocalData();
    initNav();
    setupSearch();
    setupCalculator();
    setupSettings();
    setupSmartForm();

    renderPortfolio();
    loadHistory();
    forceUpdate();

    setInterval(fetchMarketData, 15000);
    document.addEventListener("visibilitychange", () => {
        if(document.visibilityState === 'visible') forceUpdate();
    });
});

function loadLocalData() {
    try {
        portfolio = JSON.parse(localStorage.getItem('crypto_portfolio')) || [];
        history = JSON.parse(localStorage.getItem('crypto_history')) || [];
        liquidity = parseFloat(localStorage.getItem('crypto_liquidity')) || 0;
        portfolio = portfolio.filter(x => x && x.name);
        portfolio.forEach(a => {
            a.amount = parseFloat(a.amount)||0;
            a.buyPrice = parseFloat(a.buyPrice)||0;
            if(!a.symbol) a.symbol = a.name.substring(0,3).toUpperCase();
        });
    } catch(e) { localStorage.clear(); portfolio=[]; }
}

async function fetchMarketData() {
    try {
        // 1. Tasso cambio
        try {
            const r = await fetch(API_RATES);
            const d = await r.json();
            if(d.rates && d.rates.EUR) usdToEur = d.rates.EUR;
        } catch(e){}

        // 2. CoinLore API (Più stabile)
        const res = await fetch(API_PRIMARY);
        if(!res.ok) throw new Error("Net Err");
        
        const json = await res.json();
        // CoinLore restituisce {data: [...]}
        marketData = json.data; 

        updateStatus("LIVE");
    } catch (e) {
        console.warn("Using Fallback Data");
        updateStatus("Offline");
        if(marketData.length < 5) marketData = FALLBACK_DATA;
    } finally {
        renderPortfolio();
        renderMarketList();
        populateConverter();
    }
}

window.forceUpdate = function() {
    document.getElementById('last-update').innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
    fetchMarketData();
}

function updateStatus(msg) {
    const el = document.getElementById('last-update');
    if(el) {
        const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        el.innerHTML = `<i class="fas fa-wifi"></i> ${msg} ${t}`;
    }
}

function formatPrice(p) {
    if(p < 0.01) return p.toFixed(7);
    if(p < 1) return p.toFixed(4);
    if(p > 1000) return p.toFixed(2);
    return p.toFixed(3);
}

function renderPortfolio() {
    const list = document.getElementById('holdings-list');
    if(!list) return;
    if(portfolio.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; opacity:0.5;">Nessun asset attivo.</div>';
        updateTotals(0);
        return;
    }
    list.innerHTML = '';
    let totalVal = 0;
    portfolio.forEach((asset, idx) => {
        let livePrice = asset.buyPrice;
        
        // CoinLore Logic: symbol o nameid
        const coin = marketData.find(c => c.symbol === asset.symbol || c.nameid === asset.name.toLowerCase());
        
        if(coin) livePrice = parseFloat(coin.price_usd) * usdToEur;

        const val = asset.amount * livePrice;
        const gain = val - (asset.amount * asset.buyPrice);
        totalVal += val;

        list.innerHTML += `
            <div class="asset-item">
                <div class="asset-left">
                    <div class="coin-avatar">${asset.symbol.substring(0,3)}</div>
                    <div>
                        <h4 style="margin:0;">${asset.name}</h4>
                        <small>${asset.amount < 0.01 ? asset.amount.toFixed(6) : asset.amount.toFixed(2)} • €${formatPrice(livePrice)}</small>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:bold;">€${val.toFixed(2)}</div>
                    <div class="${gain>=0?'text-profit':'text-loss'}" style="font-size:0.8rem;">${gain>=0?'+':''}€${gain.toFixed(2)}</div>
                    <div class="asset-actions">
                        <button onclick="prepSell(${idx})" class="btn-action" style="color:#e0aaff;"><i class="fas fa-coins"></i></button>
                        <button onclick="delAsset(${idx})" class="btn-action" style="color:#666;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
    });
    updateTotals(totalVal);
}

function updateTotals(val) {
    const t = document.getElementById('total-balance');
    const l = document.getElementById('liquidity-val');
    const a = document.getElementById('assets-val');
    if(t) t.innerText = "€ " + (val+liquidity).toLocaleString('it-IT', {minimumFractionDigits:2});
    if(l) l.innerText = "€ " + liquidity.toLocaleString('it-IT', {minimumFractionDigits:2});
    if(a) a.innerText = "€ " + val.toLocaleString('it-IT', {minimumFractionDigits:2});
}

// SMART FORM ACQUISTO
function setupSmartForm() {
    const form = document.getElementById('add-transaction-form');
    if(!form) return;
    const searchInp = document.getElementById('asset-search');
    const box = document.getElementById('search-results');
    const investInp = document.getElementById('tx-invested');

    searchInp.addEventListener('input', (e) => {
        const v = e.target.value.toLowerCase();
        if(v.length < 2) { box.style.display='none'; return; }
        // Cerca in locale su marketData (che ora ha 50 coin sicure)
        const res = marketData.filter(c => c.name.toLowerCase().includes(v) || c.symbol.toLowerCase().includes(v)).slice(0,5);
        box.innerHTML = '';
        if(res.length>0) {
            box.style.display='block';
            res.forEach(c => {
                const d = document.createElement('div');
                d.className = 'search-item';
                d.innerHTML = `<b>${c.name}</b> (${c.symbol})`;
                d.onclick = () => {
                    searchInp.value = c.name;
                    document.getElementById('asset-symbol').value = c.symbol;
                    const pEur = parseFloat(c.price_usd) * usdToEur;
                    document.getElementById('live-price-hidden').value = pEur;
                    document.getElementById('calc-preview-box').style.display='block';
                    document.getElementById('preview-price').innerText = "€ " + formatPrice(pEur);
                    updateCalc();
                    box.style.display='none';
                };
                box.appendChild(d);
            });
        } else box.style.display='none';
    });

    function updateCalc() {
        const inv = parseFloat(investInp.value)||0;
        const p = parseFloat(document.getElementById('live-price-hidden').value)||0;
        if(inv>0 && p>0) {
            const q = inv/p;
            document.getElementById('preview-amount').innerText = q < 0.01 ? q.toFixed(7) : q.toFixed(4);
        }
    }
    investInp.addEventListener('input', updateCalc);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = searchInp.value;
        const sym = document.getElementById('asset-symbol').value;
        const inv = parseFloat(investInp.value);
        const price = parseFloat(document.getElementById('live-price-hidden').value);
        if(!name || !inv || !price) return alert("Completa");
        portfolio.push({id:Date.now(), name:name, symbol:sym, amount:inv/price, buyPrice:price});
        localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
        renderPortfolio();
        form.reset();
        document.getElementById('calc-preview-box').style.display='none';
        toggleAddForm();
    });
    document.addEventListener('click', (e)=>{ if(e.target!==searchInp && e.target!==box) box.style.display='none'; });
}

// MERCATO RENDER
function renderMarketList() {
    const div = document.getElementById('market-content-trending');
    if(!div) return;
    
    // Se marketData è vuoto o < 1, usa fallback
    if(marketData.length < 1) return;

    let html = '';
    // Mostra fino a 50 coin
    const limit = Math.min(marketData.length, 50);
    
    for(let i=0; i<limit; i++) {
        const c = marketData[i];
        const p = parseFloat(c.price_usd) * usdToEur;
        const ch = parseFloat(c.percent_change_24h);
        html += `
        <div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; gap:10px; align-items:center;">
                <span style="color:#666; width:20px;">${i+1}</span>
                <div>
                    <b>${c.symbol}</b>
                    <div style="font-size:0.7rem; color:#888;">${c.name}</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div>€${formatPrice(p)}</div>
                <div class="${ch>=0?'text-profit':'text-loss'}">${ch}%</div>
            </div>
        </div>`;
    }
    div.innerHTML = html;
}

window.toggleAddForm = function() {
    const el = document.getElementById('add-form-container');
    if(el) el.style.display = el.style.display==='none'?'block':'none';
}
window.delAsset = function(idx) {
    if(confirm("Eliminare?")) {
        portfolio.splice(idx,1);
        localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
        renderPortfolio();
    }
}

let sellIdx = null;
let sellPriceLive = 0;
window.prepSell = function(idx) {
    sellIdx = idx;
    const item = portfolio[idx];
    const coin = marketData.find(c => c.symbol===item.symbol);
    sellPriceLive = coin ? (parseFloat(coin.price_usd)*usdToEur) : item.buyPrice;
    document.getElementById('sell-asset-name').innerText = item.name;
    document.getElementById('sell-live-price').innerText = "€ " + formatPrice(sellPriceLive);
    document.getElementById('sell-amount').value = item.amount;
    updateSellCalc();
    document.getElementById('sell-modal').style.display='flex';
}
document.getElementById('sell-amount').addEventListener('input', updateSellCalc);
function updateSellCalc() {
    const amt = parseFloat(document.getElementById('sell-amount').value) || 0;
    document.getElementById('sell-estimated-total').innerText = "€ " + (amt * sellPriceLive).toFixed(2);
}
window.closeSellModal = function() { document.getElementById('sell-modal').style.display='none'; }
window.confirmSell = function() {
    if(sellIdx===null) return;
    const amt = parseFloat(document.getElementById('sell-amount').value);
    const cash = amt * sellPriceLive;
    if(!amt) return;
    const asset = portfolio[sellIdx];
    if(amt > asset.amount) return alert("Quantità eccessiva");
    const profit = cash - (amt * asset.buyPrice);
    liquidity += cash;
    asset.amount -= amt;
    if(asset.amount <= 0.0000001) portfolio.splice(sellIdx,1);
    history.unshift({name:asset.name, profit:profit, sellTotal:cash, date:new Date().toLocaleDateString()});
    localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
    localStorage.setItem('crypto_liquidity', liquidity);
    localStorage.setItem('crypto_history', JSON.stringify(history));
    closeSellModal();
    renderPortfolio();
    loadHistory();
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
                <div class="${h.profit>=0?'text-profit':'text-loss'}">${h.profit>=0?'+':''}€${h.profit.toFixed(2)}</div>
            </div>
        </div>`;
    });
}

function setupSearch() { document.addEventListener('click', (e)=>{ const i=document.getElementById('asset-search'), b=document.getElementById('search-results'); if(i&&b&&e.target!==i&&e.target!==b) b.style.display='none'; }); }
function populateConverter() {
    const s = document.getElementById('conv-from-crypto');
    if(!s || s.children.length>0) return;
    let o = '';
    // Usiamo slice(0,50) da marketData che è sempre popolato (o da API o da Fallback)
    const data = marketData.length > 0 ? marketData : FALLBACK_DATA;
    data.slice(0,50).forEach(c => o+=`<option value="${c.symbol}">${c.name}</option>`);
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
    const clr = document.getElementById('btn-clear-data');
    if(clr) clr.onclick=()=>{if(confirm("Reset?")){localStorage.clear();location.reload();}};
    const exp = document.getElementById('btn-export');
    if(exp) exp.onclick=()=>{ document.getElementById('export-area').style.display='block'; document.getElementById('export-area').value=btoa(JSON.stringify({p:portfolio,h:history,l:liquidity})); };
    const imp = document.getElementById('btn-import');
    if(imp) imp.onclick=()=>{ try{ const d=JSON.parse(atob(document.getElementById('import-area').value)); localStorage.setItem('crypto_portfolio',JSON.stringify(d.p)); localStorage.setItem('crypto_history',JSON.stringify(d.h)); localStorage.setItem('crypto_liquidity',d.l); location.reload(); }catch(e){alert('Err');} };
}
function initNav() {
    const lnk = document.querySelectorAll('.nav-link');
    lnk.forEach(l => l.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
        l.classList.add('active');
        const t = l.getAttribute('data-target');
        document.getElementById(t).classList.add('active');
        if(t==='view-mercato') fetchNews();
    }));
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