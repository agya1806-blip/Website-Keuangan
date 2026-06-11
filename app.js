// ==================== KASKU BUSINESS - CORE APP ====================

const DB = {
    wallets: 'kasku_wallets',
    transactions: 'kasku_transactions',
    customers: 'kasku_customers',
    products: 'kasku_products',
    debts: 'kasku_debts',
    receivables: 'kasku_receivables',
    invoices: 'kasku_invoices',
    settings: 'kasku_settings',
    activities: 'kasku_activities'
};

const defaultWallets = [
    { id: 'wb1', name: 'SeaBank', icon: '🏦', balance: 0, createdAt: Date.now() },
    { id: 'wb2', name: 'BSI', icon: '🏦', balance: 0, createdAt: Date.now() },
    { id: 'wb3', name: 'DANA', icon: '📱', balance: 0, createdAt: Date.now() },
    { id: 'wb4', name: 'ShopeePay', icon: '📱', balance: 0, createdAt: Date.now() },
    { id: 'wb5', name: 'Kas Tunai', icon: '💵', balance: 0, createdAt: Date.now() }
];

const defaultSettings = {
    businessName: 'KASKU BUSINESS',
    whatsapp: '085217706587',
    address: 'Jl. Contoh No. 123, Jakarta',
    logo: '',
    signature: '',
    theme: 'light'
};

const incomeCategories = ['Penjualan', 'Jasa', 'DP Invoice', 'Pelunasan Invoice', 'Pendapatan Lain', 'Transfer Masuk', 'Pembayaran Piutang'];
const expenseCategories = ['Pembelian', 'Operasional', 'Gaji', 'Bayar Hutang', 'Pengeluaran Lain', 'Transfer Keluar'];

let currentTransactionType = 'income';
let currentInvoiceId = null;
let invoiceItems = [];

// ==================== DATA FUNCTIONS ====================

