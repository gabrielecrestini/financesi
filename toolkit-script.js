/**
 * CRYPTOTOOLKIT ELITE - ENGINE V17 (MANUAL + NEWS)
 * Portfolio: Manual entry (No Price APIs)
 * News: Live via CryptoCompare API
 */

let portfolio = [];
let history = [];
let liquidity = 0;

const API_NEWS = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Engine V17 Started");
    loadLocalData();
    initNav();
    setupCalculator();
    setupSettings();
    setupManualForm();
    
    renderPortfolio();
    loadHistory();
});

function loadLocalData() {
    try {
        const p = localStorage.getItem('crypto_portfolio');
        const h = localStorage.getItem('crypto_history');
        const l = localStorage.getItem('crypto_liquidity');
        portfolio = p ? JSON.parse(p) : [];
        history = h ? JSON.parse(h) : [];
        liquidity = l ? parseFloat(l) : 0;
        
        portfolio = portfolio.filter(x => x && x.name);
        portfolio.forEach(a => {
            a.amount = parseFloat(a.amount) || 0;
            a.buyPrice = parseFloat(a.buyPrice) || 0; 
            a.totalInvested = parseFloat(a.totalInvested) || (a.amount * a.buyPrice);
        });
    } catch (e) { localStorage.clear(); portfolio=[]; }
}

// --- MANUAL PORTFOLIO ---
function setupManualForm() {
    const form = document.getElementById('add-transaction-form');
    const investInp = document.getElementById('tx-invested');
    const priceInp = document.getElementById('tx-price');
    const qtyDisplay = document.getElementById('calc-qty');

    function calcQty() {
        const inv = parseFloat(investInp.value) || 0;
        const prc = parseFloat(priceInp.value) || 0;
        if(inv > 0 && prc > 0) {
            qtyDisplay.innerText = (inv / prc).toFixed(8);
        } else {
            qtyDisplay.innerText = "0";
        }
    }
    investInp.addEventListener('input', calcQty);
    priceInp.addEventListener('input', calcQty);

    if(form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('asset-name').value;
        const inv = parseFloat(investInp.value);
        const price = parseFloat(priceInp.value);

        if(!name || !inv || !price) return alert("Inserisci tutti i dati");

        const amount = inv / price;

        portfolio.push({
            id: Date.now(),
            name: name,
            amount: amount,
            buyPrice: price,
            totalInvested: inv
        });

        saveData();
        renderPortfolio();
        form.reset();
        toggleAddForm();
        qtyDisplay.innerText = "0";
    });
}

function renderPortfolio() {
    const list = document.getElementById('holdings-list');
    if(!list) return;
    list.innerHTML = '';

    let totalInvested = 0;

    if(portfolio.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; opacity:0.5;">Nessuna posizione aperta.</div>';
    } else {
        portfolio.forEach((asset, idx) => {
            totalInvested += asset.totalInvested;
            
            list.innerHTML += `
                <div class="asset-item">
                    <div class="asset-left">
                        <div class="coin-avatar">${asset.name.substring(0,3).toUpperCase()}</div>
                        <div>
                            <h4 style="margin:0;">${asset.name}</h4>
                            <small>${asset.amount.toFixed(6)} • Costo: €${asset.buyPrice}</small>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:bold; color:#ccc;">Investito: €${asset.totalInvested.toFixed(2)}</div>
                        <div class="asset-actions">
                            <button onclick="prepSell(${idx})" class="btn-action" title="Vendi e Incassa"><i class="fas fa-coins" style="color:#e0aaff;"></i></button>
                            <button onclick="delAsset(${idx})" class="btn-action" title="Elimina"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>`;
        });
    }
    updateTotals(totalInvested);
}

function updateTotals(invested) {
    document.getElementById('total-balance').innerText = "€ " + (invested + liquidity).toLocaleString('it-IT', {minimumFractionDigits:2});
    document.getElementById('liquidity-val').innerText = "€ " + liquidity.toLocaleString('it-IT', {minimumFractionDigits:2});
    document.getElementById('assets-val').innerText = "€ " + invested.toLocaleString('it-IT', {minimumFractionDigits:2});
}

