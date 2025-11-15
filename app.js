// --- 1. SUPABASE INITIALIZATION ---
// Chiavi pubbliche. La sicurezza è gestita da RLS nel database.
const SUPABASE_URL = 'https://siojtnnsjagksuhxrwpi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpb2p0bm5zamFna3N1aHhyd3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NTY3MTYsImV4cCI6MjA3NjIzMjcxNn0.EmfZZZ6AlEoZoTwkReD6a2LRnHekaan-RGnt1fEa3c8';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. GESTIONE GENERALE PAGINA ---
document.addEventListener('DOMContentLoaded', () => {
    
    // [FIX] Inizializza AOS per correggere il bug della pagina vuota
    AOS.init({
        duration: 800,
        once: false, // Permette alle animazioni di rieseguirsi
        offset: 50,
        startEvent: 'DOMContentLoaded' // Fa partire le animazioni al caricamento
    });
    
    // Carica i dati del calcolatore da Local Storage (solo se il calcolatore esiste)
    if (document.getElementById('stakingInitial')) {
        loadCalculatorState();
    }
    
    // Listener globale per chiudere i tooltip
    document.body.addEventListener('click', (event) => {
        // Se il click NON è su un tooltip, chiudi tutto
        if (!event.target.closest('.tooltip')) {
            closeAllTooltips();
        }
    });

    // Gestione Logout
    const logoutButton = document.getElementById('nav-logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
});

// --- 3. AUTENTICAZIONE NAVBAR ---
// Questo gestisce lo stato dei pulsanti Login/Logout/Agenda su TUTTE le pagine
supabase.auth.onAuthStateChange((event, session) => {
    const navLogin = document.getElementById('nav-login');
    const navAgenda = document.getElementById('nav-agenda');
    const navLogout = document.getElementById('nav-logout');

    if (!navLogin || !navAgenda || !navLogout) {
        // Se non siamo in una pagina con la navbar, esci
        return;
    }

    if (session) {
        // Utente è loggato
        navLogin.style.display = 'none';
        navAgenda.style.display = 'inline-block';
        navAgenda.href = 'agenda.html'; // Link corretto
        navLogout.style.display = 'inline-block';
    } else {
        // Utente non è loggato
        navLogin.style.display = 'inline-block';
        navAgenda.style.display = 'inline-block'; // Visibile
        navAgenda.href = 'auth.html?message=login_required'; // Punta al login
        navLogout.style.display = 'none';
    }
});

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Errore nel logout:', error.message);
    } else {
        // onAuthStateChange gestirà l'UI.
        // Se siamo su agenda.html, reindirizza alla home.
        if (window.location.pathname.includes('agenda.html')) {
            window.location.href = 'index.html';
        }
    }
}

// --- 4. JS PER I MODAL (Solo per index.html) ---
const modalOverlay = document.getElementById('modal-overlay');
const allModals = document.querySelectorAll('.modal-content');

function openModal(modalId) {
    closeModal();
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modalOverlay.classList.add('active');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
}

function closeModal() {
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    allModals.forEach(modal => modal.classList.remove('active'));
    document.body.classList.remove('modal-open');
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        closeModal();
    }
});

// --- 5. JS PER I TOOLTIP ON-CLICK (CORRETTO) ---
function toggleTooltip(event) {
    event.stopPropagation(); // Fondamentale
    const clickedTooltipSpan = event.currentTarget;
    const clickedTooltipText = clickedTooltipSpan.querySelector('.tooltip-text');
    const isActive = clickedTooltipText.classList.contains('active');
    
    closeAllTooltips(clickedTooltipText); 
    clickedTooltipText.classList.toggle('active');
}

function closeAllTooltips(exceptThisOne = null) {
    const allTooltips = document.querySelectorAll('.tooltip-text');
    allTooltips.forEach(tt => {
        if (tt !== exceptThisOne) {
            tt.classList.remove('active');
        }
    });
}