function init() {
    if (!localStorage.getItem(DB.wallets)) {
        localStorage.setItem(DB.wallets, JSON.stringify(defaultWallets));
    }
    if (!localStorage.getItem(DB.settings)) {
        localStorage.setItem(DB.settings, JSON.stringify(defaultSettings));
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
    document.getElementById('debtDate').value = today;
    document.getElementById('debtDue').value = today;
    document.getElementById('receivableDate').value = today;
    document.getElementById('receivableDue').value = today;

    const settings = loadData(DB.settings);
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    if (settings.theme === 'dark') {
        document.getElementById('darkModeToggle').classList.add('active');
    }

    recalculateAll();
    renderAll();
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateInvoiceNumber() {
    const date = new Date();
    const dateStr = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    const invoices = loadData(DB.invoices);
    const todayInvoices = invoices.filter(i => i.number && i.number.includes(dateStr));
    const seq = String(todayInvoices.length + 1).padStart(3, '0');
    return `INV-${dateStr}-${seq}`;
}

function formatRupiah(num) {
    return 'Rp ' + (num || 0).toLocaleString('id-ID');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addActivity(desc) {
    const activities = loadData(DB.activities);
    activities.unshift({ id: generateId(), description: desc, timestamp: Date.now() });
    if (activities.length > 50) activities.pop();
    saveData(DB.activities, activities);
}

// ==================== RECALCULATION ====================

function recalculateWalletBalance() {
    const wallets = loadData(DB.wallets);
    const transactions = loadData(DB.transactions);
    
    wallets.forEach(w => {
        let balance = 0;
        transactions.forEach(t => {
            if (t.walletId === w.id) {
                if (t.type === 'income' || t.type === 'transfer_in') balance += parseFloat(t.amount);
                else if (t.type === 'expense' || t.type === 'transfer_out') balance -= parseFloat(t.amount);
            }
        });
        w.balance = balance;
    });
    saveData(DB.wallets, wallets);
    return wallets;
}

function recalculateDashboard() {
    const transactions = loadData(DB.transactions);
    const debts = loadData(DB.debts);
    const receivables = loadData(DB.receivables);
    const invoices = loadData(DB.invoices);
    const wallets = recalculateWalletBalance();
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    let totalIncome = 0, totalExpense = 0, monthIncome = 0, monthExpense = 0, totalDebt = 0, totalReceivable = 0;
    
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const amt = parseFloat(t.amount);
        if (t.type === 'income') {
            totalIncome += amt;
            if (tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear) monthIncome += amt;
        } else if (t.type === 'expense') {
            totalExpense += amt;
            if (tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear) monthExpense += amt;
        }
    });
    
    debts.forEach(d => { if (d.status !== 'Lunas') totalDebt += parseFloat(d.amount); });
    receivables.forEach(r => { if (r.status !== 'Lunas') totalReceivable += parseFloat(r.amount); });
    
    return {
        totalBalance: wallets.reduce((sum, w) => sum + w.balance, 0),
        totalIncome, totalExpense, totalDebt, totalReceivable,
        monthIncome, monthExpense, monthProfit: monthIncome - monthExpense,
        paidInvoices: invoices.filter(i => i.status === 'Lunas').length,
        unpaidInvoices: invoices.filter(i => i.status !== 'Lunas').length
    };
}

function recalculateAll() {
    recalculateWalletBalance();
    recalculateDashboard();
}

// ==================== RENDER FUNCTIONS ====================

function renderAll() {
    const stats = recalculateDashboard();
    document.getElementById('totalBalance').textContent = formatRupiah(stats.totalBalance);
    document.getElementById('dashIncome').textContent = formatRupiah(stats.totalIncome);
    document.getElementById('dashExpense').textContent = formatRupiah(stats.totalExpense);
    document.getElementById('dashDebt').textContent = formatRupiah(stats.totalDebt);
    document.getElementById('dashReceivable').textContent = formatRupiah(stats.totalReceivable);
    document.getElementById('monthIncome').textContent = formatRupiah(stats.monthIncome);
    document.getElementById('monthExpense').textContent = formatRupiah(stats.monthExpense);
    document.getElementById('monthProfit').textContent = formatRupiah(stats.monthProfit);
    document.getElementById('invoicePaid').textContent = stats.paidInvoices;
    document.getElementById('invoiceUnpaid').textContent = stats.unpaidInvoices;
    
    renderChart();
    renderActivities();
    renderWallets();
    renderTransactions();
    renderCustomers();
    renderProducts();
    renderDebts();
    renderReceivables();
    renderInvoices();
    renderReports();
    updateWalletSelects();
}

function renderChart() {
    const transactions = loadData(DB.transactions);
    const days = [], incomeData = [], expenseData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
        let inc = 0, exp = 0;
        transactions.forEach(t => {
            if (t.date === dateStr) {
                if (t.type === 'income') inc += parseFloat(t.amount);
                else if (t.type === 'expense') exp += parseFloat(t.amount);
            }
        });
        incomeData.push(inc);
        expenseData.push(exp);
    }
    const maxVal = Math.max(...incomeData, ...expenseData, 1);
    document.getElementById('financeChart').innerHTML = days.map((day, i) => {
        const h1 = (incomeData[i] / maxVal * 100) || 5;
        const h2 = (expenseData[i] / maxVal * 100) || 5;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
            <div style="display:flex;gap:2px;align-items:flex-end;height:120px">
                <div class="chart-bar" style="height:${h1}px;width:8px;background:linear-gradient(to top,var(--success),#34d399)"></div>
                <div class="chart-bar" style="height:${h2}px;width:8px;background:linear-gradient(to top,var(--danger),#f87171)"></div>
            </div>
            <span class="chart-bar-label">${day}</span>
        </div>`;
    }).join('');
}

function renderActivities() {
    const activities = loadData(DB.activities).slice(0, 10);
    const container = document.getElementById('recentActivity');
    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada aktivitas</p></div>';
        return;
    }
    container.innerHTML = activities.map(a => `
        <div class="list-item">
            <div class="list-icon" style="background:var(--surface-2)">📝</div>
            <div class="list-content">
                <div class="list-title">${a.description}</div>
                <div class="list-subtitle">${new Date(a.timestamp).toLocaleString('id-ID')}</div>
            </div>
        </div>`).join('');
}

function renderWallets() {
    const wallets = loadData(DB.wallets);
    document.getElementById('walletList').innerHTML = wallets.map(w => `
        <div class="wallet-card">
            <div class="wallet-name">${w.icon} ${w.name}</div>
            <div class="wallet-balance">${formatRupiah(w.balance)}</div>
            <div class="wallet-actions">
                <button class="wallet-btn" onclick="openTransferModal('${w.id}')">↔️ Transfer</button>
                <button class="wallet-btn" onclick="editWallet('${w.id}')">✏️ Edit</button>
                <button class="wallet-btn" onclick="deleteWallet('${w.id}')">🗑️ Hapus</button>
            </div>
        </div>`).join('');
}

function renderTransactions() {
    const transactions = loadData(DB.transactions).sort((a, b) => new Date(b.date) - new Date(a.date));
    const wallets = loadData(DB.wallets);
    const walletMap = Object.fromEntries(wallets.map(w => [w.id, w]));
    const incomeList = transactions.filter(t => t.type === 'income');
    const expenseList = transactions.filter(t => t.type === 'expense');
    
    const renderList = (list, containerId) => {
        const container = document.getElementById(containerId);
        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada transaksi</p></div>';
            return;
        }
        container.innerHTML = list.map(t => `
            <div class="list-item">
                <div class="list-icon" style="background:${t.type==='income'?'#d1fae5':'#fee2e2'}">${t.type==='income'?'📥':'📤'}</div>
                <div class="list-content">
                    <div class="list-title">${t.description}</div>
                    <div class="list-subtitle">${formatDate(t.date)} • ${t.category} • ${walletMap[t.walletId]?.name||'-'}</div>
                </div>
                <div class="list-amount ${t.type}">${t.type==='income'?'+':'-'} ${formatRupiah(t.amount)}</div>
            </div>
            <div style="display:flex;gap:8px;padding:0 16px 12px;margin-top:-8px">
                <button class="btn btn-outline" style="padding:6px;font-size:12px" onclick="editTransaction('${t.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px" onclick="deleteTransaction('${t.id}')">Hapus</button>
            </div>`).join('');
    };
    renderList(incomeList, 'incomeList');
    renderList(expenseList, 'expenseList');
}

function renderCustomers() {
    const search = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    const customers = loadData(DB.customers)
        .filter(c => !search || c.name.toLowerCase().includes(search) || c.phone.includes(search))
        .sort((a, b) => a.name.localeCompare(b.name));
    const container = document.getElementById('customerList');
    if (customers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Belum ada pelanggan</p></div>';
        return;
    }
    container.innerHTML = customers.map(c => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#dbeafe">👤</div>
                <div class="list-content">
                    <div class="list-title">${c.name}</div>
                    <div class="list-subtitle">${c.phone||'-'} • ${c.address||'-'}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn-outline" style="padding:6px;font-size:12px" onclick="editCustomer('${c.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px" onclick="deleteCustomer('${c.id}')">Hapus</button>
            </div>
        </div>`).join('');
}

function renderProducts() {
    const type = document.getElementById('productType')?.value || 'service';
    const products = loadData(DB.products).filter(p => p.type === type || !p.type);
    const container = document.getElementById('productList');
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>Belum ada data</p></div>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#f3e8ff">📦</div>
                <div class="list-content">
                    <div class="list-title">${p.name}</div>
                    <div class="list-subtitle">${p.category} • ${formatRupiah(p.price)}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn-outline" style="padding:6px;font-size:12px" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px" onclick="deleteProduct('${p.id}')">Hapus</button>
            </div>
        </div>`).join('');
}

function renderDebts() {
    const debts = loadData(DB.debts).sort((a, b) => new Date(b.date) - new Date(a.date));
    const container = document.getElementById('debtList');
    if (debts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><p>Belum ada hutang</p></div>';
        return;
    }
    container.innerHTML = debts.map(d => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#fef3c7">💳</div>
                <div class="list-content">
                    <div class="list-title">${d.name}</div>
                    <div class="list-subtitle">${formatDate(d.date)} • Jatuh tempo: ${formatDate(d.dueDate)}</div>
                </div>
                <div class="list-amount expense">${formatRupiah(d.amount)}</div>
            </div>
            <div style="margin:8px 0"><span class="badge ${d.status==='Lunas'?'badge-success':'badge-danger'}">${d.status}</span></div>
            <div style="display:flex;gap:8px">
                ${d.status!=='Lunas'?`<button class="btn btn-success" style="padding:6px;font-size:12px" onclick="payDebt('${d.id}')">Bayar</button>`:''}
                <button class="btn btn-outline" style="padding:6px;font-size:12px" onclick="editDebt('${d.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px" onclick="deleteDebt('${d.id}')">Hapus</button>
            </div>
        </div>`).join('');
}