// --- SELL LOGIC ---
let sellIdx = null;
window.prepSell = function(idx) {
    sellIdx = idx;
    const asset = portfolio[idx];
    document.getElementById('sell-asset-name').innerText = "Vendi " + asset.name;
    document.getElementById('sell-amount').value = asset.amount;
    
    const costBasis = asset.amount * asset.buyPrice;
    document.getElementById('sell-cost-basis').innerText = "€ " + costBasis.toFixed(2);
    
    document.getElementById('sell-modal').style.display = 'flex';
}
window.closeSellModal = function() { document.getElementById('sell-modal').style.display = 'none'; sellIdx = null; }

window.confirmSell = function() {
    if(sellIdx === null) return;
    const amt = parseFloat(document.getElementById('sell-amount').value);
    const cash = parseFloat(document.getElementById('sell-total-cash').value);

    if(!amt || !cash) return alert("Inserisci i dati.");
    const asset = portfolio[sellIdx];
    if(amt > asset.amount) return alert("Quantità eccessiva.");

    const costBasis = amt * asset.buyPrice;
    const profit = cash - costBasis;

    liquidity += cash;
    
    asset.amount -= amt;
    asset.totalInvested -= costBasis;

    if(asset.amount <= 0.0000001) portfolio.splice(sellIdx, 1);

    history.unshift({
        name: asset.name,
        sellTotal: cash,
        profit: profit,
        date: new Date().toLocaleDateString()
    });

    saveData();
    closeSellModal();
    renderPortfolio();
    loadHistory();
}

// --- NEWS ENGINE ---
async function fetchNews() {
    const d = document.getElementById('news-container');
    if(!d || d.children.length > 1) return; // Already loaded
    try {
        const r = await fetch(API_NEWS); 
        const j = await r.json();
        d.innerHTML = '';
        j.Data.slice(0,15).forEach(n => {
            d.innerHTML += `
            <a href="${n.url}" target="_blank" class="card" style="display:flex; gap:15px; padding:15px; color:white; text-decoration:none; align-items:center;">
                <img src="${n.imageurl}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
                <div>
                    <h4 style="font-size:0.95rem; margin:0 0 5px 0; line-height:1.3;">${n.title}</h4>
                    <small style="color:var(--accent)">${n.source_info.name} • ${new Date(n.published_on * 1000).toLocaleTimeString()}</small>
                </div>
            </a>`;
        });
    } catch(e) { d.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">News momentaneamente non disponibili.</div>'; }
}

// --- UTILS & NAV ---
function saveData() {
    localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
    localStorage.setItem('crypto_liquidity', liquidity);
    localStorage.setItem('crypto_history', JSON.stringify(history));
}

function loadHistory() {
    const d = document.getElementById('history-list');
    if(!d) return;
    d.innerHTML = '';
    history.forEach(h => {
        d.innerHTML += `
        <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between;">
            <div><b>${h.name}</b> <small>${h.date}</small></div>
            <div style="text-align:right;">
                <div>Incasso: €${h.sellTotal.toFixed(2)}</div>
                <div class="${h.profit>=0?'text-profit':'text-loss'}">P/L: ${h.profit>=0?'+':''}€${h.profit.toFixed(2)}</div>
            </div>
        </div>`;
    });
}

window.toggleAddForm = function() {
    const el = document.getElementById('add-form-container');
    if(el) el.style.display = el.style.display==='none'?'block':'none';
}
window.delAsset = function(idx) {
    if(confirm("Eliminare questa posizione?")) {
        portfolio.splice(idx, 1);
        saveData();
        renderPortfolio();
    }
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
    if(clr) clr.onclick=()=>{if(confirm("Cancellare tutto?")){localStorage.clear();location.reload();}};
}

function initNav() {
    const lnk = document.querySelectorAll('.nav-link');
    lnk.forEach(l => l.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
        l.classList.add('active');
        const target = l.getAttribute('data-target');
        document.getElementById(target).classList.add('active');
        if(target === 'view-news') fetchNews();
    }));
}