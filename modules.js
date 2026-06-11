// ==================== TRANSACTION MODULE ====================

function openTransactionModal() {
    document.getElementById('transactionId').value = '';
    document.getElementById('transactionType').value = currentTransactionType;
    document.getElementById('transactionModalTitle').textContent = 'Tambah Transaksi';
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDesc').value = '';
    document.getElementById('transactionAmount').value = '';
    updateCategoryOptions();
    openModal('transactionModal');
}

function setTransactionType(type) {
    currentTransactionType = type;
    document.getElementById('transactionType').value = type;
    document.querySelectorAll('#transactionModal .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    updateCategoryOptions();
}

function updateCategoryOptions() {
    const type = document.getElementById('transactionType').value;
    const cats = type === 'income' ? incomeCategories : expenseCategories;
    document.getElementById('transactionCategory').innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function saveTransaction() {
    const id = document.getElementById('transactionId').value;
    const type = document.getElementById('transactionType').value;
    const date = document.getElementById('transactionDate').value;
    const category = document.getElementById('transactionCategory').value;
    const desc = document.getElementById('transactionDesc').value;
    const amount = parseFloat(document.getElementById('transactionAmount').value) || 0;
    const walletId = document.getElementById('transactionWallet').value;

    if (!date || !desc || amount <= 0 || !walletId) {
        alert('Lengkapi semua field!'); return;
    }

    const transactions = loadData(DB.transactions);
    if (id) {
        const idx = transactions.findIndex(t => t.id === id);
        if (idx >= 0) transactions[idx] = { ...transactions[idx], date, category, description: desc, amount, walletId };
    } else {
        transactions.push({ id: generateId(), type, date, category, description: desc, amount, walletId, createdAt: Date.now() });
    }

    saveData(DB.transactions, transactions);
    addActivity(`${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatRupiah(amount)} - ${desc}`);
    closeModal('transactionModal');
    recalculateAll();
    renderAll();
}

function editTransaction(id) {
    const t = loadData(DB.transactions).find(x => x.id === id);
    if (!t) return;
    document.getElementById('transactionId').value = t.id;
    document.getElementById('transactionType').value = t.type;
    document.getElementById('transactionDate').value = t.date;
    document.getElementById('transactionDesc').value = t.description;
    document.getElementById('transactionAmount').value = t.amount;
    document.getElementById('transactionWallet').value = t.walletId;
    updateCategoryOptions();
    document.getElementById('transactionCategory').value = t.category;
    document.getElementById('transactionModalTitle').textContent = 'Edit Transaksi';
    openModal('transactionModal');
}

function deleteTransaction(id) {
    if (!confirm('Hapus transaksi ini?')) return;
    const transactions = loadData(DB.transactions).filter(t => t.id !== id);
    saveData(DB.transactions, transactions);
    addActivity('Menghapus transaksi');
    recalculateAll();
    renderAll();
}

// ==================== WALLET MODULE ====================

function openWalletModal() {
    document.getElementById('walletId').value = '';
    document.getElementById('walletName').value = '';
    document.getElementById('walletModalTitle').textContent = 'Tambah Dompet';
    openModal('walletModal');
}

function saveWallet() {
    const id = document.getElementById('walletId').value;
    const name = document.getElementById('walletName').value;
    const icon = document.getElementById('walletIcon').value;
    if (!name) { alert('Nama dompet wajib diisi!'); return; }

    const wallets = loadData(DB.wallets);
    if (id) {
        const idx = wallets.findIndex(w => w.id === id);
        if (idx >= 0) wallets[idx] = { ...wallets[idx], name, icon };
    } else {
        wallets.push({ id: generateId(), name, icon, balance: 0, createdAt: Date.now() });
    }
    saveData(DB.wallets, wallets);
    addActivity(id ? 'Mengupdate dompet' : 'Menambah dompet baru');
    closeModal('walletModal');
    recalculateAll();
    renderAll();
}

function editWallet(id) {
    const w = loadData(DB.wallets).find(x => x.id === id);
    if (!w) return;
    document.getElementById('walletId').value = w.id;
    document.getElementById('walletName').value = w.name;
    document.getElementById('walletIcon').value = w.icon;
    document.getElementById('walletModalTitle').textContent = 'Edit Dompet';
    openModal('walletModal');
}

function deleteWallet(id) {
    const transactions = loadData(DB.transactions);
    if (transactions.some(t => t.walletId === id)) {
        alert('Dompet ini memiliki transaksi. Hapus transaksi terlebih dahulu!'); return;
    }
    if (!confirm('Hapus dompet ini?')) return;
    saveData(DB.wallets, loadData(DB.wallets).filter(w => w.id !== id));
    addActivity('Menghapus dompet');
    recalculateAll();
    renderAll();
}

function openTransferModal(fromId) {
    document.getElementById('transferFrom').value = fromId || '';
    document.getElementById('transferTo').value = '';
    document.getElementById('transferAmount').value = '';
    document.getElementById('transferDesc').value = '';
    openModal('transferModal');
}

function saveTransfer() {
    const fromId = document.getElementById('transferFrom').value;
    const toId = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value) || 0;
    const desc = document.getElementById('transferDesc').value;
    if (!fromId || !toId || fromId === toId || amount <= 0) {
        alert('Pilih dompet asal dan tujuan yang berbeda dengan nominal valid!'); return;
    }
    const transactions = loadData(DB.transactions);
    const ts = Date.now();
    const fromName = document.querySelector(`#transferFrom option[value="${fromId}"]`)?.textContent || '';
    const toName = document.querySelector(`#transferTo option[value="${toId}"]`)?.textContent || '';
    
    transactions.push({ id: generateId(), type: 'transfer_out', date: new Date().toISOString().split('T')[0], category: 'Transfer Keluar', description: `Transfer ke ${toName} - ${desc}`, amount, walletId: fromId, createdAt: ts });
    transactions.push({ id: generateId(), type: 'transfer_in', date: new Date().toISOString().split('T')[0], category: 'Transfer Masuk', description: `Transfer dari ${fromName} - ${desc}`, amount, walletId: toId, createdAt: ts + 1 });
    
    saveData(DB.transactions, transactions);
    addActivity(`Transfer ${formatRupiah(amount)} antar dompet`);
    closeModal('transferModal');
    recalculateAll();
    renderAll();
}

// ==================== CUSTOMER MODULE ====================

function openCustomerModal() {
    document.getElementById('customerId').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('customerNote').value = '';
    document.getElementById('customerModalTitle').textContent = 'Tambah Pelanggan';
    openModal('customerModal');
}

function saveCustomer() {
    const id = document.getElementById('customerId').value;
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;
    const note = document.getElementById('customerNote').value;
    if (!name) { alert('Nama pelanggan wajib diisi!'); return; }
    
    const customers = loadData(DB.customers);
    if (id) {
        const idx = customers.findIndex(c => c.id === id);
        if (idx >= 0) customers[idx] = { ...customers[idx], name, phone, address, note };
    } else {
        customers.push({ id: generateId(), name, phone, address, note, createdAt: Date.now() });
    }
    saveData(DB.customers, customers);
    addActivity(id ? 'Mengupdate pelanggan' : 'Menambah pelanggan baru');
    closeModal('customerModal');
    renderAll();
}

function editCustomer(id) {
    const c = loadData(DB.customers).find(x => x.id === id);
    if (!c) return;
    document.getElementById('customerId').value = c.id;
    document.getElementById('customerName').value = c.name;
    document.getElementById('customerPhone').value = c.phone;
    document.getElementById('customerAddress').value = c.address;
    document.getElementById('customerNote').value = c.note || '';
    document.getElementById('customerModalTitle').textContent = 'Edit Pelanggan';
    openModal('customerModal');
}

function deleteCustomer(id) {
    if (loadData(DB.invoices).some(i => i.customerId === id)) {
        alert('Pelanggan ini memiliki invoice. Hapus invoice terlebih dahulu!'); return;
    }
    if (!confirm('Hapus pelanggan ini?')) return;
    saveData(DB.customers, loadData(DB.customers).filter(c => c.id !== id));
    addActivity('Menghapus pelanggan');
    renderAll();
}

// ==================== PRODUCT MODULE ====================

function openProductModal() {
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productModalTitle').textContent = 'Tambah Item';
    openModal('productModal');
}

function saveProduct() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const type = document.getElementById('productType').value;
    if (!name) { alert('Nama item wajib diisi!'); return; }
    
    const products = loadData(DB.products);
    if (id) {
        const idx = products.findIndex(p => p.id === id);
        if (idx >= 0) products[idx] = { ...products[idx], name, category, price, type };
    } else {
        products.push({ id: generateId(), name, category, price, type, createdAt: Date.now() });
    }
    saveData(DB.products, products);
    addActivity(id ? 'Mengupdate produk/jasa' : 'Menambah produk/jasa baru');
    closeModal('productModal');
    renderAll();
}