// --- 6. JS PER BLOCKCHAIN VIVA (Solo per index.html) ---
let blockCount = 1;
let lastHash = '000...a1b';

function addBlockToChain() {
    blockCount++;
    const chain = document.getElementById('blockchain-chain');
    if (!chain) return; // Non eseguire se non siamo sulla pagina giusta
    
    const arrow = document.createElement('div');
    arrow.classList.add('arrow');
    arrow.innerHTML = '<i class="fas fa-arrow-right"></i>';
    chain.appendChild(arrow);
    
    const newBlock = document.createElement('div');
    newBlock.classList.add('block');
    
    const newHash = `000...${(Math.random() + 1).toString(36).substring(7)}`;
    
    newBlock.innerHTML = `
        <span class="block-header">Blocco #${blockCount}</span>
        <span class="block-data">Hash Prec: ${lastHash.substring(7)}</span>
        <span class="block-hash">${newHash}</span>
        <i class="fas fa-lock block-lock-icon"></i>
    `;
    chain.appendChild(newBlock);
    
    setTimeout(() => {
        newBlock.classList.add('verified');
    }, 500);
    
    lastHash = newHash;
}

// --- 7. JS PER CALCOLATORE INTERESSI + LOCAL STORAGE (Solo per index.html) ---
function calculateStaking() {
    const initialInput = document.getElementById('stakingInitial');
    const monthlyInput = document.getElementById('stakingMonthly');
    const apyInput = document.getElementById('stakingAPY');
    const yearsInput = document.getElementById('stakingYears');
    const tableBody = document.getElementById('stakingResultTable');

    // Se non siamo sulla pagina giusta, esci
    if (!initialInput || !tableBody) return;

    const initial = parseFloat(initialInput.value) || 0;
    const monthly = parseFloat(monthlyInput.value) || 0;
    const apyPercent = parseFloat(apyInput.value) || 0;
    const years = parseInt(yearsInput.value) || 0;
    
    const monthlyRate = apyPercent / 100 / 12;

    // Salva i valori in Local Storage
    localStorage.setItem('stakingInitial', initial);
    localStorage.setItem('stakingMonthly', monthly);
    localStorage.setItem('stakingAPY', apyPercent);
    localStorage.setItem('stakingYears', years);
    
    // Pulisci e crea la tabella
    tableBody.innerHTML = `
        <thead>
            <tr>
                <th>Anno</th>
                <th>Totale Contribuito</th>
                <th>Interessi Guadagnati</th>
                <th>Bilancio Finale</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    
    let currentBalance = initial;
    let totalContributed = initial;
    let totalInterest = 0;

    for (let y = 1; y <= years; y++) {
        let yearInterest = 0;
        
        for (let m = 1; m <= 12; m++) {
            let interestThisMonth = currentBalance * monthlyRate;
            currentBalance += monthly;
            yearInterest += interestThisMonth;
            currentBalance += interestThisMonth;
        }
        
        // Correzione per il calcolo del totale contribuito
        totalContributed = initial + (y * 12 * monthly);
        totalInterest += yearInterest;
        
        const row = `
            <tr>
                <td>${y}</td>
                <td>${totalContributed.toFixed(2)} €</td>
                <td>${totalInterest.toFixed(2)} €</td>
                <td>${currentBalance.toFixed(2)} €</td>
            </tr>
        `;
        tableBody.querySelector('tbody').innerHTML += row;
    }
}

function loadCalculatorState() {
    // Assicura che la funzione esista prima di chiamarla
    if (document.getElementById('stakingInitial')) {
        document.getElementById('stakingInitial').value = localStorage.getItem('stakingInitial') || 1000;
        document.getElementById('stakingMonthly').value = localStorage.getItem('stakingMonthly') || 100;
        document.getElementById('stakingAPY').value = localStorage.getItem('stakingAPY') || 8;
        document.getElementById('stakingYears').value = localStorage.getItem('stakingYears') || 5;
        
        calculateStaking();
    }
}