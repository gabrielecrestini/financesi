// Esegui tutto quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SELEZIONE ELEMENTI DOM ---
    
    // Navigazione
    const navItems = document.querySelectorAll('.nav-item');
    const appPages = document.querySelectorAll('.app-page');
    const fabAddButton = document.getElementById('fab-add-tx');

    // PWA Install
    const installContainer = document.getElementById('install-prompt-container');
    const installButton = document.getElementById('install-btn');
    const dismissButton = document.getElementById('dismiss-btn');
    // [NUOVO] Pulsante nelle Impostazioni
    const manualInstallCard = document.getElementById('manual-install-card');
    const manualInstallBtn = document.getElementById('manual-install-btn');

    // Portfolio
    const portfolioList = document.getElementById('portfolio-list');
    const historyList = document.getElementById('history-list');
    const totalInvestedEl = document.getElementById('total-invested');
    const livePlEl = document.getElementById('live-pl');
    const lastUpdatedEl = document.getElementById('last-updated');
    const emptyPortfolioMessage = document.getElementById('empty-portfolio-message');
    const emptyHistoryMessage = document.getElementById('empty-history-message');

    // Modal "Aggiungi Transazione"
    const addTxModal = document.getElementById('add-tx-modal');
    const addTxModalOverlay = document.getElementById('add-tx-modal-overlay');
    const addTxForm = document.getElementById('add-tx-form');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const txCoinSearchInput = document.getElementById('tx-coin-search');
    const txCoinIdInput = document.getElementById('tx-coin-id');
    const txCoinIconInput = document.getElementById('tx-coin-icon');
    const txCoinPriceInput = document.getElementById('tx-coin-price-live');
    const txEurosInvestedInput = document.getElementById('tx-euros-invested');
    const searchResults = document.getElementById('search-results');
    const livePriceDisplay = document.getElementById('live-price-display');
    const livePriceText = document.getElementById('live-price-text');
    
    // Modal "Vendi Transazione"
    const sellTxModal = document.getElementById('sell-tx-modal');
    const sellTxModalOverlay = document.getElementById('sell-tx-modal-overlay');
    const modalSellCancelBtn = document.getElementById('modal-sell-cancel-btn');
    const modalSellConfirmBtn = document.getElementById('modal-sell-confirm-btn');
    const sellModalTitle = document.getElementById('sell-modal-title');
    const sellPriceSpinner = document.getElementById('sell-price-spinner');
    const sellConfirmationDetails = document.getElementById('sell-confirmation-details');
    const sellCostEl = document.getElementById('sell-cost');
    const sellValueEl = document.getElementById('sell-value');
    const sellProfitEl = document.getElementById('sell-profit');
    let currentSellingTx = null;
    let currentSellPrice = 0;
    
    // Calcolatore Staking
    const stakingForm = document.getElementById('staking-calculator-form');
    const stakingResultTable = document.getElementById('staking-result-table');
    const stakingInputs = {
        initial: document.getElementById('staking-initial'),
        apy: document.getElementById('staking-apy'),
        years: document.getElementById('staking-years'),
        frequency: document.getElementById('staking-frequency'),
        monthly: document.getElementById('staking-monthly')
    };

    // Impostazioni (Importa/Esporta)
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importDataEl = document.getElementById('import-data');
    const resetAppBtn = document.getElementById('reset-app-btn');

    // --- 2. STATO DELL'APPLICAZIONE (IL "DATABASE JS") ---
    let transactions = []; 
    let calculatorSettings = {}; 
    const LEDGER_STORAGE_KEY = 'cryptoLedger_V2';
    const CALC_STORAGE_KEY = 'stakingCalculator_V1';
    let searchTimer;
    let deferredPrompt; // [MODIFICATO] Spostato qui per essere globale

    // --- 3. LOGICA DI NAVIGAZIONE ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPageId = item.dataset.page; 
            navItems.forEach(nav => nav.classList.remove('active'));
            appPages.forEach(page => page.classList.remove('active'));
            item.classList.add('active');
            const targetPage = document.getElementById(targetPageId);
            if (targetPage) targetPage.classList.add('active');
            fabAddButton.style.display = (targetPageId === 'page-portfolio') ? 'flex' : 'none';
        });
    });

    // --- 4. LOGICA PWA (SERVICE WORKER E INSTALLA) --- [MODIFICATA]
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js').catch(err => console.error(err));
        });
    }

    // Controlla se l'app è già installata (modalità standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App già installata (modalità standalone).');
    } else {
        console.log('App non installata, attendo il prompt.');
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            // Mostra il pop-up IN ALTO
            if (installContainer) installContainer.style.display = 'block';
            
            // [NUOVO] Mostra anche il pulsante nelle IMPOSTAZIONI
            if (manualInstallCard) manualInstallCard.style.display = 'block';
        });
    }

    // Funzione helper per gestire il clic su "Installa"
    async function handleInstallPrompt() {
        if (!deferredPrompt) {
            alert('L\'app è già installata o il browser non supporta l\'installazione in questo modo.');
            return;
        }
        
        // Nascondi tutti i prompt
        if (installContainer) installContainer.style.display = 'none';
        
        // Mostra il prompt del browser
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('Utente ha accettato l\'installazione');
            // L'utente ha installato, nascondi il pulsante nelle impostazioni
             if (manualInstallCard) manualInstallCard.style.display = 'none';
        } else {
            console.log('Utente ha rifiutato l\'installazione');
        }
        deferredPrompt = null;
    }

    // Pulsante "Installa" (nel pop-up in alto)
    if (installButton) {
        installButton.addEventListener('click', handleInstallPrompt);
    }
    
    // [NUOVO] Pulsante "Installa" (nella pagina Impostazioni)
    if (manualInstallBtn) {
        manualInstallBtn.addEventListener('click', handleInstallPrompt);
    }

    // Pulsante "Più tardi" (nel pop-up in alto)
    if (dismissButton) {
        dismissButton.addEventListener('click', () => {
            // Nasconde solo il pop-up in alto, ma lascia quello nelle impostazioni
            if (installContainer) installContainer.style.display = 'none';
        });
    }
    
    // [NUOVO] Nasconde i pulsanti se l'app viene installata con successo
    window.addEventListener('appinstalled', () => {
        console.log('App installata con successo!');
        if (manualInstallCard) manualInstallCard.style.display = 'none';
        if (installContainer) installContainer.style.display = 'none';
        deferredPrompt = null;
    });


    // --- 5. LOGICA MODAL (APRI/CHIUDI) ---
    
    // Modal Aggiungi
    function openAddModal() {
        addTxForm.reset();
        searchResults.innerHTML = '';
        livePriceDisplay.style.display = 'none';
        addTxModalOverlay.style.display = 'block';
        addTxModal.style.display = 'block';
        txCoinSearchInput.focus();
    }
    function closeAddModal() {
        addTxModalOverlay.style.display = 'none';
        addTxModal.style.display = 'none';
    }
    fabAddButton.addEventListener('click', openAddModal);
    modalCancelBtn.addEventListener('click', closeAddModal);
    addTxModalOverlay.addEventListener('click', closeAddModal);

    // Modal Vendi
    async function openSellModal(tx) {
        currentSellingTx = tx;
        sellModalTitle.textContent = `${tx.amount.toFixed(6)} ${tx.name}`;
        
        sellTxModalOverlay.style.display = 'block';
        sellTxModal.style.display = 'block';
        sellConfirmationDetails.style.display = 'none';
        sellPriceSpinner.style.display = 'flex';
        modalSellConfirmBtn.disabled = true;

        const price = await fetchLivePrice(tx.id, false);
        
        if (price === null) {
            alert('Impossibile caricare il prezzo live. Controlla la connessione.');
            closeSellModal();
            return;
        }

        currentSellPrice = price;
        const sellValue = tx.amount * currentSellPrice;
        const profit = sellValue - tx.cost;

        sellCostEl.textContent = `€${tx.cost.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        sellValueEl.textContent = `€${sellValue.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        sellProfitEl.textContent = `${profit >= 0 ? '+' : ''}€${profit.toFixed(2)}`;
        sellProfitEl.className = profit >= 0 ? 'pl-good' : 'pl-bad';

        sellPriceSpinner.style.display = 'none';
        sellConfirmationDetails.style.display = 'block';
        modalSellConfirmBtn.disabled = false;
    }
    function closeSellModal() {
        sellTxModalOverlay.style.display = 'none';
        sellTxModal.style.display = 'none';
        currentSellingTx = null;
        currentSellPrice = 0;
    }
    modalSellCancelBtn.addEventListener('click', closeSellModal);
    sellTxModalOverlay.addEventListener('click', closeSellModal);


    // --- 6. LOGICA PORTFOLIO (CUORE DELL'APP) ---

    function saveTransactions() {
        localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(transactions));
    }

    function loadTransactions() {
        const savedData = localStorage.getItem(LEDGER_STORAGE_KEY);
        if (savedData) {
            transactions = JSON.parse(savedData);
        }
    }
    
    // Funzione API per Molti ID (per il refresh)
    async function fetchCoinPrices(coinIds) {
        if (coinIds.length === 0) return {};
        try {
            const ids = coinIds.join(',');
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur`);
            if (!response.ok) { throw new Error('Errore di rete CoinGecko'); }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Impossibile caricare i prezzi:", error);
            lastUpdatedEl.textContent = `Errore caricamento prezzi. Sei online?`;
            return null;
        }
    }

    // Funzione API per Ricerca
    async function searchCoin(query) {
        if (query.length < 3) {
            searchResults.innerHTML = '';
            livePriceDisplay.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${query}`);
            const data = await response.json();
            searchResults.innerHTML = '';
            
            data.coins.slice(0, 5).forEach(coin => {
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `<img src="${coin.thumb}" alt="${coin.name}"><span>${coin.name}</span><small>(${coin.symbol})</small>`;
                
                item.addEventListener('click', () => {
                    txCoinSearchInput.value = coin.name;
                    txCoinIdInput.value = coin.id;
                    txCoinIconInput.value = coin.thumb;
                    searchResults.innerHTML = '';
                    fetchLivePrice(coin.id, true);
                });
                searchResults.appendChild(item);
            });
        } catch (error) { console.error("Errore ricerca:", error); }
    }
    
    // Funzione API per Prezzo Singolo (nel modal)
    async function fetchLivePrice(coinId, updateModalDisplay) {
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`);
            const data = await response.json();
            if (data[coinId] && data[coinId].eur) {
                const price = data[coinId].eur;
                if (updateModalDisplay) {
                    txCoinPriceInput.value = price;
                    livePriceText.textContent = `€${price.toLocaleString('it-IT')}`;
                    livePriceDisplay.style.display = 'block';
                }
                return price;
            }
            return null;
        } catch (error) { 
            console.error("Errore prezzo:", error); 
            return null;
        }
    }
    
    txCoinSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        livePriceDisplay.style.display = 'none';
        txCoinPriceInput.value = ''; 
        searchTimer = setTimeout(() => searchCoin(txCoinSearchInput.value), 300);
    });

    // Aggiunge una transazione di ACQUISTO
    function handleAddTransaction(event) {
        event.preventDefault();
        
        const coinId = txCoinIdInput.value;
        const coinName = txCoinSearchInput.value;
        const coinIcon = txCoinIconInput.value;
        const livePrice = parseFloat(txCoinPriceInput.value);
        const eurosInvested = parseFloat(txEurosInvestedInput.value);

        if (!coinId || !livePrice || livePrice <= 0 || !eurosInvested || eurosInvested <= 0) {
            alert('Errore: Cerca una crypto e inserisci un importo valido.');
            return;
        }
        
        const amountBought = eurosInvested / livePrice;

        const newTransaction = {
            tx_id: Date.now(),
            id: coinId,
            name: coinName,
            icon: coinIcon,
            status: 'open',
            amount: amountBought,
            cost: eurosInvested,
            pricePerCoin: livePrice,
            date_bought: new Date().toISOString(),
            soldFor: 0,
            date_sold: null,
            profit: 0
        };
        
        transactions.push(newTransaction);
        saveTransactions();
        renderLedger();
        closeAddModal();
    }
    addTxForm.addEventListener('submit', handleAddTransaction);

    // Gestisce la VENDITA
    function handleSellTransaction() {
        const tx = currentSellingTx;
        if (!tx || currentSellPrice <= 0) {
            alert('Errore: Prezzo di vendita non valido.');
            return;
        }

        const sellValue = tx.amount * currentSellPrice;
        const profit = sellValue - tx.cost;

        tx.status = 'closed';
        tx.soldFor = sellValue;
        tx.date_sold = new Date().toISOString();
        tx.profit = profit;

        saveTransactions();
        renderLedger();
        closeSellModal();
    }
    modalSellConfirmBtn.addEventListener('click', handleSellTransaction);

    // Funzione "intelligente" per aggiornare il cruscotto
    async function renderLedger(isAutoRefresh = false) {
        
        const openPositions = transactions.filter(tx => tx.status === 'open');
        const closedPositions = transactions.filter(tx => tx.status === 'closed');

        let totalInvested = 0;
        
        if (!isAutoRefresh) {
            portfolioList.innerHTML = '';
            historyList.innerHTML = '';
        }
        
        // 1. Popola Storico Vendite
        if (closedPositions.length === 0) {
            emptyHistoryMessage.style.display = 'block';
        } else {
            emptyHistoryMessage.style.display = 'none';
            if (!isAutoRefresh) { // Ricostruisci lo storico solo se non è un refresh
                closedPositions.sort((a, b) => new Date(b.date_sold) - new Date(a.date_sold));
                closedPositions.forEach(tx => {
                    const txEl = document.createElement('div');
                    txEl.className = 'history-item';
                    const profitClass = tx.profit >= 0 ? 'pl-good' : 'pl-bad';
                    txEl.innerHTML = `
                        <img class="history-item-icon" src="${tx.icon}" alt="${tx.name}">
                        <div class="history-item-info">
                            <h3>${tx.name} (${(tx.amount).toFixed(4)})</h3>
                            <p>Acquistato per <strong>€${tx.cost.toFixed(2)}</strong></p>
                            <p>Venduto per <strong>€${tx.soldFor.toFixed(2)}</strong></p>
                            <p>Profitto: <strong class="${profitClass}">${tx.profit >= 0 ? '+' : ''}€${tx.profit.toFixed(2)}</strong></p>
                        </div>
                    `;
                    historyList.appendChild(txEl);
                });
            }
        }
        
        // 2. Popola Posizioni Aperte
        if (openPositions.length === 0) {
            emptyPortfolioMessage.style.display = 'block';
            totalInvestedEl.textContent = '€0.00';
            livePlEl.textContent = 'P/L Live: €0.00 (0%)';
            livePlEl.className = '';
            lastUpdatedEl.textContent = '';
            return;
        }
        
        emptyPortfolioMessage.style.display = 'none';
        if (isAutoRefresh) {
            lastUpdatedEl.textContent = 'Aggiornamento prezzi...';
        } else {
            portfolioList.innerHTML = '<div class="empty-message"><p>Caricamento...</p></div>';
        }

        // 3. Raggruppa le posizioni per ID (per P/L live)
        const coinIds = [...new Set(openPositions.map(tx => tx.id))];
        const prices = await fetchCoinPrices(coinIds);

        if (!prices) {
             if (!isAutoRefresh) portfolioList.innerHTML = '<div class="empty-message"><p>Errore nel caricare i prezzi.</p></div>';
             lastUpdatedEl.textContent = 'Errore caricamento prezzi.';
             return;
        }

        let totalLiveValue = 0;
        let totalCostOfOpenPositions = 0;
        
        if (!isAutoRefresh) portfolioList.innerHTML = ''; // Pulisci

        openPositions.forEach((tx) => {
            totalInvested += tx.cost;
            const currentPrice = prices[tx.id] ? prices[tx.id].eur : tx.pricePerCoin; 
            const currentValue = tx.amount * currentPrice;
            const plValue = currentValue - tx.cost;
            const plPercent = (plValue / tx.cost) * 100;
            
            totalLiveValue += currentValue;
            totalCostOfOpenPositions += tx.cost;
            
            let txEl = document.getElementById(`tx-item-${tx.tx_id}`);
            if (!txEl) {
                txEl = document.createElement('div');
                txEl.className = 'list-item';
                txEl.id = `tx-item-${tx.tx_id}`;
                txEl.innerHTML = `
                    <img class="list-item-icon" src="${tx.icon}" alt="${tx.name}">
                    <div class="list-item-info">
                        <h3>${tx.name}</h3>
                        <p>${tx.amount.toFixed(6)} unità</p>
                    </div>
                    <div class="list-item-value" id="value-${tx.tx_id}">
                        <h3>€${tx.cost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        <p>@ €${tx.pricePerCoin.toLocaleString('it-IT')}</p>
                    </div>
                    <button class="btn btn-sell" data-tx-id="${tx.tx_id}">Vendi</button>
                `;
                portfolioList.appendChild(txEl);
                txEl.querySelector('.btn-sell').addEventListener('click', () => openSellModal(tx));
            }
            
            const valueEl = txEl.querySelector(`#value-${tx.tx_id}`);
            valueEl.innerHTML = `
                <h3>€${currentValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                <p class="${plValue >= 0 ? 'pl-good' : 'pl-bad'}">
                    ${plValue >= 0 ? '+' : ''}€${plValue.toFixed(2)} (${plPercent.toFixed(1)}%)
                </p>
            `;
        });

        // 4. Aggiorna i totali
        const totalPL = totalLiveValue - totalCostOfOpenPositions;
        const totalPLPercent = (totalCostOfOpenPositions === 0) ? 0 : (totalPL / totalCostOfOpenPositions) * 100;
        
        totalInvestedEl.textContent = `€${totalCostOfOpenPositions.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        livePlEl.textContent = `P/L Live: ${totalPL >= 0 ? '+' : ''}€${totalPL.toFixed(2)} (${totalPLPercent.toFixed(1)}%)`;
        livePlEl.className = totalPL >= 0 ? 'pl-good' : 'pl-bad';
        lastUpdatedEl.textContent = `Prezzi aggiornati: ${new Date().toLocaleTimeString('it-IT')}`;
    }

    // --- 7. LOGICA CALCOLATORI ---
    
    // Calcolatore Staking (Avanzato)
    function calculateStaking() {
        const settings = loadCalculatorSettings(); 
        const initial = parseFloat(settings.initial) || 0;
        const apy = parseFloat(settings.apy) || 0;
        const years = parseInt(settings.years) || 0;
        const frequency = parseInt(settings.frequency) || 12;
        const monthly = parseFloat(settings.monthly) || 0;
        
        const periodsPerYear = frequency;
        const ratePerPeriod = (apy / 100) / periodsPerYear;
        const contributionPerPeriod = (monthly * 12) / periodsPerYear;

        let currentBalance = initial;
        let totalContributed = initial;
        let totalInterest = 0;
        
        let tableHTML = `
            <table>
                <thead><tr><th>Anno</th><th>Contribuito</th><th>Interessi</th><th>Bilancio</th></tr></thead>
                <tbody>
        `;
        
        // Loop per ogni anno
        for (let y = 1; y <= years; y++) {
            let yearInterest = 0;
            // Loop per ogni periodo di reinvestimento nell'anno
            for (let p = 1; p <= periodsPerYear; p++) {
                let interestThisPeriod = currentBalance * ratePerPeriod;
                currentBalance += contributionPerPeriod; 
                
                // Il contributo iniziale è già contato
                if (y > 1 || p > 1) {
                     totalContributed += contributionPerPeriod;
                }
                
                yearInterest += interestThisPeriod;
                currentBalance += interestThisPeriod; 
            }
            totalInterest += yearInterest;
            
            tableHTML += `
                <tr>
                    <td>${y}</td>
                    <td>€${Math.round(totalContributed)}</td>
                    <td>€${Math.round(totalInterest)}</td>
                    <td>€${Math.round(currentBalance)}</td>
                </tr>
            `;
        }
        
        tableHTML += '</tbody></table>';
        stakingResultTable.innerHTML = tableHTML;
    }
    
    function saveCalculatorSettings() {
        calculatorSettings = {
            initial: stakingInputs.initial.value || "",
            apy: stakingInputs.apy.value || "",
            years: stakingInputs.years.value || "",
            frequency: stakingInputs.frequency.value || 12,
            monthly: stakingInputs.monthly.value || "",
        };
        localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(calculatorSettings));
    }
    
    function loadCalculatorSettings() {
        const savedData = localStorage.getItem(CALC_STORAGE_KEY);
        let data = savedData ? JSON.parse(savedData) : {};
        
        stakingInputs.initial.value = data.initial || "";
        stakingInputs.apy.value = data.apy || "";
        stakingInputs.years.value = data.years || "";
        stakingInputs.frequency.value = data.frequency || 12;
        stakingInputs.monthly.value = data.monthly || "";
        
        if (savedData) {
            calculatorSettings = data;
        } else {
             saveCalculatorSettings(); // Salva i default se non c'è nulla
        }
        return calculatorSettings;
    }
    
    stakingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCalculatorSettings(); 
        calculateStaking(); 
    });
    Object.values(stakingInputs).forEach(input => {
        input.addEventListener('change', saveCalculatorSettings); // 'change' è meglio di 'input' per select/number
    });


    // --- 8. LOGICA IMPOSTAZIONI (IMPORTA/ESPORTA/RESET) ---
    
    exportBtn.addEventListener('click', () => {
        // [MODIFICATO] Ora salva TUTTI i dati
        const appData = {
            ledgerData: transactions,
            calculatorData: calculatorSettings
        };
        
        if (appData.ledgerData.length === 0 && !appData.calculatorData.initial) {
            alert('Nessun dato da esportare.');
            return;
        }
        
        const dataStr = JSON.stringify(appData);
        const exportData = btoa(dataStr);
        importDataEl.value = exportData;
        importDataEl.select();
        alert('Codice di backup generato. Copialo e salvalo!');
    });

    importBtn.addEventListener('click', () => {
        const importData = importDataEl.value.trim();
        if (!importData) return alert('Incolla il tuo codice di backup.');
        
        try {
            const decodedStr = atob(importData);
            const appData = JSON.parse(decodedStr);

            if (appData.ledgerData && appData.calculatorData) {
                if (confirm('Questo sovrascriverà tutti i dati dell\'app. Sei sicuro?')) {
                    transactions = appData.ledgerData;
                    calculatorSettings = appData.calculatorData;
                    
                    saveTransactions();
                    localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(calculatorSettings));
                    
                    initializeApp(); // Ricarica tutta l'app
                    alert('Dati importati con successo!');
                    importDataEl.value = '';
                    document.querySelector('.nav-item[data-page="page-portfolio"]').click();
                }
            } else { throw new Error('Dati non validi.'); }
        } catch (error) { alert('Errore: Il codice di backup non è valido.'); }
    });

    resetAppBtn.addEventListener('click', () => {
        if (confirm('ATTENZIONE!\nSei sicuro di voler cancellare TUTTI i dati (transazioni e calcolatore)?\n\nQuesta azione è irreversibile.')) {
            transactions = [];
            calculatorSettings = {};
            saveTransactions();
            localStorage.removeItem(CALC_STORAGE_KEY);
            initializeApp();
            alert('Dati azzerati.');
        }
    });

    // --- 9. INIZIALIZZAZIONE APP ---
    function initializeApp() {
        loadTransactions();
        loadCalculatorSettings();
        renderLedger(); 
        calculateStaking(); 
        fabAddButton.style.display = 'flex';
        
        // Avvia l'aggiornamento automatico dei prezzi ogni 60 secondi
        setInterval(() => {
            console.log("Aggiornamento automatico prezzi...");
            renderLedger(true); // true = è un auto-refresh
        }, 60000); 
    }
    
    initializeApp();
});