function editProduct(id) {
    const p = loadData(DB.products).find(x => x.id === id);
    if (!p) return;
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productModalTitle').textContent = 'Edit Item';
    openModal('productModal');
}

function deleteProduct(id) {
    if (!confirm('Hapus item ini?')) return;
    saveData(DB.products, loadData(DB.products).filter(p => p.id !== id));
    addActivity('Menghapus produk/jasa');
    renderAll();
}

// ==================== DEBT MODULE ====================

function openDebtModal() {
    document.getElementById('debtId').value = '';
    document.getElementById('debtName').value = '';
    document.getElementById('debtPhone').value = '';
    document.getElementById('debtAmount').value = '';
    document.getElementById('debtDesc').value = '';
    document.getElementById('debtDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('debtDue').value = new Date().toISOString().split('T')[0];
    document.getElementById('debtModalTitle').textContent = 'Tambah Hutang';
    openModal('debtModal');
}

function saveDebt() {
    const id = document.getElementById('debtId').value;
    const name = document.getElementById('debtName').value;
    const phone = document.getElementById('debtPhone').value;
    const amount = parseFloat(document.getElementById('debtAmount').value) || 0;
    const desc = document.getElementById('debtDesc').value;
    const date = document.getElementById('debtDate').value;
    const dueDate = document.getElementById('debtDue').value;
    if (!name || amount <= 0) { alert('Nama dan nominal wajib diisi!'); return; }
    
    const debts = loadData(DB.debts);
    if (id) {
        const idx = debts.findIndex(d => d.id === id);
        if (idx >= 0) debts[idx] = { ...debts[idx], name, phone, amount, description: desc, date, dueDate };
    } else {
        debts.push({ id: generateId(), name, phone, amount, description: desc, date, dueDate, status: 'Belum Lunas', createdAt: Date.now() });
    }
    saveData(DB.debts, debts);
    addActivity(id ? 'Mengupdate hutang' : 'Menambah hutang baru');
    closeModal('debtModal');
    recalculateAll();
    renderAll();
}

function editDebt(id) {
    const d = loadData(DB.debts).find(x => x.id === id);
    if (!d) return;
    document.getElementById('debtId').value = d.id;
    document.getElementById('debtName').value = d.name;
    document.getElementById('debtPhone').value = d.phone;
    document.getElementById('debtAmount').value = d.amount;
    document.getElementById('debtDesc').value = d.description || '';
    document.getElementById('debtDate').value = d.date;
    document.getElementById('debtDue').value = d.dueDate;
    document.getElementById('debtModalTitle').textContent = 'Edit Hutang';
    openModal('debtModal');
}

function deleteDebt(id) {
    if (!confirm('Hapus hutang ini?')) return;
    saveData(DB.debts, loadData(DB.debts).filter(d => d.id !== id));
    addActivity('Menghapus hutang');
    recalculateAll();
    renderAll();
}

function payDebt(id) {
    const debts = loadData(DB.debts);
    const debt = debts.find(d => d.id === id);
    if (!debt) return;
    const wallets = loadData(DB.wallets);
    const walletName = prompt(`Pilih dompet untuk pembayaran hutang ${formatRupiah(debt.amount)}:\n\n${wallets.map((w, i) => `${i + 1}. ${w.name}`).join('\n')}\n\nMasukkan nama dompet:`);
    if (!walletName) return;
    const selectedWallet = wallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
    if (!selectedWallet) { alert('Dompet tidak ditemukan!'); return; }
    if (selectedWallet.balance < debt.amount) { alert('Saldo dompet tidak mencukupi!'); return; }
    
    const transactions = loadData(DB.transactions);
    transactions.push({ id: generateId(), type: 'expense', date: new Date().toISOString().split('T')[0], category: 'Bayar Hutang', description: `Pembayaran hutang ke ${debt.name}`, amount: debt.amount, walletId: selectedWallet.id, createdAt: Date.now() });
    debt.status = 'Lunas';
    debt.paidAt = new Date().toISOString().split('T')[0];
    debt.paidWalletId = selectedWallet.id;
    
    saveData(DB.transactions, transactions);
    saveData(DB.debts, debts);
    addActivity(`Membayar hutang ${debt.name} ${formatRupiah(debt.amount)}`);
    recalculateAll();
    renderAll();
}

// ==================== RECEIVABLE MODULE ====================

function openReceivableModal() {
    document.getElementById('receivableId').value = '';
    document.getElementById('receivableName').value = '';
    document.getElementById('receivablePhone').value = '';
    document.getElementById('receivableAmount').value = '';
    document.getElementById('receivableDesc').value = '';
    document.getElementById('receivableDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('receivableDue').value = new Date().toISOString().split('T')[0];
    document.getElementById('receivableModalTitle').textContent = 'Tambah Piutang';
    openModal('receivableModal');
}

function saveReceivable() {
    const id = document.getElementById('receivableId').value;
    const name = document.getElementById('receivableName').value;
    const phone = document.getElementById('receivablePhone').value;
    const amount = parseFloat(document.getElementById('receivableAmount').value) || 0;
    const desc = document.getElementById('receivableDesc').value;
    const date = document.getElementById('receivableDate').value;
    const dueDate = document.getElementById('receivableDue').value;
    if (!name || amount <= 0) { alert('Nama dan nominal wajib diisi!'); return; }
    
    const receivables = loadData(DB.receivables);
    if (id) {
        const idx = receivables.findIndex(r => r.id === id);
        if (idx >= 0) receivables[idx] = { ...receivables[idx], name, phone, amount, description: desc, date, dueDate };
    } else {
        receivables.push({ id: generateId(), name, phone, amount, description: desc, date, dueDate, status: 'Belum Lunas', createdAt: Date.now() });
    }
    saveData(DB.receivables, receivables);
    addActivity(id ? 'Mengupdate piutang' : 'Menambah piutang baru');
    closeModal('receivableModal');
    recalculateAll();
    renderAll();
}

function editReceivable(id) {
    const r = loadData(DB.receivables).find(x => x.id === id);
    if (!r) return;
    document.getElementById('receivableId').value = r.id;
    document.getElementById('receivableName').value = r.name;
    document.getElementById('receivablePhone').value = r.phone;
    document.getElementById('receivableAmount').value = r.amount;
    document.getElementById('receivableDesc').value = r.description || '';
    document.getElementById('receivableDate').value = r.date;
    document.getElementById('receivableDue').value = r.dueDate;
    document.getElementById('receivableModalTitle').textContent = 'Edit Piutang';
    openModal('receivableModal');
}

function deleteReceivable(id) {
    if (!confirm('Hapus piutang ini?')) return;
    saveData(DB.receivables, loadData(DB.receivables).filter(r => r.id !== id));
    addActivity('Menghapus piutang');
    recalculateAll();
    renderAll();
}

function payReceivable(id) {
    const receivables = loadData(DB.receivables);
    const rec = receivables.find(r => r.id === id);
    if (!rec) return;
    const wallets = loadData(DB.wallets);
    const walletName = prompt(`Pilih dompet untuk menerima pembayaran piutang ${formatRupiah(rec.amount)}:\n\n${wallets.map((w, i) => `${i + 1}. ${w.name}`).join('\n')}\n\nMasukkan nama dompet:`);
    if (!walletName) return;
    const selectedWallet = wallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
    if (!selectedWallet) { alert('Dompet tidak ditemukan!'); return; }
    
    const transactions = loadData(DB.transactions);
    transactions.push({ id: generateId(), type: 'income', date: new Date().toISOString().split('T')[0], category: 'Pembayaran Piutang', description: `Penerimaan piutang dari ${rec.name}`, amount: rec.amount, walletId: selectedWallet.id, createdAt: Date.now() });
    rec.status = 'Lunas';
    rec.receivedAt = new Date().toISOString().split('T')[0];
    rec.receivedWalletId = selectedWallet.id;
    
    saveData(DB.transactions, transactions);
    saveData(DB.receivables, receivables);
    addActivity(`Menerima piutang ${rec.name} ${formatRupiah(rec.amount)}`);
    recalculateAll();
    renderAll();
}

// ==================== INVOICE MODULE ====================

function openInvoiceTypeModal() {
    openModal('invoiceTypeModal');
}

function openInvoiceModal(type) {
    closeModal('invoiceTypeModal');
    document.getElementById('invoiceId').value = '';
    document.getElementById('invoiceType').value = type;
    document.getElementById('invoiceModalTitle').textContent = 'Invoice Baru';
    document.getElementById('invoiceCustomer').value = '';
    document.getElementById('invoiceCustomerName').value = '';
    document.getElementById('invoiceCustomerPhone').value = '';
    document.getElementById('invoiceCustomerAddress').value = '';
    document.getElementById('invoiceNote').value = '';
    document.getElementById('invoiceTotal').value = '0';
    document.getElementById('invoiceDP').value = '0';
    document.getElementById('invoiceRemaining').value = '0';
    document.getElementById('invoiceStatus').value = 'Belum Lunas';
    
    const customers = loadData(DB.customers);
    document.getElementById('invoiceCustomer').innerHTML = '<option value="">Pilih Pelanggan</option>' + customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('printSpecs').style.display = type === 'print' ? 'block' : 'none';
    document.getElementById('laptopSpecs').style.display = type === 'laptop' ? 'block' : 'none';
    invoiceItems = [];
    renderInvoiceItems();
    openModal('invoiceModal');
}

function fillCustomerData() {
    const customerId = document.getElementById('invoiceCustomer').value;
    if (!customerId) return;
    const customer = loadData(DB.customers).find(c => c.id === customerId);
    if (customer) {
        document.getElementById('invoiceCustomerName').value = customer.name;
        document.getElementById('invoiceCustomerPhone').value = customer.phone || '';
        document.getElementById('invoiceCustomerAddress').value = customer.address || '';
    }
}

function addInvoiceItem() {
    invoiceItems.push({ id: generateId(), name: '', qty: 1, price: 0 });
    renderInvoiceItems();
}

function removeInvoiceItem(itemId) {
    invoiceItems = invoiceItems.filter(i => i.id !== itemId);
    renderInvoiceItems();
}

function updateInvoiceItem(id, field, value) {
    const item = invoiceItems.find(i => i.id === id);
    if (item) {
        item[field] = field === 'name' ? value : parseFloat(value) || 0;
        renderInvoiceItems();
    }
}

function renderInvoiceItems() {
    const container = document.getElementById('invoiceItems');
    if (invoiceItems.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:20px">Belum ada item. Klik "Tambah Item".</p>';
    } else {
        container.innerHTML = invoiceItems.map(item => `
            <div style="display:grid;grid-template-columns:1fr 60px 100px 100px 40px;gap:8px;margin-bottom:8px;align-items:center">
                <input type="text" class="form-input" placeholder="Nama item" value="${item.name}" onchange="updateInvoiceItem('${item.id}','name',this.value)" style="font-size:13px;padding:8px">
                <input type="number" class="form-input" placeholder="Qty" value="${item.qty}" onchange="updateInvoiceItem('${item.id}','qty',this.value)" style="font-size:13px;padding:8px">
                <input type="number" class="form-input" placeholder="Harga" value="${item.price}" onchange="updateInvoiceItem('${item.id}','price',this.value)" style="font-size:13px;padding:8px">
                <div style="font-size:13px;font-weight:600">${formatRupiah(item.qty * item.price)}</div>
                <button onclick="removeInvoiceItem('${item.id}')" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--danger)">🗑️</button>
            </div>`).join('');
    }
    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    const total = invoiceItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const dp = parseFloat(document.getElementById('invoiceDP').value) || 0;
    document.getElementById('invoiceTotal').value = total;
    document.getElementById('invoiceRemaining').value = total - dp;
}

function saveInvoice() {
    const id = document.getElementById('invoiceId').value;
    const type = document.getElementById('invoiceType').value;
    const customerId = document.getElementById('invoiceCustomer').value;
    const customerName = document.getElementById('invoiceCustomerName').value;
    const customerPhone = document.getElementById('invoiceCustomerPhone').value;
    const customerAddress = document.getElementById('invoiceCustomerAddress').value;
    const total = parseFloat(document.getElementById('invoiceTotal').value) || 0;
    const dp = parseFloat(document.getElementById('invoiceDP').value) || 0;
    const status = document.getElementById('invoiceStatus').value;
    const walletId = document.getElementById('invoiceWallet').value;
    
    if (!customerName || total <= 0) { alert('Nama pelanggan dan total invoice wajib diisi!'); return; }
    if ((status === 'Lunas' || status === 'DP') && !walletId) { alert('Pilih dompet penerima untuk DP/Lunas!'); return; }
    
    const invoices = loadData(DB.invoices);
    const transactions = loadData(DB.transactions);
    const now = Date.now();
    
    let invoiceData = {
        type, customerId, customerName, customerPhone, customerAddress,
        total, dp, remaining: total - dp, status, walletId,
        items: JSON.parse(JSON.stringify(invoiceItems)),
        note: document.getElementById('invoiceNote').value,
        date: new Date().toISOString().split('T')[0],
        createdAt: now
    };
    
    if (type === 'print') {
        invoiceData.specs = {
            bookSize: document.getElementById('printBookSize').value,
            binding: document.getElementById('printBinding').value,
            finalSize: document.getElementById('printFinalSize').value,
            paperType: document.getElementById('printPaperType').value,
            coverType: document.getElementById('printCoverType').value,
            laminating: document.getElementById('printLaminating').value,
            wrapping: document.getElementById('printWrapping').value
        };
    } else {
        invoiceData.specs = {
            laptopName: document.getElementById('laptopName').value,
            processor: document.getElementById('laptopProcessor').value,
            ram: document.getElementById('laptopRam').value,
            storage: document.getElementById('laptopStorage').value,
            screen: document.getElementById('laptopScreen').value,
            condition: document.getElementById('laptopCondition').value,
            warranty: document.getElementById('laptopWarranty').value
        };
    }
    
    let inv;
    if (id) {
        const idx = invoices.findIndex(i => i.id === id);
        if (idx >= 0) {
            const oldInvoice = invoices[idx];
            const oldTransIds = oldInvoice.transactionIds || [];
            const filteredTrans = transactions.filter(t => !oldTransIds.includes(t.id));
            invoices[idx] = { ...oldInvoice, ...invoiceData, id: oldInvoice.id, number: oldInvoice.number, transactionIds: [] };
            saveData(DB.transactions, filteredTrans);
            inv = invoices[idx];
        }
    } else {
        invoiceData.id = generateId();
        invoiceData.number = generateInvoiceNumber();
        invoiceData.transactionIds = [];
        invoices.push(invoiceData);
        inv = invoiceData;
    }
    
    inv.transactionIds = inv.transactionIds || [];
    
    if ((status === 'DP' || status === 'Lunas') && dp > 0) {
        const dpTrans = { id: generateId(), type: 'income', date: inv.date, category: 'DP Invoice', description: `DP Invoice ${inv.number} - ${customerName}`, amount: dp, walletId, invoiceId: inv.id, createdAt: now };
        transactions.push(dpTrans);
        inv.transactionIds.push(dpTrans.id);
    }
    if (status === 'Lunas' && inv.remaining > 0) {
        const pelunasanTrans = { id: generateId(), type: 'income', date: inv.date, category: 'Pelunasan Invoice', description: `Pelunasan Invoice ${inv.number} - ${customerName}`, amount: inv.remaining, walletId, invoiceId: inv.id, createdAt: now + 1 };
        transactions.push(pelunasanTrans);
        inv.transactionIds.push(pelunasanTrans.id);
    }
    
    saveData(DB.invoices, invoices);
    saveData(DB.transactions, transactions);
    addActivity(id ? `Mengupdate invoice ${inv.number}` : `Membuat invoice baru ${inv.number}`);
    closeModal('invoiceModal');
    recalculateAll();
    renderAll();
}

