/**
 * ZERBYTE - CORE LOGIC
 * Integrates Real-time Market Data, Historical Charts, and Exchange Math
 */

// Global State
let marketData = [];
let currentPortfolioId = 'bitcoin'; // Default for the chart
let portfolioChart;

// 1. FETCH LIVE MARKET DATA
async function fetchMarketData() {
    const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false';
    
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        marketData = data.map(coin => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol.toUpperCase(),
            price: coin.current_price,
            change: coin.price_change_percentage_24h,
            image: coin.image
        }));

        renderMarkets(marketData);
        updateTicker(marketData);
    } catch (error) {
        console.error("Failed to fetch market data:", error);
    }
}

// 2. RENDER MARKET LIST
function renderMarkets(coins) {
    const list = document.getElementById('market-list');
    if (!list) return;

    list.innerHTML = coins.map((coin, index) => `
        <div onclick="updateChartForCoin('${coin.id}')" class="flex items-center justify-between p-4 bg-[#161a1e] rounded-xl border border-gray-800 hover:border-[#00d084]/50 transition-all cursor-pointer group">
            <div class="flex items-center gap-4">
                <span class="text-gray-600 text-xs w-4">${index + 1}</span>
                <img src="${coin.image}" class="w-8 h-8 rounded-full" alt="${coin.name}">
                <div>
                    <div class="font-bold text-white group-hover:text-[#00d084] transition-colors">${coin.name}</div>
                    <div class="text-gray-500 text-xs">${coin.symbol}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-bold text-white tabular-nums">$${coin.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                <div class="text-sm ${coin.change >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${coin.change >= 0 ? '▲' : '▼'} ${Math.abs(coin.change).toFixed(2)}%
                </div>
            </div>
        </div>
    `).join('');
}

// TICKER UPDATE (Top Bar)
function updateTicker(coins) {
    const map = {
        bitcoin: 'btc',
        ethereum: 'eth',
        solana: 'sol'
    };

    coins.forEach(coin => {
        const key = map[coin.id];
        if (!key) return;

        const priceEl = document.getElementById(`ticker-${key}-price`);
        const changeEl = document.getElementById(`ticker-${key}-change`);
        if (!priceEl || !changeEl) return;

        priceEl.textContent =
            `$${coin.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;

        const isUp = coin.change >= 0;
        changeEl.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(coin.change).toFixed(2)}%`;
        changeEl.className = isUp ? 'text-green-400' : 'text-red-400';
    });
}

// 3. CHART LOGIC (Historical Data)
async function initChart(coinId = 'bitcoin') {
    const ctx = document.getElementById('portfolioChart')?.getContext('2d');
    if (!ctx) return;

    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`);
        const data = await response.json();
        
        // Extract prices and dates
        const prices = data.prices.map(p => p[1]);
        const labels = data.prices.map(p => new Date(p[0]).toLocaleDateString('en-US', { weekday: 'short' }));

        if (portfolioChart) portfolioChart.destroy();

        const gradient = ctx.createLinearGradient(0, 0, 0, 150);
        gradient.addColorStop(0, 'rgba(0, 208, 132, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 208, 132, 0)');

        portfolioChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: prices,
                    borderColor: '#00d084',
                    borderWidth: 3,
                    fill: true,
                    backgroundColor: gradient,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    } catch (error) {
        console.error("Chart Error:", error);
    }
}

// 4. EXCHANGE CALCULATOR MATH
function calculateExchange() {
    const payInput = document.getElementById('pay-amount');
    const receiveInput = document.getElementById('receive-amount');
    const btcPrice = marketData.find(c => c.id === 'bitcoin')?.price || 43000;
    
    const amount = parseFloat(payInput.value) || 0;
    receiveInput.value = (amount / btcPrice).toFixed(8);
}

// 5. TAB SWITCHING
function switchTab(type) {
    const tabs = ['buy', 'sell', 'convert'];
    const btnAction = document.getElementById('main-action-btn');
    
    tabs.forEach(tab => {
        const btn = document.getElementById(`btn-${tab}`);
        if (tab === type) {
            btn.classList.add('bg-[#1e2329]', 'text-white');
            btn.classList.remove('text-gray-500');
        } else {
            btn.classList.remove('bg-[#1e2329]', 'text-white');
            btn.classList.add('text-gray-500');
        }
    });

    btnAction.innerText = type.charAt(0).toUpperCase() + type.slice(1) + ' Bitcoin';
}

// 6. SEARCH FILTER
function setupSearch() {
    const searchInput = document.querySelector('input[placeholder="Search..."]');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = marketData.filter(c => 
            c.name.toLowerCase().includes(term) || c.symbol.toLowerCase().includes(term)
        );
        renderMarkets(filtered);
    });
}

// Helper: Click market item to update portfolio chart
window.updateChartForCoin = (id) => {
    initChart(id);
    document.querySelector('h2.text-3xl.font-bold').innerText = id.charAt(0).toUpperCase() + id.slice(1);
};

// INITIALIZE APP
document.addEventListener('DOMContentLoaded', () => {
    fetchMarketData(); // Load markets
    initChart();       // Load initial chart
    setupSearch();     // Enable search
    
    // Refresh prices every 60 seconds
    setInterval(fetchMarketData, 60000);

    // Calc Listener
    document.getElementById('pay-amount')?.addEventListener('input', calculateExchange);
});

function setupNavigation() {
    const menuBtn = document.querySelector('.fa-bars'); // The hamburger icon in your nav
    const closeBtn = document.getElementById('menu-close');
    const mobileMenu = document.getElementById('mobile-menu');

    // Open Menu
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.remove('translate-x-full');
        // Prevent background scrolling when menu is open
        document.body.style.overflow = 'hidden';
    });

    // Close Menu
    closeBtn.addEventListener('click', () => {
        mobileMenu.classList.add('translate-x-full');
        document.body.style.overflow = 'auto';
    });

    // Close menu when clicking a link
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('translate-x-full');
            document.body.style.overflow = 'auto';
        });
    });
}

// Add setupNavigation() to your DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', () => {
    fetchMarketData();
    initChart();
    setupSearch();
    setupNavigation(); // Initialize nav logic
});
