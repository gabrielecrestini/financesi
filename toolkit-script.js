document.addEventListener('DOMContentLoaded', () => {

    // --- REGISTRAZIONE SERVICE WORKER (CON NOTIFICA AGGIORNAMENTO) ---
    let newWorker;
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('Service Worker Registrato');
            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateBanner();
                    }
                });
            });
        }).catch(err => console.log('Errore registrazione Service Worker:', err));
        
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }
    
    function showUpdateBanner() {
        const banner = document.getElementById('app-update-banner');
        const reloadBtn = document.getElementById('app-reload-btn');
        if (banner) {
            banner.style.display = 'block';
            document.body.classList.add('update-available');
        }
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                newWorker.postMessage({ action: 'skipWaiting' });
            });
        }
    }

    // --- COSTANTI E VARIABILI DI STATO ---
    
    // Elementi Header
    const totalValueEl = document.getElementById('total-value');
    const totalInvestedEl = document.getElementById('total-invested'); // [MODIFICA] Ora mostrerà il totale storico
    const totalUnrealizedPlEl = document.getElementById('total-unrealized-pl');
    const totalRealizedPlEl = document.getElementById('total-realized-pl');
    
    // Elementi Portfolio
    const addTransactionForm = document.getElementById('add-transaction-form');
    const holdingsListEl = document.getElementById('holdings-list');
    const transactionListEl = document.getElementById('transaction-list');
    const assetNameInput = document.getElementById('asset-name');
    const searchResultsEl = document.getElementById('search-results');
    const txTotalCostEl = document.getElementById('tx-total-cost');
    const txPriceEl = document.getElementById('tx-price');
    const txBuyBtn = document.getElementById('tx-buy-btn');
    const txLoader = document.getElementById('tx-loader');
    const getPriceBtn = document.getElementById('get-price-btn');
    
    // Elementi Mercato
    const marketLoader = document.getElementById('market-loader');
    const marketPillBtns = document.querySelectorAll('.pill-btn');
    const marketViewNews = document.getElementById('market-view-news');
    const marketViewGainers = document.getElementById('market-view-gainers');
    const marketViewLosers = document.getElementById('market-view-losers');
    let currentMarketView = 'news';
    let marketRefreshInterval = null;

    // Elementi Convertitore
    const convertAmountInput = document.getElementById('convert-amount');
    const convertFromSelect = document.getElementById('convert-from');
    const convertToSelect = document.getElementById('convert-to');
    const convertResultInput = document.getElementById('convert-result');
    const convertSwapBtn = document.getElementById('convert-swap-btn');
    const convertBtn = document.getElementById('convert-btn');

    // Elementi Calcolatore
    const stakingInitialEl = document.getElementById('stakingInitial');
    const stakingMonthlyEl = document.getElementById('stakingMonthly');
    const stakingAPYEl = document.getElementById('stakingAPY');
    const stakingYearsEl = document.getElementById('stakingYears');
    const calcStakingBtn = document.getElementById('calculate-staking-btn');
    const calcTotalValueEl = document.getElementById('calc-total-value');
    const calcTotalInterestEl = document.getElementById('calc-total-interest');
    const calcTotalInvestedEl = document.getElementById('calc-total-invested');
    const stakingSummaryListEl = document.getElementById('staking-summary-list');
    const stakingSummaryTitle = document.getElementById('staking-summary-title');
    
    // Elementi Impostazioni (Installazione)
    const installDesktop = document.getElementById('install-prompt-desktop');
    const installIos = document.getElementById('install-prompt-ios');
    const installInstalled = document.getElementById('install-prompt-installed');
    const installAppBtn = document.getElementById('install-app-btn');
    
    // Elementi Modal Vendita
    const sellModalOverlay = document.getElementById('sell-modal-overlay');
    const sellModalForm = document.getElementById('sell-modal-form');
    const sellModalCloseBtn = document.getElementById('sell-modal-close');
    const sellModalTitle = document.getElementById('sell-modal-title');
    const sellModalText = document.getElementById('sell-modal-text');
    const sellPriceInput = document.getElementById('sell-price');

    // Database Locale
    let transactions = []; 
    let coinListCache = []; 
    let fuse; 
    let portfolioSearch = { id: null, name: null, image: null };
    let sellModalState = { id: null, name: null, image: null, maxUnits: 0 };
    let portfolioRefreshInterval = null;
    let deferredPrompt; 
    let marketDataCache = { news: null, gainers: null, losers: null };
    let fiatCurrencies = [
        { id: 'eur', name: 'Euro', symbol: 'eur', image: 'https://i.imgur.com/v1012iM.png' },
        { id: 'usd', name: 'US Dollar', symbol: 'usd', image: 'https://i.imgur.com/2Y01zAm.png' },
        { id: 'gbp', name: 'Pound Sterling', symbol: 'gbp', image: 'https://i.imgur.com/N3Crg1D.png' }
    ];

    const API_BASE_URL = 'https://api.coingecko.com/api/v3';
    const NEWS_API_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC,ETH,Trading,Market';
    const VS_CURRENCY = 'eur';

    // --- LOGICA DI NAVIGAZIONE ---
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.getAttribute('data-view');
            
            if (portfolioRefreshInterval) clearInterval(portfolioRefreshInterval);
            if (marketRefreshInterval) clearInterval(marketRefreshInterval);
            
            views.forEach(view => view.classList.remove('active'));
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            
            document.getElementById(`view-${viewId}`).classList.add('active');
            link.classList.add('active');
            
            if (viewId === 'portfolio') {
                updateFullPortfolio();
                portfolioRefreshInterval = setInterval(fetchPortfolioPrices, 60000); 
            } else if (viewId === 'mercato') {
                loadMarketData(currentMarketView, true); 
                marketRefreshInterval = setInterval(() => loadMarketData(currentMarketView, true), 300000); 
            } else if (viewId === 'convertitore') {
                setupConverter();
            } else if (viewId === 'settings') {
                setupInstallButton();
            }
        });
    });

    // --- GESTIONE DATI (Storage) ---
    function loadData() {
        const savedTransactions = localStorage.getItem('cryptoToolkitTransactions');
        if (savedTransactions) { transactions = JSON.parse(savedTransactions); }
        updateFullPortfolio(); 
    }

    function saveTransactions() {
        localStorage.setItem('cryptoToolkitTransactions', JSON.stringify(transactions));
    }
    
    // --- LOGICA DI RICERCA ASSET (FUSE.JS) ---
    async function loadCoinList() {
        if (coinListCache.length > 0) return;
        try {
            const response = await fetch(`${API_BASE_URL}/coins/markets?vs_currency=${VS_CURRENCY}&order=market_cap_desc&per_page=500&page=1&sparkline=false`);
            coinListCache = await response.json();
            fuse = new Fuse(coinListCache, { keys: ['name', 'symbol'], threshold: 0.3 });
            console.log("Lista Top 500 e Fuse.js caricati.");
            populateConverterSelects();
        } catch (error) { 
            console.error('Errore caricamento lista monete:', error); 
        }
    }

    assetNameInput.addEventListener('input', () => {
        handleSearch(assetNameInput.value, searchResultsEl, (coin) => {
            assetNameInput.value = coin.name;
            portfolioSearch = { id: coin.id, name: coin.name, image: coin.image };
            searchResultsEl.style.display = 'none';
        });
    });

    function handleSearch(query, resultsEl, onSelect) {
        if (!fuse) { 
            console.warn("Fuse.js non ancora pronto.");
            return; 
        } 
        query = query.toLowerCase();
        if (query.length < 2) { resultsEl.style.display = 'none'; return; }
        const results = fuse.search(query).slice(0, 5); 
        resultsEl.innerHTML = '';
        if (results.length > 0) {
            resultsEl.style.display = 'block';
            results.forEach(result => {
                const coin = result.item; 
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `<img src="${coin.image}" alt=""> ${coin.name} (${coin.symbol.toUpperCase()})`;
                item.addEventListener('click', () => onSelect(coin));
                resultsEl.appendChild(item);
            });
        } else { resultsEl.style.display = 'none'; }
    }
    
    // --- VISTA PORTFOLIO ---
    getPriceBtn.addEventListener('click', async () => {
        if (!portfolioSearch.id) {
            alert('Per favore, seleziona prima una valuta dal menu a tendina.');
            return;
        }
        getPriceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        getPriceBtn.disabled = true;
        try {
            const response = await fetch(`${API_BASE_URL}/simple/price?ids=${portfolioSearch.id}&vs_currencies=${VS_CURRENCY}`);
            const data = await response.json();
            if (data[portfolioSearch.id] && data[portfolioSearch.id][VS_CURRENCY]) {
                txPriceEl.value = data[portfolioSearch.id][VS_CURRENCY];
            } else { alert('Impossibile recuperare il prezzo corrente.'); }
        } catch (error) { alert('Errore di rete nel recuperare il prezzo.'); }
        finally {
            getPriceBtn.innerHTML = '<i class="fas fa-search-dollar"></i> Usa Prezzo Corrente';
            getPriceBtn.disabled = false;
        }
    });

    addTransactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddTransaction('buy');
    });

    function handleAddTransaction(type) {
        let units, pricePerUnit, name, id, image;
        
        if (type === 'buy') {
            const totalCost = parseFloat(txTotalCostEl.value);
            pricePerUnit = parseFloat(txPriceEl.value);
            if (!portfolioSearch.id || !totalCost || !pricePerUnit) {
                alert('Per favore, compila tutti i campi: seleziona una valuta, costo totale e prezzo.');
                return;
            }
            if (pricePerUnit <= 0) { alert('Il prezzo per unità non può essere zero.'); return; }
            units = totalCost / pricePerUnit;
            name = portfolioSearch.name;
            id = portfolioSearch.id;
            image = portfolioSearch.image;
        } else if (type === 'sell') {
            units = sellModalState.maxUnits; // Vende tutto
            pricePerUnit = parseFloat(sellPriceInput.value);
            if (!units || !pricePerUnit) {
                alert('Inserisci un prezzo di vendita.');
                return;
            }
            name = sellModalState.name;
            id = sellModalState.id;
            image = sellModalState.image;
        }

        const newTransaction = {
            id: Date.now(), type: type, apiId: id, name: name,
            image: image, units: units, pricePerUnit: pricePerUnit
        };

        toggleFormLoading(true);
        transactions.unshift(newTransaction); 
        saveTransactions();
        updateFullPortfolio();
        addTransactionForm.reset();
        portfolioSearch = { id: null, name: null, image: null };
        toggleFormLoading(false);
        closeSellModal();
    }
    
    function toggleFormLoading(isLoading) {
        txLoader.style.display = isLoading ? 'block' : 'none';
        txBuyBtn.disabled = isLoading;
    }

    function deleteTransaction(id) {
        if (confirm('Sei sicuro di voler eliminare questa transazione?')) {
            transactions = transactions.filter(tx => tx.id !== id);
            saveTransactions();
            updateFullPortfolio();
        }
    }

    // [MODIFICATO] Calcola anche il totale investito storico
    function calculateHoldings() {
        let holdings = {}; 
        let realizedPnl = 0;
        let currentInvestedCost = 0; // Costo degli asset correnti
        let historicalTotalInvested = 0; // Costo di tutti gli acquisti
        
        const sortedTxs = [...transactions].sort((a, b) => a.id - b.id);
        
        for (const tx of sortedTxs) {
            const id = tx.apiId;
            if (!holdings[id]) {
                holdings[id] = { units: 0, totalCost: 0, name: tx.name, image: tx.image };
            }
            let h = holdings[id];
            if (tx.type === 'buy') {
                const cost = tx.units * tx.pricePerUnit;
                h.units += tx.units;
                h.totalCost += cost;
                historicalTotalInvested += cost; // [MODIFICA] Aggiungi al totale storico
            } else if (tx.type === 'sell') {
                if (h.units > 0) {
                    const avgCostPerUnit = h.totalCost > 0 ? h.totalCost / h.units : 0;
                    const unitsToSell = Math.min(tx.units, h.units); 
                    const costOfSoldUnits = unitsToSell * avgCostPerUnit;
                    const revenue = unitsToSell * tx.pricePerUnit;
                    realizedPnl += (revenue - costOfSoldUnits);
                    h.units -= unitsToSell;
                    h.totalCost -= costOfSoldUnits;
                    if (h.units < 0.0000001) { h.units = 0; h.totalCost = 0; }
                }
            }
        }
        
        for (const id in holdings) {
            if (holdings[id].units > 0) {
                currentInvestedCost += holdings[id].totalCost;
            }
        }
        
        // [MODIFICA] Ritorna entrambi i valori
        return { holdings, realizedPnl, currentInvestedCost, historicalTotalInvested };
    }

    // [MODIFICATO] Accetta e passa il totale storico
    async function fetchPortfolioPrices() {
        console.log("Aggiornamento prezzi portfolio...");
        const { holdings, realizedPnl, currentInvestedCost, historicalTotalInvested } = calculateHoldings(); 
        const apiIds = Object.keys(holdings).filter(id => holdings[id].units > 0);
        
        if (apiIds.length === 0) { 
            renderHoldingsList(holdings, {});
            // [MODIFICA] Passa il totale storico anche se il portfolio è vuoto
            updateHeader(0, 0, realizedPnl, historicalTotalInvested);
            return; 
        }
        try {
            const response = await fetch(`${API_BASE_URL}/simple/price?ids=${apiIds.join(',')}&vs_currencies=${VS_CURRENCY}`);
            const prices = await response.json();
            let totalValue = 0;
            let totalUnrealizedPnl = 0;
            for (const id in holdings) {
                const h = holdings[id];
                if (h.units > 0) {
                    const currentPrice = prices[id] ? prices[id][VS_CURRENCY] : (h.currentValue / h.units); 
                    if (currentPrice) {
                        const currentValue = h.units * currentPrice;
                        h.currentValue = currentValue;
                        h.unrealizedPnl = h.totalCost > 0 ? (currentValue - h.totalCost) : currentValue;
                        totalValue += currentValue;
                        totalUnrealizedPnl += h.unrealizedPnl;
                    }
                }
            }
            renderHoldingsList(holdings, prices);
            // [MODIFICA] Passa il totale storico
            updateHeader(totalValue, totalUnrealizedPnl, realizedPnl, historicalTotalInvested);
        } catch (error) { console.error("Errore aggiornamento prezzi:", error); }
    }
    
    function updateFullPortfolio() {
        renderTransactionList();
        fetchPortfolioPrices();
    }

    function renderHoldingsList(holdings, prices) {
        holdingsListEl.innerHTML = '';
        const holdingIds = Object.keys(holdings);
        if (holdingIds.filter(id => holdings[id].units > 0).length === 0) {
            holdingsListEl.innerHTML = '<p class="text-center" style="color: var(--text-dark);">Nessun asset posseduto. Registra un acquisto!</p>';
            return;
        }
        for (const id of holdingIds) {
            const h = holdings[id];
            if (h.units <= 0) continue; 
            const el = document.createElement('div');
            el.className = 'holding-card';
            const plClass = h.unrealizedPnl > 0 ? 'text-profit' : (h.unrealizedPnl < 0 ? 'text-loss' : 'text-neutral');
            const avgCost = h.totalCost > 0 ? (h.totalCost / h.units) : 0;
            el.innerHTML = `
                <div class="holding-header">
                    <div>
                        <h3>${h.name}</h3>
                        <span class="asset-id">${h.units.toLocaleString()} unità</span>
                    </div>
                    <button class="btn btn-sell open-sell-modal" 
                            data-id="${id}" 
                            data-name="${h.name}" 
                            data-image="${h.image || ''}" 
                            data-max="${h.units}">
                        Vendi
                    </button>
                </div>
                <div class="holding-details">
                    <div class="holding-metric">
                        <span>Valore Corrente</span>
                        <strong>${(h.currentValue || 0).toFixed(2)} €</strong>
                    </div>
                    <div class="holding-metric pl">
                        <span>P/L Non Realizzato</span>
                        <strong class="${plClass}">${(h.unrealizedPnl || 0).toFixed(2)} €</strong>
                    </div>
                    <div class="holding-metric">
                        <span>Costo Medio</span>
                        <strong>${avgCost.toFixed(2)} €</strong>
                    </div>
                    <div class="holding-metric value">
                        <span>Costo Totale Attuale</span>
                        <strong>${h.totalCost.toFixed(2)} €</strong>
                    </div>
                </div>
            `;
            holdingsListEl.appendChild(el);
        }
        document.querySelectorAll('.open-sell-modal').forEach(btn => {
            btn.addEventListener('click', () => openSellModal(btn.dataset));
        });
    }

    function renderTransactionList() {
        transactionListEl.innerHTML = '';
        if (transactions.length === 0) {
            transactionListEl.innerHTML = '<p class="text-center" style="color: var(--text-dark);">Nessuna transazione registrata.</p>';
            return;
        }
        for (const tx of transactions) {
            const el = document.createElement('div');
            el.className = 'transaction-item';
            const isBuy = tx.type === 'buy';
            const txClass = isBuy ? 'buy' : 'sell';
            const txSign = isBuy ? '+' : '-';
            const totalCost = (tx.units * tx.pricePerUnit);
            el.innerHTML = `
                <div class="tx-details">
                    <strong class="tx-name ${txClass}">${isBuy ? 'ACQUISTO' : 'VENDITA'} ${tx.name}</strong>
                    <div>${tx.units.toLocaleString()} unità @ ${tx.pricePerUnit.toFixed(2)} €</div>
                    <div class="tx-meta">${new Date(tx.id).toLocaleString()}</div>
                </div>
                <div class="tx-amount ${txClass}">
                    ${txSign}${totalCost.toFixed(2)} €
                    <button class="delete-tx-btn" data-id="${tx.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            transactionListEl.appendChild(el);
        }
        document.querySelectorAll('.delete-tx-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTransaction(Number(btn.dataset.id)));
        });
    }

    // [MODIFICATO] Accetta il totale storico
    function updateHeader(totalValue, unrealizedPnl, realizedPnl, historicalTotalInvested) {
        totalValueEl.textContent = `${totalValue.toFixed(2)} €`;
        totalInvestedEl.textContent = `${historicalTotalInvested.toFixed(2)} €`; // <-- MODIFICA CHIAVE
        totalUnrealizedPlEl.textContent = `${unrealizedPnl.toFixed(2)} €`;
        totalUnrealizedPlEl.className = unrealizedPnl > 0 ? 'text-profit' : (unrealizedPnl < 0 ? 'text-loss' : 'text-neutral');
        totalRealizedPlEl.textContent = `${realizedPnl.toFixed(2)} €`;
        totalRealizedPlEl.className = realizedPnl > 0 ? 'text-profit' : (realizedPnl < 0 ? 'text-loss' : 'text-neutral');
    }
    
    // --- Logica Modal "Vendi" (Modificata) ---
    function openSellModal(data) {
        sellModalState = { id: data.id, name: data.name, image: data.image, maxUnits: parseFloat(data.max) };
        sellModalTitle.textContent = `Vendi ${data.name}`;
        sellModalText.innerHTML = `Stai vendendo <strong>tutte</strong> le tue <strong>${parseFloat(data.max).toLocaleString()}</strong> unità.`;
        sellPriceInput.value = '';
        sellModalOverlay.style.display = 'flex';
    }
    
    function closeSellModal() {
        sellModalOverlay.style.display = 'none';
    }
    
    sellModalCloseBtn.addEventListener('click', closeSellModal);
    sellModalOverlay.addEventListener('click', (e) => {
        if (e.target === sellModalOverlay) { closeSellModal(); }
    });
    sellModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddTransaction('sell');
    });

    // --- VISTA MERCATO ---
    
    marketPillBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            marketPillBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMarketView = btn.dataset.marketView;
            loadMarketData(currentMarketView, true);
        });
    });

    async function loadMarketData(view, forceRefresh = false) {
        marketLoader.style.display = 'block';
        marketViewNews.style.display = 'none';
        marketViewGainers.style.display = 'none';
        marketViewLosers.style.display = 'none';
        
        if (forceRefresh) { marketDataCache[view] = null; }

        try {
            if (view === 'news') {
                if (!marketDataCache.news) {
                    const response = await fetch(NEWS_API_URL);
                    const data = await response.json();
                    marketDataCache.news = data.Data;
                }
                renderNews(marketDataCache.news);
            } else if (view === 'gainers' || view === 'losers') {
                const order = (view === 'gainers') ? 'price_change_percentage_24h_desc' : 'price_change_percentage_24h_asc';
                if (!marketDataCache[view]) {
                    const response = await fetch(`${API_BASE_URL}/coins/markets?vs_currency=${VS_CURRENCY}&order=${order}&per_page=10&page=1&sparkline=false`);
                    marketDataCache[view] = await response.json();
                }
                renderGainersLosers(marketDataCache[view], (view === 'gainers') ? marketViewGainers : marketViewLosers);
            }
        } catch (error) {
            console.error(`Errore caricamento ${view}:`, error);
            const viewEl = document.getElementById(`market-view-${view}`);
            viewEl.innerHTML = '<p class="text-center text-loss">Errore nel caricamento dati.</p>';
            viewEl.style.display = 'block';
        } finally {
            marketLoader.style.display = 'none';
        }
    }
    
    function renderNews(newsData) {
        marketViewNews.innerHTML = '';
        if (!newsData || newsData.length === 0) {
            marketViewNews.innerHTML = '<p class="text-center text-dark">Nessuna notizia trovata.</p>';
            marketViewNews.style.display = 'block';
            return;
        }
        newsData.slice(0, 10).forEach(item => {
            const el = document.createElement('a');
            el.className = 'news-item';
            el.href = item.url;
            el.target = '_blank';
            el.innerHTML = `
                <img src="${item.imageurl}" alt="News" class="news-item-img">
                <div class="news-item-content">
                    <h4>${item.title}</h4>
                    <p>${item.body.substring(0, 100)}...</p>
                    <small>${item.source}</small>
                </div>
            `;
            marketViewNews.appendChild(el);
        });
        marketViewNews.style.display = 'block';
    }
    
    function renderGainersLosers(data, element) {
        element.innerHTML = '';
        if (!data || data.length === 0) {
            element.innerHTML = '<p class="text-center text-dark">Dati non disponibili.</p>';
            element.style.display = 'block';
            return;
        }
        data.forEach(coin => {
            const el = document.createElement('div');
            el.className = 'gainer-loser-row';
            const change24h = coin.price_change_percentage_24h;
            const changeClass = change24h > 0 ? 'text-profit' : 'text-loss';
            el.innerHTML = `
                <img src="${coin.image}" alt="${coin.name}">
                <div class="coin-name">
                    ${coin.name}
                    <span>${coin.symbol.toUpperCase()}</span>
                </div>
                <div class="coin-price">
                    ${coin.current_price.toLocaleString()} €
                    <span class="${changeClass}">${change24h.toFixed(2)}%</span>
                </div>
            `;
            element.appendChild(el);
        });
        element.style.display = 'block';
    }

    // --- VISTA STRUMENTI (Rimossa, la logica è nel file vecchio) ---
    // Abbiamo rimosso la pagina, ma se vuoi riaggiungerla
    // la logica per F&G e Halving è nel file precedente.

    // --- VISTA CONVERTITORE ---
    
    function populateConverterSelects() {
        convertFromSelect.innerHTML = '';
        convertToSelect.innerHTML = '';
        const allOptions = [...fiatCurrencies, ...coinListCache];
        
        allOptions.forEach(coin => {
            const optionFrom = document.createElement('option');
            optionFrom.value = coin.id;
            optionFrom.textContent = coin.name;
            convertFromSelect.appendChild(optionFrom);
            
            const optionTo = document.createElement('option');
            optionTo.value = coin.id;
            optionTo.textContent = coin.name;
            convertToSelect.appendChild(optionTo);
        });
        convertFromSelect.value = 'bitcoin';
        convertToSelect.value = 'eur';
    }
    
    convertSwapBtn.addEventListener('click', () => {
        const fromVal = convertFromSelect.value;
        const toVal = convertToSelect.value;
        convertFromSelect.value = toVal;
        convertToSelect.value = fromVal;
        calculateConversion();
    });
    
    convertBtn.addEventListener('click', calculateConversion);
    convertAmountInput.addEventListener('input', calculateConversion);
    
    async function calculateConversion() {
        const fromId = convertFromSelect.value;
        const toId = convertToSelect.value;
        const amount = parseFloat(convertAmountInput.value) || 0;
        
        if (amount === 0) { convertResultInput.value = '0'; return; }
        convertResultInput.value = 'Calcolo...';
        
        try {
            const isFromFiat = fiatCurrencies.some(f => f.id === fromId);
            const isToFiat = fiatCurrencies.some(f => f.id === toId);
            
            let rate;

            if (isFromFiat && isToFiat) {
                // Fiat -> Fiat (es. USD -> EUR)
                const response = await fetch(`${API_BASE_URL}/simple/price?ids=${fromId}&vs_currencies=${toId}`);
                const data = await response.json();
                rate = data[fromId][toId];
            } else if (!isFromFiat && isToFiat) { 
                // Crypto -> Fiat (es. BTC -> EUR)
                const coin = coinListCache.find(c => c.id === fromId);
                if (toId === 'eur') {
                    rate = coin.current_price; // Usa la cache!
                } else {
                    const response = await fetch(`${API_BASE_URL}/simple/price?ids=${fromId}&vs_currencies=${toId}`);
                    const data = await response.json();
                    rate = data[fromId][toId];
                }
            } else if (isFromFiat && !isToFiat) { 
                // Fiat -> Crypto (es. EUR -> BTC)
                const coin = coinListCache.find(c => c.id === toId);
                if (fromId === 'eur') {
                    rate = 1 / coin.current_price; // Usa la cache!
                } else {
                    const response = await fetch(`${API_BASE_URL}/simple/price?ids=${toId}&vs_currencies=${fromId}`);
                    const data = await response.json();
                    rate = 1 / data[toId][fromId];
                }
            } else { 
                // Crypto -> Crypto (es. BTC -> ETH)
                const fromCoin = coinListCache.find(c => c.id === fromId);
                const toCoin = coinListCache.find(c => c.id === toId);
                rate = fromCoin.current_price / toCoin.current_price; // Usa la cache!
            }
            
            if (!rate) throw new Error('Tasso non trovato');
            const result = amount * rate;
            convertResultInput.value = result.toLocaleString();
            
        } catch (error) {
            console.error("Errore conversione:", error);
            convertResultInput.value = 'Errore';
        }
    }

    // --- VISTA CALCOLATORE (Semplice) ---
    calcStakingBtn.addEventListener('click', calculateAndRenderSummary);
    function calculateAndRenderSummary() {
        try {
            const initial = parseFloat(stakingInitialEl.value) || 0;
            const monthly = parseFloat(stakingMonthlyEl.value) || 0;
            const apyPercent = parseFloat(stakingAPYEl.value) || 0;
            const years = parseInt(stakingYearsEl.value) || 0;
            if (years > 100) { alert("Per favore, inserisci un numero di anni inferiore a 100."); return; }

            const monthlyRate = apyPercent / 100 / 12;
            let currentBalance = initial;
            let totalContributed = initial;
            let cumulativeInterest = 0;
            let summaryHtml = ""; 

            for (let y = 1; y <= years; y++) {
                let interestThisYear = 0;
                let contributedThisYear = (y === 1) ? initial : 0; 
                for (let m = 1; m <= 12; m++) {
                    if (m > 1 || y > 1) { 
                        currentBalance += monthly;
                        totalContributed += monthly;
                        contributedThisYear += monthly;
                    }
                    let interestThisMonth = currentBalance * monthlyRate;
                    interestThisYear += interestThisMonth;
                    currentBalance += interestThisMonth;
                }
                cumulativeInterest += interestThisYear;
                summaryHtml += `
                    <div class="year-summary-card">
                        <div class="year-summary-header">Anno ${y}</div>
                        <div class="year-summary-body">
                            <div class="year-summary-metric">
                                Capitale Investito
                                <strong>${contributedThisYear.toFixed(2)} €</strong>
                            </div>
                            <div class="year-summary-metric">
                                Interessi Maturati
                                <strong class="text-profit">+${interestThisYear.toFixed(2)} €</strong>
                            </div>
                            <div class="year-summary-metric total">
                                Bilancio a Fine Anno
                                <strong>${currentBalance.toFixed(2)} €</strong>
                            </div>
                        </div>
                    </div>
                `;
            }
            calcTotalValueEl.textContent = `${currentBalance.toFixed(2)} €`;
            calcTotalInterestEl.textContent = `${cumulativeInterest.toFixed(2)} €`;
            calcTotalInvestedEl.textContent = `${totalContributed.toFixed(2)} €`;
            stakingSummaryListEl.innerHTML = summaryHtml;
            stakingSummaryTitle.style.display = 'block';
        } catch (e) { console.error("Errore Staking:", e); }
    }

    // --- VISTA IMPOSTAZIONI (Installazione e Backup) ---
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setupInstallButton(); 
    });
    
    installAppBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            setupInstallButton(); 
        }
    });

    function setupInstallButton() {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            installDesktop.style.display = 'none';
            installIos.style.display = 'none';
            installInstalled.style.display = 'block';
        } else {
            const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIos) {
                installDesktop.style.display = 'none';
                installIos.style.display = 'block';
                installInstalled.style.display = 'none';
            } else if (deferredPrompt) {
                installDesktop.style.display = 'block';
                installIos.style.display = 'none';
                installInstalled.style.display = 'none';
            } else {
                installDesktop.style.display = 'none';
                installIos.style.display = 'none';
                installInstalled.style.display = 'block';
            }
        }
    }
    
    // Gestione Import/Export
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importArea = document.getElementById('import-area');

    function exportData() {
        const dataToExport = { transactions: transactions };
        const data = JSON.stringify(dataToExport, null, 2);
        if (transactions.length === 0) {
            alert('Non ci sono transazioni da esportare.');
            return;
        }
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cryptotoolkit-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData() {
        const data = importArea.value;
        if (!data) { alert('Incolla i dati di backup nell\'area di testo.'); return; }
        try {
            const parsedData = JSON.parse(data);
            if (Array.isArray(parsedData)) { // Supporta formato vecchio
                transactions = parsedData;
            } else if (parsedData.transactions) { // Supporta formato nuovo
                transactions = parsedData.transactions || [];
            } else {
                throw new Error('Formato dati non riconosciuto.');
            }
            if (confirm('Questo sovrascriverà i tuoi dati attuali. Continuare?')) {
                saveTransactions();
                loadData(); 
                alert('Dati importati con successo!');
                importArea.value = '';
                document.querySelector('.nav-link.active').classList.remove('active');
                document.querySelector('.view.active').classList.remove('active');
                document.querySelector('.nav-link[data-view="portfolio"]').classList.add('active');
                document.getElementById('view-portfolio').classList.add('active');
            }
        } catch (error) {
            alert('Errore: I dati incollati non sono un JSON valido o il formato è errato.');
            console.error(error);
        }
    }

    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', importData);

    // --- AVVIO INIZIALE ---
    loadData();
    loadCoinList(); 
    calculateAndRenderSummary(); 
    setupInstallButton(); 
    
    if (document.getElementById('view-portfolio').classList.contains('active')) {
        portfolioRefreshInterval = setInterval(fetchPortfolioPrices, 60000);
    }
});