function renderReceivables() {
    const receivables = loadData(DB.receivables).sort((a, b) => new Date(b.date) - new Date(a.date));
    const container = document.getElementById('receivableList');
    if (receivables.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">💰</div><p>Belum ada piutang</p></div>';
        return;
    }
    container.innerHTML = receivables.map(r => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#dbeafe">💰</div>
                <div class="list-content">
                    <div class="list-title">${r.name}</div>
                    <div class="list-subtitle">${formatDate(r.date)} • Jatuh tempo: ${formatDate(r.dueDate)}</div>
                </div>
                <div class="list-amount income">${formatRupiah(r.amount)}</div>
            </div>
            <div style="margin:8px 0"><span class="badge ${r.status==='Lunas'?'badge-success':'badge-warning'}">${r.status}</span></div>
            <div style="display:flex;gap:8px">
                ${r.status!=='Lunas'?`<button class="btn btn-success" style="padding:6px;font-size:12px" onclick="payReceivable('${r.id}')">Terima</button>`:''}
                <button class="btn btn-outline" style="padding:6px;font-size:12px" onclick="editReceivable('${r.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px" onclick="deleteReceivable('${r.id}')">Hapus</button>
            </div>
        </div>`).join('');
}

function renderInvoices() {
    const tab = window.invoiceTab || 'all';
    let invoices = loadData(DB.invoices).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (tab === 'paid') invoices = invoices.filter(i => i.status === 'Lunas');
    else if (tab === 'unpaid') invoices = invoices.filter(i => i.status !== 'Lunas');
    const container = document.getElementById('invoiceList');
    if (invoices.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><p>Belum ada invoice</p></div>';
        return;
    }
    container.innerHTML = invoices.map(inv => `
        <div class="card" onclick="showInvoiceDetail('${inv.id}')" style="cursor:pointer">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#e0e7ff">📄</div>
                <div class="list-content">
                    <div class="list-title">${inv.number}</div>
                    <div class="list-subtitle">${inv.customerName} • ${formatDate(inv.date)}</div>
                </div>
                <div style="text-align:right">
                    <div class="list-amount">${formatRupiah(inv.total)}</div>
                    <span class="badge ${inv.status==='Lunas'?'badge-success':inv.status==='DP'?'badge-warning':'badge-danger'}">${inv.status}</span>
                </div>
            </div>
        </div>`).join('');
}

function renderReports() {
    const tab = window.reportTab || 'daily';
    const transactions = loadData(DB.transactions);
    const now = new Date();
    let filtered = [];
    if (tab === 'daily') {
        const today = now.toISOString().split('T')[0];
        filtered = transactions.filter(t => t.date === today);
    } else if (tab === 'weekly') {
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        filtered = transactions.filter(t => new Date(t.date) >= weekAgo);
    } else if (tab === 'monthly') {
        filtered = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else {
        filtered = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === now.getFullYear();
        });
    }
    let income = 0, expense = 0;
    filtered.forEach(t => {
        if (t.type === 'income') income += parseFloat(t.amount);
        else if (t.type === 'expense') expense += parseFloat(t.amount);
    });
    const debts = loadData(DB.debts).filter(d => d.status !== 'Lunas').reduce((s, d) => s + parseFloat(d.amount), 0);
    const receivables = loadData(DB.receivables).filter(r => r.status !== 'Lunas').reduce((s, r) => s + parseFloat(r.amount), 0);
    const invoices = loadData(DB.invoices);
    const totalSales = invoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    
    document.getElementById('reportContent').innerHTML = `
        <div class="report-card">
            <div class="report-item"><span class="report-label">Total Pemasukan</span><span class="report-value positive">${formatRupiah(income)}</span></div>
            <div class="report-item"><span class="report-label">Total Pengeluaran</span><span class="report-value negative">${formatRupiah(expense)}</span></div>
            <div class="report-item"><span class="report-label">Laba Bersih</span><span class="report-value ${income-expense>=0?'positive':'negative'}">${formatRupiah(income-expense)}</span></div>
            <div class="report-item"><span class="report-label">Total Hutang</span><span class="report-value negative">${formatRupiah(debts)}</span></div>
            <div class="report-item"><span class="report-label">Total Piutang</span><span class="report-value positive">${formatRupiah(receivables)}</span></div>
            <div class="report-item"><span class="report-label">Total Penjualan (Invoice)</span><span class="report-value positive">${formatRupiah(totalSales)}</span></div>
        </div>`;
}

function updateWalletSelects() {
    const wallets = loadData(DB.wallets);
    const options = wallets.map(w => `<option value="${w.id}">${w.icon} ${w.name}</option>`).join('');
    ['transactionWallet', 'invoiceWallet', 'transferFrom', 'transferTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const current = el.value;
            el.innerHTML = (id === 'transferFrom' || id === 'transferTo') ? `<option value="">Pilih Dompet</option>${options}` : options;
            if (current) el.value = current;
        }
    });
}

// ==================== NAVIGATION ====================

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageName);
    if (page) page.classList.add('active');
    const navMap = { 'dashboard': 0, 'wallet': 1, 'invoice': 2, 'finance': 3, 'reports': 3, 'customer': 3, 'products': 3, 'debt': 3, 'receivable': 3, 'settings': 3 };
    const navItems = document.querySelectorAll('.nav-item');
    if (navMap[pageName] !== undefined && navItems[navMap[pageName]]) {
        navItems[navMap[pageName]].classList.add('active');
    }
    document.getElementById('mainHeader').style.display = pageName === 'settings' ? 'none' : 'block';
    renderAll();
    window.scrollTo(0, 0);
}

function switchFinanceTab(type) {
    document.querySelectorAll('#page-finance .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('finance-income').style.display = type === 'income' ? 'block' : 'none';
    document.getElementById('finance-expense').style.display = type === 'expense' ? 'block' : 'none';
}

function switchInvoiceTab(tab) {
    window.invoiceTab = tab;
    document.querySelectorAll('#page-invoice .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderInvoices();
}

function switchProductTab(type) {
    document.getElementById('productType').value = type;
    document.querySelectorAll('#page-products .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderProducts();
}

function switchReportTab(tab) {
    window.reportTab = tab;
    document.querySelectorAll('#page-reports .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderReports();
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ==================== THEME & SETTINGS ====================

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.getElementById('darkModeToggle').classList.toggle('active');
    const settings = loadData(DB.settings);
    settings.theme = next;
    saveData(DB.settings, settings);
}

function saveSettings() {
    const settings = {
        businessName: document.getElementById('settingBusinessName').value,
        whatsapp: document.getElementById('settingWhatsApp').value,
        address: document.getElementById('settingAddress').value,
        theme: document.documentElement.getAttribute('data-theme')
    };
    saveData(DB.settings, settings);
    alert('Pengaturan disimpan!');
    addActivity('Mengupdate pengaturan usaha');
}

function exportData() {
    const data = {};
    Object.values(DB).forEach(key => { data[key] = loadData(key); });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kasku-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addActivity('Export data');
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            Object.entries(data).forEach(([key, value]) => { localStorage.setItem(key, JSON.stringify(value)); });
            alert('Data berhasil diimport!');
            addActivity('Import data');
            recalculateAll();
            renderAll();
        } catch (err) {
            alert('File tidak valid!');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function resetData() {
    if (!confirm('Yakin reset SEMUA data? Ini tidak bisa dibatalkan!')) return;
    Object.values(DB).forEach(key => localStorage.removeItem(key));
    localStorage.setItem(DB.wallets, JSON.stringify(defaultWallets));
    localStorage.setItem(DB.settings, JSON.stringify(defaultSettings));
    addActivity('Reset semua data');
    recalculateAll();
    renderAll();
    alert('Data direset!');
}

// ==================== INVOICE DETAIL & PRINT ====================

function showInvoiceDetail(id) {
    currentInvoiceId = id;
    const inv = loadData(DB.invoices).find(i => i.id === id);
    if (!inv) return;
    const settings = loadData(DB.settings);
    
    let specsHtml = '';
    if (inv.type === 'print') {
        specsHtml = `<div class="invoice-section">
            <div class="invoice-section-title">Spesifikasi Buku</div>
            <p>Ukuran: ${inv.specs?.bookSize||'-'} | Jilid: ${inv.specs?.binding||'-'} | Ukuran Jadi: ${inv.specs?.finalSize||'-'}</p>
            <p>Kertas Isi: ${inv.specs?.paperType||'-'} | Cover: ${inv.specs?.coverType||'-'}</p>
            <p>Laminating: ${inv.specs?.laminating||'-'} | Wrapping: ${inv.specs?.wrapping||'-'}</p>
        </div>`;
    } else {
        specsHtml = `<div class="invoice-section">
            <div class="invoice-section-title">Spesifikasi Laptop</div>
            <p>${inv.specs?.laptopName||'-'} | ${inv.specs?.processor||'-'} | RAM: ${inv.specs?.ram||'-'}</p>
            <p>Storage: ${inv.specs?.storage||'-'} | Layar: ${inv.specs?.screen||'-'} | Kondisi: ${inv.specs?.condition||'-'}</p>
            <p>Garansi: ${inv.specs?.warranty||'-'}</p>
        </div>`;
    }
    
    const itemsHtml = inv.items?.map((item, i) => `
        <tr><td>${i+1}</td><td>${item.name}</td><td>${item.qty}</td><td>${formatRupiah(item.price)}</td><td>${formatRupiah(item.qty*item.price)}</td></tr>
    `).join('') || '';
    
    document.getElementById('invoiceDetailContent').innerHTML = `
        <div class="invoice-preview" id="printArea">
            <div class="invoice-header">
                <div class="invoice-logo">KB</div>
                <div class="invoice-title">${settings.businessName}</div>
                <div class="invoice-meta">${settings.address}<br>WA: ${settings.whatsapp}</div>
            </div>
            <div class="invoice-section">
                <div class="invoice-section-title">Invoice</div>
                <p><strong>${inv.number}</strong> | ${formatDate(inv.date)}</p>
            </div>
            <div class="invoice-section">
                <div class="invoice-section-title">Pelanggan</div>
                <p>${inv.customerName}<br>${inv.customerPhone||'-'}<br>${inv.customerAddress||'-'}</p>
            </div>
            ${specsHtml}
            <div class="invoice-section">
                <div class="invoice-section-title">Daftar Item</div>
                <table class="invoice-table">
                    <thead><tr><th>No</th><th>Item</th><th>Qty</th><th>Harga</th><th>Jumlah</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>
            <div class="invoice-total">
                <div class="invoice-total-row"><span>Total</span><span>${formatRupiah(inv.total)}</span></div>
                <div class="invoice-total-row"><span>DP</span><span>${formatRupiah(inv.dp)}</span></div>
                <div class="invoice-total-row final"><span>Sisa</span><span>${formatRupiah(inv.remaining)}</span></div>
            </div>
            <div style="margin-top:16px;text-align:center">
                <span class="badge ${inv.status==='Lunas'?'badge-success':inv.status==='DP'?'badge-warning':'badge-danger'}">${inv.status}</span>
            </div>
            <div style="margin-top:24px;text-align:center;font-size:12px;color:var(--text-secondary)">
                <p><strong>Metode Pembayaran:</strong></p>
                <p>SeaBank - Muhammad Aghisna - 901007430064</p>
                <p>BSI - Muhammad Aghisna - 7197202798</p>
                <p>DANA - Muhammad Aghisna - 085217706587</p>
                <p style="margin-top:8px">Pastikan nominal transfer sesuai invoice.<br>Kirim bukti transfer via WhatsApp.</p>
            </div>
        </div>`;
    openModal('invoiceDetailModal');
}

function printInvoice() {
    window.print();
}

function sendWhatsAppInvoice() {
    const inv = loadData(DB.invoices).find(i => i.id === currentInvoiceId);
    if (!inv) return;
    const settings = loadData(DB.settings);
    
    let text = `*${settings.businessName}*%0A%0A`;
    text += `*Invoice:* ${inv.number}%0A`;
    text += `*Tanggal:* ${formatDate(inv.date)}%0A%0A`;
    text += `*Pelanggan:*%0A${inv.customerName}%0A${inv.customerPhone||'-'}%0A${inv.customerAddress||'-'}%0A%0A`;
    
    if (inv.type === 'print') {
        text += `*Spesifikasi Buku:*%0A`;
        text += `Ukuran: ${inv.specs?.bookSize||'-'}%0AJilid: ${inv.specs?.binding||'-'}%0A`;
        text += `Kertas Isi: ${inv.specs?.paperType||'-'}%0ACover: ${inv.specs?.coverType||'-'}%0A`;
        text += `Laminating: ${inv.specs?.laminating||'-'}%0AWrapping: ${inv.specs?.wrapping||'-'}%0A%0A`;
    } else {
        text += `*Spesifikasi Laptop:*%0A`;
        text += `${inv.specs?.laptopName||'-'}%0A${inv.specs?.processor||'-'}%0ARAM: ${inv.specs?.ram||'-'}%0A`;
        text += `Storage: ${inv.specs?.storage||'-'}%0AKondisi: ${inv.specs?.condition||'-'}%0A%0A`;
    }
    
    text += `*Daftar Item:*%0A`;
    inv.items?.forEach((item, i) => {
        text += `${i+1}. ${item.name} x${item.qty} = ${formatRupiah(item.qty*item.price)}%0A`;
    });
    text += `%0A*Total:* ${formatRupiah(inv.total)}%0A`;
    text += `*DP:* ${formatRupiah(inv.dp)}%0A`;
    text += `*Sisa:* ${formatRupiah(inv.remaining)}%0A`;
    text += `*Status:* ${inv.status}%0A%0A`;
    text += `*Pembayaran:*%0ASeaBank: 901007430064%0ABSI: 7197202798%0ADANA: 085217706587%0A%0A`;
    text += `Terima kasih!`;
    
    window.open(`https://wa.me/${inv.customerPhone?.replace(/\D/g,'')||settings.whatsapp}?text=${text}`, '_blank');
}

function editCurrentInvoice() {
    closeModal('invoiceDetailModal');
    const inv = loadData(DB.invoices).find(i => i.id === currentInvoiceId);
    if (!inv) return;
    
    document.getElementById('invoiceId').value = inv.id;
    document.getElementById('invoiceType').value = inv.type;
    document.getElementById('invoiceModalTitle').textContent = 'Edit Invoice';
    document.getElementById('invoiceCustomerName').value = inv.customerName;
    document.getElementById('invoiceCustomerPhone').value = inv.customerPhone || '';
    document.getElementById('invoiceCustomerAddress').value = inv.customerAddress || '';
    document.getElementById('invoiceNote').value = inv.note || '';
    document.getElementById('invoiceTotal').value = inv.total;
    document.getElementById('invoiceDP').value = inv.dp;
    document.getElementById('invoiceRemaining').value = inv.remaining;
    document.getElementById('invoiceStatus').value = inv.status;
    
    document.getElementById('printSpecs').style.display = inv.type === 'print' ? 'block' : 'none';
    document.getElementById('laptopSpecs').style.display = inv.type === 'laptop' ? 'block' : 'none';
    
    if (inv.type === 'print') {
        document.getElementById('printBookSize').value = inv.specs?.bookSize || '';
        document.getElementById('printBinding').value = inv.specs?.binding || 'Lem Panas';
        document.getElementById('printFinalSize').value = inv.specs?.finalSize || '';
        document.getElementById('printPaperType').value = inv.specs?.paperType || '';
        document.getElementById('printCoverType').value = inv.specs?.coverType || '';
        document.getElementById('printLaminating').value = inv.specs?.laminating || 'Tidak';
        document.getElementById('printWrapping').value = inv.specs?.wrapping || 'Tidak';
    } else {
        document.getElementById('laptopName').value = inv.specs?.laptopName || '';
        document.getElementById('laptopProcessor').value = inv.specs?.processor || '';
        document.getElementById('laptopRam').value = inv.specs?.ram || '';
        document.getElementById('laptopStorage').value = inv.specs?.storage || '';
        document.getElementById('laptopScreen').value = inv.specs?.screen || '';
        document.getElementById('laptopCondition').value = inv.specs?.condition || 'Like New';
        document.getElementById('laptopWarranty').value = inv.specs?.warranty || '';
    }
    
    invoiceItems = inv.items ? JSON.parse(JSON.stringify(inv.items)) : [];
    renderInvoiceItems();
    openModal('invoiceModal');
}

// Jalankan saat halaman dimuat
document.addEventListener('DOMContentLoaded', init);
