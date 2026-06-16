/**
 * En-Tech S.C - Smart Warehouse Inventory System
 * Client-side State Machine & API Router Controllers
 */

// --- GLOBAL APP STATE ---
const STATE = {
  user: null,                 // Logged in user details
  token: null,                // Authorization token
  currentTab: 'dashboard',    // Active viewport tab
  company: {},                // Company configuration
  products: [],
  orders: [],
  categories: [],
  brands: [],
  stores: [],
  attributes: [],
  users: [],
  groups: [],
  auditLogs: [],
  stats: {},
  chart: null,                // ChartJS instance
  activeInvoiceLineCount: 0   // Helper for order creation modal lines
};

const ALL_PERMISSIONS = [
  { id: 'manage_system_config', label: 'Manage System Configurations' },
  { id: 'manage_users', label: 'Register & Edit Employees' },
  { id: 'manage_groups', label: 'Configure Permission Groups' },
  { id: 'manage_brands', label: 'Modify Brand Registry' },
  { id: 'manage_categories', label: 'Modify Category Classifications' },
  { id: 'manage_stores', label: 'Manage Warehouses/Stores' },
  { id: 'manage_attributes', label: 'Manage Sizing Specs Parameters' },
  { id: 'manage_products', label: 'Add/Edit Catalog Products' },
  { id: 'manage_orders', label: 'Place Sales & Purchase Orders' },
  { id: 'view_reports', label: 'Access Executive Dashboard Reports' },
  { id: 'manage_company', label: 'Edit Corporate Company Settings' },
  { id: 'view_profile', label: 'View Own Personal profile' }
];

// --- SETUP INITIALIZER ---
document.addEventListener('DOMContentLoaded', async () => {
  // Try retrieving credentials session from local storage to allow stateful persistency
  const savedUser = localStorage.getItem('entech_user');
  const savedToken = localStorage.getItem('entech_token');

  if (savedUser && savedToken) {
    STATE.user = JSON.parse(savedUser);
    STATE.token = savedToken;
    document.getElementById('app-loading').classList.add('hidden');
    document.getElementById('system-shell').classList.remove('hidden');
    
    // Set user info in UI
    document.getElementById('user-name').innerText = STATE.user.name;
    document.getElementById('user-role-badge').innerText = STATE.user.role;
    if (STATE.user.avatar) {
      document.getElementById('user-avatar').src = STATE.user.avatar;
    }
    
    applyRoleBasedUIGard();
    await fetchSyncDatabase();
    
    // Hash router startup
    handleRouting();
  } else {
    // Show login screen
    document.getElementById('app-loading').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
  }

  // Bind forms & links static event listeners
  setupEventListeners();
  
  // Realtime clock activation
  setInterval(updateLiveClock, 1000);
  updateLiveClock();
});

// --- DYNAMIC PERMISSIONS VISIBILITY GARD ---
function applyRoleBasedUIGard() {
  const role = STATE.user?.role;
  const isOperator = role === 'user';
  
  // Operators cannot manage users, groups, settings, company configs or audit logs
  if (isOperator) {
    document.getElementById('section-administration')?.classList.add('hidden');
    document.querySelector('[data-tab="users"]')?.classList.add('hidden');
    document.querySelector('[data-tab="audit-logs"]')?.classList.add('hidden');
    document.querySelector('[data-tab="company"]')?.classList.add('hidden');
    
    // Disable creating category/brand/store/attribute registers
    const addBtns = document.querySelectorAll('#tab-categories button, #tab-brands button, #tab-stores button, #tab-attributes button');
    addBtns.forEach(btn => btn.classList.add('hidden'));
  } else {
    document.getElementById('section-administration')?.classList.remove('hidden');
    document.querySelector('[data-tab="users"]')?.classList.remove('hidden');
    document.querySelector('[data-tab="audit-logs"]')?.classList.remove('hidden');
    document.querySelector('[data-tab="company"]')?.classList.remove('hidden');
  }
}

// --- CLOCK CONTROLLER ---
function updateLiveClock() {
  const options = { 
    timeZoneName: 'short', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  document.getElementById('live-clock').innerText = formatter.format(new Date()) + " UTC";
}

// --- DYNAMIC IN-APP TOAST SHELL ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toastId = 'toast_' + Date.now();
  
  let bgClass = 'bg-white border-slate-200 text-slate-800';
  let icon = '<i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-500"></i>';
  
  if (type === 'success') {
    bgClass = 'bg-slate-900 border-slate-800 text-white';
    icon = '<i data-lucide="check" class="w-5 h-5 text-emerald-400"></i>';
  } else if (type === 'error') {
    bgClass = 'bg-red-950 border-red-900 text-red-200';
    icon = '<i data-lucide="alert-circle" class="w-5 h-5 text-red-400"></i>';
  } else if (type === 'warn') {
    bgClass = 'bg-amber-950 border-amber-900 text-amber-200';
    icon = '<i data-lucide="alert-triangle" class="w-5 h-5 text-amber-500"></i>';
  }
  
  const toastHtml = `
    <div id="${toastId}" class="flex items-center gap-3 p-4 rounded-xl border shadow-xl ${bgClass} translate-y-2 opacity-0 transition-all duration-300">
      <div class="flex-shrink-0">${icon}</div>
      <div class="text-xs font-semibold flex-1">${message}</div>
      <button onclick="document.getElementById('${toastId}').remove()" class="text-slate-400 hover:text-white transition">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', toastHtml);
  lucide.createIcons();
  
  const toastEl = document.getElementById(toastId);
  setTimeout(() => {
    toastEl.classList.remove('translate-y-2', 'opacity-0');
  }, 10);
  
  setTimeout(() => {
    if (toastEl) {
      toastEl.classList.add('opacity-0', 'translate-x-4');
      setTimeout(() => toastEl.remove(), 300);
    }
  }, 4000);
}

// --- COMPREHENSIVE REFRESH SYNCHRONIZER ---
async function fetchSyncDatabase() {
  try {
    const fetchPromises = [
      fetch('/api/products').then(res => res.json()),
      fetch('/api/orders').then(res => res.json()),
      fetch('/api/categories').then(res => res.json()),
      fetch('/api/brands').then(res => res.json()),
      fetch('/api/stores').then(res => res.json()),
      fetch('/api/attributes').then(res => res.json()),
      fetch('/api/users').then(res => res.json()),
      fetch('/api/groups').then(res => res.json()),
      fetch('/api/company').then(res => res.json()),
      fetch('/api/audit-logs').then(res => res.json()),
      fetch('/api/stats').then(res => res.json())
    ];

    const [
      products, orders, categories, brands, stores, 
      attributes, users, groups, company, auditLogs, stats
    ] = await Promise.all(fetchPromises);

    STATE.products = products;
    STATE.orders = orders;
    STATE.categories = categories;
    STATE.brands = brands;
    STATE.stores = stores;
    STATE.attributes = attributes;
    STATE.users = users;
    STATE.groups = groups;
    STATE.company = company;
    STATE.auditLogs = auditLogs;
    STATE.stats = stats;

    // Refresh UI indicators
    document.getElementById('badge-total-products').innerText = products.length;
    document.getElementById('badge-total-orders').innerText = orders.length;
    document.getElementById('header-low-count').innerText = stats.lowStockCount || 0;

    // Render relevant workspace elements
    hydrateFilterDropdowns();
    renderActiveTabContent();
    lucide.createIcons();
  } catch (error) {
    console.error("Database sync failed:", error);
    showToast("Corporate DB synchronization failed. Contact system administrator.", "error");
  }
}

// --- ROUTER SYSTEM CONTROLLERS ---
function handleRouting() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  switchTab(hash);
}

function switchTab(tabId) {
  if (!STATE.user) {
    return; // Block routing to tabs if not authorized!
  }
  
  // Guard access to admin tabs for developers/staff
  const isOperator = STATE.user.role === 'user';
  if (isOperator && ['users', 'audit-logs', 'company'].includes(tabId)) {
    tabId = 'dashboard';
    window.location.hash = '#dashboard';
  }

  STATE.currentTab = tabId;
  
  // Manage links colors in sidebar
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const isTarget = link.getAttribute('data-tab') === tabId;
    if (isTarget) {
      link.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/10');
      link.classList.remove('text-slate-300', 'hover:bg-slate-800');
    } else {
      link.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/10');
      link.classList.add('text-slate-300', 'hover:bg-slate-800');
    }
  });

  // Toggle View Layout Container
  document.querySelectorAll('.tab-content').forEach(view => {
    if (view.id === `tab-${tabId}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  renderActiveTabContent();
  lucide.createIcons();
}

function renderActiveTabContent() {
  const tab = STATE.currentTab;
  if (tab === 'dashboard') {
    renderDashboard();
  } else if (tab === 'products') {
    renderProducts();
  } else if (tab === 'orders') {
    renderOrders();
  } else if (tab === 'categories') {
    renderCategories();
  } else if (tab === 'brands') {
    renderBrands();
  } else if (tab === 'stores') {
    renderStores();
  } else if (tab === 'attributes') {
    renderAttributes();
  } else if (tab === 'users') {
    renderUsers();
  } else if (tab === 'audit-logs') {
    renderAuditLogs();
  } else if (tab === 'company') {
    renderCompanyConfig();
  }
}

// --- DROPDOWN METADATA HYDRATOR ---
function hydrateFilterDropdowns() {
  const bSelect = document.getElementById('filter-brand');
  const cSelect = document.getElementById('filter-category');
  const sSelect = document.getElementById('filter-store');

  if (bSelect) {
    bSelect.innerHTML = '<option value="">All Brands</option>';
    STATE.brands.forEach(b => {
      bSelect.insertAdjacentHTML('beforeend', `<option value="${b.id}">${b.name}</option>`);
    });
  }
  if (cSelect) {
    cSelect.innerHTML = '<option value="">All Categories</option>';
    STATE.categories.forEach(c => {
      cSelect.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
    });
  }
  if (sSelect) {
    sSelect.innerHTML = '<option value="">All Warehouse Locations</option>';
    STATE.stores.forEach(s => {
      sSelect.insertAdjacentHTML('beforeend', `<option value="${s.id}">${s.name}</option>`);
    });
  }
}

// --- VIEWPORT WATERMARKS: RENDER DASHBOARD ---
function renderDashboard() {
  const s = STATE.stats;
  const currencySymbol = STATE.company?.currency === 'ETB' ? 'Br ' : '$';

  document.getElementById('stat-sku').innerText = s.totalProducts || 0;
  document.getElementById('stat-low').innerText = s.lowStockCount || 0;
  document.getElementById('stat-sales').innerText = currencySymbol + (s.totalSalesValue || '0.00');
  document.getElementById('stat-purchase').innerText = currencySymbol + (s.totalPurchaseValue || '0.00');

  // Load Alerts
  const alertContainer = document.getElementById('dashboard-low-stock-list');
  const lowStockProducts = STATE.products.filter(p => p.qty < 10 && p.status === 'active');
  
  if (lowStockProducts.length === 0) {
    alertContainer.innerHTML = '<div class="text-center py-8 text-xs text-slate-400 italic">No low stock items reported. Good job!</div>';
  } else {
    alertContainer.innerHTML = '';
    lowStockProducts.forEach(p => {
      const pStore = STATE.stores.find(st => st.id === p.storeId)?.name || 'Unknown Warehouse';
      const warningHtml = `
        <div class="p-3 bg-red-50 hover:bg-red-100/60 border border-red-150 rounded-xl flex items-center justify-between text-xs transition">
          <div class="min-w-0 pr-2">
            <h4 class="font-bold text-slate-800 truncate">${p.name}</h4>
            <p class="text-[10px] text-slate-500 font-medium truncate mt-0.5">${pStore} • SKU: ${p.sku}</p>
          </div>
          <span class="px-2.5 py-1 bg-red-100 text-red-700 rounded-md font-mono font-black text-center flex-shrink-0">${p.qty} left</span>
        </div>
      `;
      alertContainer.insertAdjacentHTML('beforeend', warningHtml);
    });
  }

  // Hydrate Chart.js Comparability Graphs
  renderDashboardChart(s.yearlyChartData || []);
}

function renderDashboardChart(chartData) {
  const ctx = document.getElementById('corporateChartCanvas').getContext('2d');
  
  if (STATE.chart) {
    STATE.chart.destroy();
  }

  const months = chartData.map(d => d.month);
  const salesData = chartData.map(d => d.sales);
  const purchasesData = chartData.map(d => d.purchases);

  STATE.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Client Invoice Sales Revenue ($)',
          data: salesData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: 'rgb(16,185,129)',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Supplier Stock Orders Expenses ($)',
          data: purchasesData,
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          borderColor: 'rgb(99,102,241)',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: 'Inter', size: 10, weight: 'bold' },
            color: '#475569'
          }
        }
      },
      scales: {
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.5)' },
          ticks: {
            font: { family: 'Fira Code', size: 9 },
            color: '#64748b'
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Inter', size: 10, weight: 'semibold' },
            color: '#475569'
          }
        }
      }
    }
  });
}

// --- RENDER PRODUCTS TAB ---
function renderProducts() {
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '';

  const searchVal = document.getElementById('product-search').value.toLowerCase();
  const brandVal = document.getElementById('filter-brand').value;
  const catVal = document.getElementById('filter-category').value;
  const storeVal = document.getElementById('filter-store').value;
  const currencySymbol = STATE.company?.currency === 'ETB' ? 'Br ' : '$';

  let filtered = STATE.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchVal) || 
                          p.sku.toLowerCase().includes(searchVal) || 
                          (p.barcode && p.barcode.includes(searchVal));
    const matchesBrand = !brandVal || p.brandId === brandVal;
    const matchesCategory = !catVal || p.categoryId === catVal;
    const matchesStore = !storeVal || p.storeId === storeVal;
    return matchesSearch && matchesBrand && matchesCategory && matchesStore;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
       <td colspan="7" class="px-6 py-12 text-center text-slate-400 italic text-xs">No catalog products match current search parameter.</td>
      </tr>
    `;
    return;
  }

  filtered.forEach(p => {
    const brandName = STATE.brands.find(b => b.id === p.brandId)?.name || 'Generic';
    const catName = STATE.categories.find(c => c.id === p.categoryId)?.name || 'Classless';
    const storeName = STATE.stores.find(s => s.id === p.storeId)?.name || 'Central Store';
    
    let specsHtml = '';
    if (p.attributes) {
      specsHtml = Object.entries(p.attributes)
        .map(([k, v]) => `<span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">${k}: ${v}</span>`)
        .join(' ');
    }

    const qtyClass = p.qty < 10 
      ? 'bg-amber-100 text-amber-805 font-mono font-black border border-amber-200' 
      : 'bg-indigo-50 text-indigo-700 font-mono border border-indigo-100';

    const statusHtml = p.status === 'active' 
      ? '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold select-none text-[10px] uppercase">Active</span>'
      : '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-full font-bold select-none text-[10px] uppercase">Inactive</span>';

    const itemImage = p.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=150&q=80';

    const trHtml = `
      <tr class="hover:bg-slate-50/60 transition">
        <td class="px-6 py-4.5">
          <div class="flex items-center gap-3">
            <img class="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-100 flex-shrink-0" src="${itemImage}" onerror="this.src='https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=150&amp;q=80'" />
            <div class="min-w-0">
              <h4 class="font-extrabold text-slate-950 text-sm truncate max-w-[12rem]">${p.name}</h4>
              <p class="text-[10px] text-slate-400 font-medium truncate mt-0.5">${brandName} • ${catName}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-4.5 font-mono">
          <span class="font-bold text-slate-800">${p.sku}</span>
          <p class="text-[10px] text-slate-400 font-medium mt-0.5">${p.barcode || 'NO BARCODE'}</p>
        </td>
        <td class="px-6 py-4.5">
          <div class="text-[10px] text-slate-500 font-bold mb-1">${storeName}</div>
          <div class="flex flex-wrap gap-1 text-[9px]">${specsHtml || '<span class="text-slate-400 italic">No specs attached</span>'}</div>
        </td>
        <td class="px-6 py-4.5 font-mono">
          <div class="text-xs text-slate-900 font-bold">Sell: ${currencySymbol}${p.price}</div>
          <div class="text-[10px] text-slate-400 font-medium mt-0.5">Buy: ${currencySymbol}${p.buyingPrice}</div>
        </td>
        <td class="px-6 py-4.5 text-center">
          <span class="inline-block px-3 py-1 rounded-lg ${qtyClass}">${p.qty} units</span>
        </td>
        <td class="px-6 py-4.5">${statusHtml}</td>
        <td class="px-6 py-4.5 text-right whitespace-nowrap">
          <button onclick="editProduct('${p.id}')" class="p-1 px-2.5 text-xs text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition active:scale-[0.98]">
            Edit
          </button>
          <button onclick="deleteProduct('${p.id}')" class="p-1 px-2.5 text-xs text-red-500 hover:text-white hover:bg-red-500 border border-slate-200 hover:border-red-500 rounded-lg transition ml-1 active:scale-[0.98]">
            Delete
          </button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', trHtml);
  });
}

// --- RENDER ORDERS TAB ---
function renderOrders() {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = '';

  const searchVal = document.getElementById('order-search').value.toLowerCase();
  const typeVal = document.getElementById('filter-order-type').value;
  const statusVal = document.getElementById('filter-order-status').value;
  const currencySymbol = STATE.company?.currency === 'ETB' ? 'Br ' : '$';

  let filtered = STATE.orders.filter(o => {
    const matchesSearch = o.orderNo.toLowerCase().includes(searchVal) || 
                          o.customerName.toLowerCase().includes(searchVal) ||
                          (o.customerPhone && o.customerPhone.includes(searchVal));
    const matchesType = !typeVal || o.orderType === typeVal;
    const matchesStatus = !statusVal || o.status === statusVal;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
       <td colspan="8" class="px-6 py-12 text-center text-slate-400 italic text-xs">No invoice records logged. Close sales deals!</td>
      </tr>
    `;
    return;
  }

  filtered.forEach(o => {
    let typeBadge = '';
    if (o.orderType === 'sales') {
      typeBadge = '<span class="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold uppercase select-none tracking-widest">Client Sales</span>';
    } else {
      typeBadge = '<span class="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold uppercase select-none tracking-widest">Supplier Buying</span>';
    }

    let statusBadge = '';
    if (o.status === 'paid') {
      statusBadge = '<span class="inline-flex items-center gap-1 font-extrabold text-emerald-600"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> PAID</span>';
    } else if (o.status === 'pending') {
      statusBadge = '<span class="inline-flex items-center gap-1 font-extrabold text-amber-500"><span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span> PENDING</span>';
    } else {
      statusBadge = '<span class="inline-flex items-center gap-1 font-extrabold text-slate-400"><span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span> CANCELLED</span>';
    }

    const itemsQtySum = (o.items || []).reduce((acc, item) => acc + (item.qty || 0), 0);
    const dateFormatted = new Date(o.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const trHtml = `
      <tr class="hover:bg-slate-50/60 transition">
        <td class="px-6 py-4.5 font-mono font-bold text-slate-900">${o.orderNo}</td>
        <td class="px-6 py-4.5 text-slate-500 font-medium">${dateFormatted}</td>
        <td class="px-6 py-4.5">
          <div class="font-extrabold text-slate-900">${o.customerName}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">${o.customerPhone || 'No telephone contact'}</div>
        </td>
        <td class="px-6 py-4.5 text-center font-bold text-slate-600 font-mono">${itemsQtySum} items</td>
        <td class="px-6 py-4.5 font-mono font-extrabold text-indigo-600">${currencySymbol}${o.netAmount}</td>
        <td class="px-6 py-4.5">${typeBadge}</td>
        <td class="px-6 py-4.5 text-xs font-semibold">${statusBadge}</td>
        <td class="px-6 py-4.5 text-right whitespace-nowrap">
          <button onclick="viewInvoice('${o.id}')" class="p-1 px-2.5 text-xs text-indigo-650 font-bold hover:bg-slate-150 border border-slate-200 rounded-lg transition active:scale-[0.98]">
            View Voucher
          </button>
          <button onclick="editOrder('${o.id}')" class="p-1 px-2 text-xs text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition ml-1 active:scale-[0.98]">
            Edit
          </button>
          <button onclick="deleteOrder('${o.id}')" class="p-1 px-2 text-xs text-red-500 hover:text-white hover:bg-red-550 border border-slate-200 hover:border-red-500 rounded transition ml-1 active:scale-[0.98]">
            Delete
          </button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML('beforeend', trHtml);
  });
}

// --- RENDER REGISTRY METADATA TABS ---
function renderCategories() {
  const tbody = document.getElementById('categories-tbody');
  tbody.innerHTML = '';

  if (STATE.categories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center italic text-slate-400 text-xs">No categories listed in registry folder.</td></tr>`;
    return;
  }

  STATE.categories.forEach(c => {
    const statusLabel = c.status === 'active' ? '<span class="text-xs font-extrabold text-emerald-600">Active</span>' : '<span class="text-xs text-slate-400">Inactive</span>';
    tbody.insertAdjacentHTML('beforeend', `
      <tr class="hover:bg-slate-50/50 transition">
        <td class="px-6 py-4 font-mono font-bold text-slate-600">${c.id}</td>
        <td class="px-6 py-4 font-extrabold text-slate-900">${c.name}</td>
        <td class="px-6 py-4">${statusLabel}</td>
        <td class="px-6 py-4 text-right">
          <button onclick="editCategory('${c.id}')" class="text-xs font-bold text-indigo-600 hover:underline">Edit</button>
          <button onclick="deleteCategory('${c.id}')" class="text-xs text-red-500 font-bold hover:underline ml-3">Delete</button>
        </td>
      </tr>
    `);
  });
}

function renderBrands() {
  const tbody = document.getElementById('brands-tbody');
  tbody.innerHTML = '';

  if (STATE.brands.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center italic text-slate-400 text-xs">No Brand labels logged.</td></tr>`;
    return;
  }

  STATE.brands.forEach(b => {
    const statusLabel = b.status === 'active' ? '<span class="text-xs font-extrabold text-emerald-600">Active</span>' : '<span class="text-xs text-slate-400">Inactive</span>';
    tbody.insertAdjacentHTML('beforeend', `
      <tr class="hover:bg-slate-50/50 transition">
        <td class="px-6 py-4 font-mono font-bold text-slate-600">${b.id}</td>
        <td class="px-6 py-4 font-extrabold text-slate-900">${b.name}</td>
        <td class="px-6 py-4">${statusLabel}</td>
        <td class="px-6 py-4 text-right">
          <button onclick="editBrand('${b.id}')" class="text-xs font-bold text-indigo-600 hover:underline">Edit</button>
          <button onclick="deleteBrand('${b.id}')" class="text-xs text-red-500 font-bold hover:underline ml-3">Delete</button>
        </td>
      </tr>
    `);
  });
}

function renderStores() {
  const tbody = document.getElementById('stores-tbody');
  tbody.innerHTML = '';

  if (STATE.stores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center italic text-slate-400 text-xs">No warehouse locations logged.</td></tr>`;
    return;
  }

  STATE.stores.forEach(s => {
    const statusLabel = s.status === 'active' ? '<span class="text-xs font-extrabold text-emerald-600">Active</span>' : '<span class="text-xs text-slate-400">Deactivated</span>';
    tbody.insertAdjacentHTML('beforeend', `
       <tr class="hover:bg-slate-50/50 transition">
         <td class="px-6 py-4.5 font-extrabold text-slate-900">${s.name}</td>
         <td class="px-6 py-4.5 text-slate-500">${s.address}</td>
         <td class="px-6 py-4.5">${statusLabel}</td>
         <td class="px-6 py-4.5 text-right">
           <button onclick="editStore('${s.id}')" class="text-xs font-bold text-indigo-600 hover:underline">Edit</button>
           <button onclick="deleteStore('${s.id}')" class="text-xs text-red-500 font-bold hover:underline ml-3">Delete</button>
         </td>
       </tr>
    `);
  });
}

function renderAttributes() {
  const tbody = document.getElementById('attributes-tbody');
  tbody.innerHTML = '';

  if (STATE.attributes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center italic text-slate-400 text-xs">No sizing formats added.</td></tr>`;
    return;
  }

  STATE.attributes.forEach(a => {
    const statusLabel = a.status === 'active' ? '<span class="text-xs font-extrabold text-emerald-600">Active</span>' : '<span class="text-xs text-slate-400">Inactive</span>';
    const valuesHtml = (a.values || []).map(val => `<span class="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-indigo-100">${val}</span>`).join(' ');
    tbody.insertAdjacentHTML('beforeend', `
       <tr class="hover:bg-slate-50/50 transition">
         <td class="px-6 py-4.5 font-extrabold text-slate-900">${a.name}</td>
         <td class="px-6 py-4.5"><div class="flex flex-wrap gap-1">${valuesHtml}</div></td>
         <td class="px-6 py-4.5">${statusLabel}</td>
         <td class="px-6 py-4.5 text-right">
           <button onclick="editAttribute('${a.id}')" class="text-xs font-bold text-indigo-600 hover:underline">Edit</button>
           <button onclick="deleteAttribute('${a.id}')" class="text-xs text-red-500 font-bold hover:underline ml-3">Delete</button>
         </td>
       </tr>
    `);
  });
}

// --- RENDER EMPLOYEES & WORKFORCE ---
function renderUsers() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '';

  STATE.users.forEach(u => {
    const avatar = u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
    const statusClass = u.status === 'active' ? 'text-emerald-600 font-bold' : 'text-slate-400';
    const statusLabel = u.status === 'active' ? 'Active Account' : 'Deactivated';
    
    tbody.insertAdjacentHTML('beforeend', `
       <tr class="hover:bg-slate-50/50 transition">
         <td class="px-6 py-4">
           <div class="flex items-center gap-3">
             <img src="${avatar}" class="w-10 h-10 rounded-full border border-slate-200" />
             <div>
               <div class="font-extrabold text-slate-900 text-xs">${u.name}</div>
               <div class="text-[10px] text-slate-500 mt-0.5">${u.email}</div>
             </div>
           </div>
         </td>
         <td class="px-6 py-4 font-mono font-bold text-[10px] uppercase text-indigo-600 tracking-wider">${u.role}</td>
         <td class="px-6 py-4 text-xs ${statusClass}">${statusLabel}</td>
         <td class="px-6 py-4 text-right">
           <button onclick="editUser('${u.id}')" class="text-xs font-bold text-indigo-600 hover:underline">Edit</button>
           <button onclick="deleteUser('${u.id}')" class="text-xs text-red-500 font-bold hover:underline ml-3">Delete</button>
         </td>
       </tr>
    `);
  });

  // Load Groups List
  const groupsList = document.getElementById('groups-list');
  groupsList.innerHTML = '';

  STATE.groups.forEach(g => {
    const activePermCount = (g.permissions || []).length;
    groupsList.insertAdjacentHTML('beforeend', `
       <div class="p-4 bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs transition">
         <div>
           <h4 class="font-bold text-slate-900">${g.name}</h4>
           <p class="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-xs">${g.description}</p>
         </div>
         <div class="flex items-center gap-2 flex-shrink-0">
           <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold font-mono text-[9px]">${activePermCount} privs</span>
           <button onclick="editGroup('${g.id}')" class="text-indigo-600 hover:text-indigo-500 font-bold"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
         </div>
       </div>
    `);
  });
}

// --- RENDER DB SECURITY AUDIT LOGS ---
function renderAuditLogs() {
  const tbody = document.getElementById('audit-tbody');
  tbody.innerHTML = '';

  if (STATE.auditLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center italic text-slate-400 text-xs">No logs found.</td></tr>`;
    return;
  }

  // Sort: show newest logs first
  const sortedLogs = [...STATE.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  sortedLogs.forEach(log => {
    const logId = log.id || 'N/A';
    const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now';
    
    tbody.insertAdjacentHTML('beforeend', `
       <tr class="hover:bg-slate-50/50 transition">
         <td class="px-6 py-4.5 font-bold text-slate-400">${logId}</td>
         <td class="px-6 py-4.5 text-slate-500 font-medium whitespace-nowrap">${dateStr}</td>
         <td class="px-6 py-4.5 text-slate-900 font-extrabold">${log.userName}</td>
         <td class="px-6 py-4.5 text-slate-500 uppercase font-black text-[9px] tracking-wider">${log.userRole}</td>
         <td class="px-6 py-4.5 font-bold text-indigo-650">${log.action}</td>
         <td class="px-6 py-4.5 font-mono text-[10px] font-bold text-slate-500">${log.module}</td>
         <td class="px-6 py-4.5 text-slate-600 max-w-xs truncate" title="${log.details}">${log.details}</td>
       </tr>
    `);
  });
}

// --- RENDER COMPANY PREFERENCES ---
function renderCompanyConfig() {
  const comp = STATE.company;
  if (!comp) return;

  document.getElementById('company-name').value = comp.name || '';
  document.getElementById('company-phone').value = comp.phone || '';
  document.getElementById('company-address').value = comp.address || '';
  document.getElementById('company-vat').value = comp.vatPercent || 12;
  document.getElementById('company-service-charge').value = comp.serviceChargePercent || 5;
  document.getElementById('company-currency').value = comp.currency || 'USD';
  document.getElementById('company-footer').value = comp.footerText || '';
}

// --- SYSTEM STATIC BINDINGS EVENT LISTENERS ---
function setupEventListeners() {
  
  // Hash Routing Change
  window.addEventListener('hashchange', handleRouting);

  // Authenticate submission
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          STATE.user = data.user;
          STATE.token = data.token;
          
          localStorage.setItem('entech_user', JSON.stringify(data.user));
          localStorage.setItem('entech_token', data.token);

          // Reveal Shell View
          document.getElementById('login-screen').classList.add('hidden');
          document.getElementById('system-shell').classList.remove('hidden');

          // Update header details
          document.getElementById('user-name').innerText = STATE.user.name;
          document.getElementById('user-role-badge').innerText = STATE.user.role;
          if (STATE.user.avatar) {
            document.getElementById('user-avatar').src = STATE.user.avatar;
          }

          applyRoleBasedUIGard();
          showToast(`Affiliation authorized! Welcome ${STATE.user.name}.`, "success");
          
          await fetchSyncDatabase();
          window.location.hash = '#dashboard';
        } else {
          showToast(data.error || "Workspace Authorization Failed.", "error");
        }
      } catch (err) {
        showToast("Web Connection timed out. Ensure flask backend is listening on localhost:3000.", "error");
      }
    });
  }

  // Logout Click
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('entech_user');
    localStorage.removeItem('entech_token');
    STATE.user = null;
    STATE.token = null;

    document.getElementById('system-shell').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    showToast("Authorization Session Cleared. Safe journey!", "success");
  });

  // DB Force Sync Trigger Click
  document.getElementById('refresh-all-data').addEventListener('click', async () => {
    document.getElementById('refresh-all-data').querySelector('i').classList.add('animate-spin');
    showToast("Fetching structural assets sync...", "success");
    await fetchSyncDatabase();
    setTimeout(() => {
      document.getElementById('refresh-all-data').querySelector('i').classList.remove('animate-spin');
    }, 400);
  });

  // Product Filter parameters changes
  document.getElementById('filter-brand').addEventListener('change', renderProducts);
  document.getElementById('filter-category').addEventListener('change', renderProducts);
  document.getElementById('filter-store').addEventListener('change', renderProducts);
  document.getElementById('product-search').addEventListener('keyup', renderProducts);

  // Orders filters
  document.getElementById('order-search').addEventListener('keyup', renderOrders);
  document.getElementById('filter-order-type').addEventListener('change', renderOrders);
  document.getElementById('filter-order-status').addEventListener('change', renderOrders);
  
  // Global search parameters
  document.getElementById('global-search').addEventListener('keyup', (e) => {
    const val = e.target.value.toLowerCase();
    if (STATE.currentTab === 'products') {
      document.getElementById('product-search').value = val;
      renderProducts();
    } else if (STATE.currentTab === 'orders') {
      document.getElementById('order-search').value = val;
      renderOrders();
    }
  });

  // Audit Logs Reload click
  document.getElementById('btn-refresh-audit')?.addEventListener('click', async () => {
    showToast("Security registry ledger synchronized.", "success");
    await fetchSyncDatabase();
  });

  // Export static CSV Click
  document.getElementById('btn-export-products').addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SKU,Product Name,Remaining Qty,Selling Price ($),Buying Price ($),Channel Status\n";
    STATE.products.forEach(p => {
      csvContent += `"${p.sku}","${p.name}",${p.qty},${p.price},${p.buyingPrice},"${p.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `entech_inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Static products database compiled to desktop locally.", "success");
  });

  // Forms Submissions Bindings
  document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
  document.getElementById('order-form').addEventListener('submit', handleOrderSubmit);
  document.getElementById('category-form').addEventListener('submit', handleCategorySubmit);
  document.getElementById('brand-form').addEventListener('submit', handleBrandSubmit);
  document.getElementById('store-form').addEventListener('submit', handleStoreSubmit);
  document.getElementById('attribute-form').addEventListener('submit', handleAttributeSubmit);
  document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
  document.getElementById('group-form').addEventListener('submit', handleGroupSubmit);
  document.getElementById('company-profile-form').addEventListener('submit', handleCompanySubmit);

  // Mobile navigation trigger
  document.getElementById('open-sidebar-mobile').addEventListener('click', () => {
    document.getElementById('system-sidebar').classList.remove('-translate-x-full');
  });
  document.getElementById('close-sidebar-mobile').addEventListener('click', () => {
    document.getElementById('system-sidebar').classList.add('-translate-x-full');
  });
}

// --- PRODUCT FORMS CONTROLLER ---
function openProductModal() {
  document.getElementById('product-id').value = '';
  document.getElementById('product-form').reset();
  document.getElementById('product-modal-title').innerText = "Register Stock Product Asset";

  // Load Categories / Brands / Warehouses in select elements
  const brandSel = document.getElementById('prod-brand');
  const catSel = document.getElementById('prod-category');
  const storeSel = document.getElementById('prod-store');

  brandSel.innerHTML = STATE.brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  catSel.innerHTML = STATE.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  storeSel.innerHTML = STATE.stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

  // Hydrate custom Attributes variant specs inputs
  const specsContainer = document.getElementById('dynamic-attributes-fields');
  specsContainer.innerHTML = '';
  if (STATE.attributes.length === 0) {
    specsContainer.innerHTML = '<span class="text-[11px] text-slate-400 italic">No attributes registered. Feel free to define custom models via settings.</span>';
  } else {
    STATE.attributes.forEach(attr => {
      if (attr.status === 'active') {
        const optionList = (attr.values || []).map(o => `<option value="${o}">${o}</option>`).join('');
        specsContainer.insertAdjacentHTML('beforeend', `
          <div>
            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">${attr.name}</label>
            <select name="attr_${attr.name}" class="w-full bg-white border border-slate-200 text-slate-700 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-indigo-500 transition">
              <option value="">-- Choose format --</option>
              ${optionList}
            </select>
          </div>
        `);
      }
    });
  }

  document.getElementById('modal-product').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('modal-product').classList.add('hidden');
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  
  // Extract custom Attributes
  const attributesValues = {};
  const selects = document.querySelectorAll('#dynamic-attributes-fields select');
  selects.forEach(sel => {
    const key = sel.name.replace('attr_', '');
    if (sel.value) {
      attributesValues[key] = sel.value;
    }
  });

  const productData = {
    name: document.getElementById('prod-name').value,
    sku: document.getElementById('prod-sku').value,
    barcode: document.getElementById('prod-barcode').value || '',
    image: document.getElementById('prod-image').value || '',
    brandId: document.getElementById('prod-brand').value,
    categoryId: document.getElementById('prod-category').value,
    storeId: document.getElementById('prod-store').value,
    price: parseFloat(document.getElementById('prod-price').value),
    buyingPrice: parseFloat(document.getElementById('prod-buying-price').value),
    qty: parseInt(document.getElementById('prod-qty').value),
    attributes: attributesValues,
    status: document.getElementById('prod-status').value,
    description: document.getElementById('prod-desc').value
  };

  const payload = {
    product: productData,
    operator: STATE.user
  };

  try {
    let response;
    if (id) {
      // Edit mode
      response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Create mode
      response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (response.ok) {
      showToast(id ? "Specifications asset update audited!" : "Product catalog parameters entered!", "success");
      closeProductModal();
      await fetchSyncDatabase();
    } else {
      const errorData = await response.json();
      showToast(errorData.error || "Form validation mismatch.", "error");
    }
  } catch (err) {
    showToast("Connection to app.py timed out.", "error");
  }
}

function editProduct(prodId) {
  const p = STATE.products.find(item => item.id === prodId);
  if (!p) return;

  openProductModal();
  document.getElementById('product-id').value = p.id;
  document.getElementById('product-modal-title').innerText = `Repair parameters: ${p.name}`;
  
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-sku').value = p.sku;
  document.getElementById('prod-barcode').value = p.barcode || '';
  document.getElementById('prod-image').value = p.image || '';
  document.getElementById('prod-brand').value = p.brandId;
  document.getElementById('prod-category').value = p.categoryId;
  document.getElementById('prod-store').value = p.storeId;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-buying-price').value = p.buyingPrice;
  document.getElementById('prod-qty').value = p.qty;
  document.getElementById('prod-status').value = p.status;
  document.getElementById('prod-desc').value = p.description || '';

  // Prefill dynamic attributes
  if (p.attributes) {
    Object.entries(p.attributes).forEach(([k, v]) => {
      const sel = document.querySelector(`select[name="attr_${k}"]`);
      if (sel) {
        sel.value = v;
      }
    });
  }
}

async function deleteProduct(prodId) {
  const p = STATE.products.find(item => item.id === prodId);
  if (!p) return;

  const conf = confirm(`Are you absolutely sure you want to remove Product: ${p.name} from the central database? This action writes security incident report.`);
  if (!conf) return;

  try {
    const response = await fetch(`/api/products/${prodId}?userEmail=${STATE.user.email}&userName=${STATE.user.name}&userRole=${STATE.user.role}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast("Central Stock registry element removed.", "success");
      await fetchSyncDatabase();
    } else {
      showToast("Access Level Override mismatch. Permission de-authorized.", "error");
    }
  } catch (err) {
    showToast("Audit write failed.", "error");
  }
}

// --- ORDERS/COMMISSION CREATION CONTROLLERS ---
function openOrderModal(type = 'sales') {
  document.getElementById('order-id').value = '';
  document.getElementById('order-form').reset();
  
  STATE.activeInvoiceLineCount = 0;
  document.getElementById('invoice-items-tbody').innerHTML = '';
  
  document.getElementById('order-type-val').value = type;

  // Global settings setup multipliers
  const vatPct = STATE.company?.vatPercent || 12;
  const scPct = STATE.company?.serviceChargePercent || 5;
  document.getElementById('invoice-vat-pct').innerText = vatPct;
  document.getElementById('invoice-sc-pct').innerText = scPct;

  if (type === 'sales') {
    document.getElementById('order-modal-title').innerText = "Initialize Client Sales Order & Invoice Ledger";
    document.getElementById('lbl-entity-name').innerText = "Client Corporate Name";
    document.getElementById('order-customer').placeholder = "e.g. Nike Retailer Inc.";
  } else {
    document.getElementById('order-modal-title').innerText = "Issue Supplier Inventory Stock Acquisition Ledger";
    document.getElementById('lbl-entity-name').innerText = "Supplier Account Title";
    document.getElementById('order-customer').placeholder = "e.g. Apple Wholesale Distribution";
  }

  addInvoiceItemLine(); // Start with 1 blank line
  document.getElementById('modal-order').classList.remove('hidden');
}

function closeOrderModal() {
  document.getElementById('modal-order').classList.add('hidden');
}

function addInvoiceItemLine() {
  const tbody = document.getElementById('invoice-items-tbody');
  const lineIndex = ++STATE.activeInvoiceLineCount;
  
  // Make product list for options
  // Show active products only
  const activeProds = STATE.products.filter(p => p.status === 'active');
  const prodOptions = activeProds.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');

  const rowHtml = `
    <tr id="invLine_${lineIndex}" class="inv-product-row hover:bg-slate-50/50 transition duration-150">
      <td class="px-4 py-2.5">
        <select required id="lineProd_${lineIndex}" onchange="handleLineProductSelectionChange(${lineIndex})" class="w-full bg-white border border-slate-200 text-slate-700 rounded-lg p-1.5 text-xs outline-none focus:border-indigo-500 select-line-product">
          <option value="">-- Choose target catalog asset --</option>
          ${prodOptions}
        </select>
      </td>
      <td class="px-4 py-2.5">
        <input type="number" step="0.01" min="0" required id="lineRate_${lineIndex}" onkeyup="recalculateInvoiceTotal()" onchange="recalculateInvoiceTotal()" class="w-24 bg-white border border-slate-200 text-slate-700 rounded-lg p-1 text-xs text-right font-mono" />
      </td>
      <td class="px-4 py-2.5">
        <input type="number" min="1" required id="lineQty_${lineIndex}" value="1" onkeyup="recalculateInvoiceTotal()" onchange="recalculateInvoiceTotal()" class="w-16 bg-white border border-slate-200 text-slate-700 rounded-lg p-1 text-xs text-center font-mono" />
      </td>
      <td class="px-4 py-2.5 font-mono text-xs font-bold text-slate-750 line-aggregate-total" id="lineTotal_${lineIndex}">$0.00</td>
      <td class="px-4 py-2.5 text-right font-semibold">
        <button type="button" onclick="removeInvoiceItemLine(${lineIndex})" class="text-red-500 hover:text-red-400 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </td>
    </tr>
  `;
  tbody.insertAdjacentHTML('beforeend', rowHtml);
  lucide.createIcons();
}

function removeInvoiceItemLine(index) {
  const row = document.getElementById(`invLine_${index}`);
  if (row) {
    row.remove();
    recalculateInvoiceTotal();
  }
}

function handleLineProductSelectionChange(index) {
  const pId = document.getElementById(`lineProd_${index}`).value;
  const p = STATE.products.find(item => item.id === pId);
  if (!p) return;

  const type = document.getElementById('order-type-val').value;
  
  // Sales lines fetch selling price, Purchase lines fetch buying rate! Very smart logistics!
  const rateInput = document.getElementById(`lineRate_${index}`);
  rateInput.value = type === 'sales' ? p.price : p.buyingPrice;
  recalculateInvoiceTotal();
}

function recalculateInvoiceTotal() {
  const rows = document.querySelectorAll('.inv-product-row');
  let goodsSubtotal = 0;

  rows.forEach(row => {
    const idSuffix = row.id.split('_')[1];
    const rate = parseFloat(document.getElementById(`lineRate_${idSuffix}`).value) || 0;
    const qty = parseInt(document.getElementById(`lineQty_${idSuffix}`).value) || 0;
    
    const lineTotal = rate * qty;
    goodsSubtotal += lineTotal;

    document.getElementById(`lineTotal_${idSuffix}`).innerText = '$' + lineTotal.toFixed(2);
  });

  // Calculate dynamic tax additions from global preferences
  const companyVatPct = STATE.company?.vatPercent || 12;
  const companyScPct = STATE.company?.serviceChargePercent || 5;

  const vatAmount = (goodsSubtotal * companyVatPct) / 100;
  const serviceChargeAmount = (goodsSubtotal * companyScPct) / 100;
  const discountAmount = parseFloat(document.getElementById('order-discount-input').value) || 0;

  const netPayable = goodsSubtotal + vatAmount + serviceChargeAmount - discountAmount;

  document.getElementById('order-subtotal-val').innerText = '$' + goodsSubtotal.toFixed(2);
  document.getElementById('order-vat-val').innerText = '$' + vatAmount.toFixed(2);
  document.getElementById('order-sc-val').innerText = '$' + serviceChargeAmount.toFixed(2);
  document.getElementById('order-net-total-val').innerText = '$' + Math.max(0, netPayable).toFixed(2);
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('order-id').value;
  const type = document.getElementById('order-type-val').value;

  const rows = document.querySelectorAll('.inv-product-row');
  if (rows.length === 0) {
    showToast("Invoice must specify at least 1 tracking index line item.", "warn");
    return;
  }

  const items = [];
  rows.forEach(row => {
    const index = row.id.split('_')[1];
    const pId = document.getElementById(`lineProd_${index}`).value;
    const rate = parseFloat(document.getElementById(`lineRate_${index}`).value);
    const qty = parseInt(document.getElementById(`lineQty_${index}`).value);
    
    const p = STATE.products.find(item => item.id === pId);
    if (p) {
      items.push({
        productId: pId,
        name: p.name,
        sku: p.sku,
        rate: rate,
        qty: qty,
        amount: rate * qty
      });
    }
  });

  const rawSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const companyVatPct = STATE.company?.vatPercent || 12;
  const companyScPct = STATE.company?.serviceChargePercent || 5;

  const vatAmount = (rawSubtotal * companyVatPct) / 100;
  const serviceChargeAmount = (rawSubtotal * companyScPct) / 100;
  const discount = parseFloat(document.getElementById('order-discount-input').value) || 0;
  const netAmount = rawSubtotal + vatAmount + serviceChargeAmount - discount;

  const orderPayload = {
    customerName: document.getElementById('order-customer').value,
    customerPhone: document.getElementById('order-phone').value || '',
    customerAddress: document.getElementById('order-address').value || '',
    items: items,
    subtotal: rawSubtotal,
    vatPercent: companyVatPct,
    vatAmount: vatAmount,
    serviceChargePercent: companyScPct,
    serviceChargeAmount: serviceChargeAmount,
    discount: discount,
    netAmount: netAmount,
    status: document.getElementById('order-status').value,
    orderType: type,
    notes: document.getElementById('order-notes').value || ''
  };

  const payload = {
    order: orderPayload,
    operator: STATE.user
  };

  try {
    let response;
    if (id) {
      response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (response.ok) {
      showToast(id ? "Transaction modifications recorded." : "Operational billing invoice ledger finalized!", "success");
      closeOrderModal();
      await fetchSyncDatabase();
    } else {
      const err = await response.json();
      showToast(err.error || "Calculations integrity failed.", "error");
    }
  } catch (err) {
    showToast("Audit tracking failed.", "error");
  }
}

function editOrder(orderId) {
  const o = STATE.orders.find(item => item.id === orderId);
  if (!o) return;

  openOrderModal(o.orderType);
  document.getElementById('order-id').value = o.id;
  document.getElementById('order-customer').value = o.customerName;
  document.getElementById('order-phone').value = o.customerPhone || '';
  document.getElementById('order-address').value = o.customerAddress || '';
  document.getElementById('order-status').value = o.status;
  document.getElementById('order-discount-input').value = o.discount || 0;
  document.getElementById('order-notes').value = o.notes || '';

  // Clear prefilled line 1
  document.getElementById('invoice-items-tbody').innerHTML = '';
  STATE.activeInvoiceLineCount = 0;

  // Hydrate items
  o.items.forEach(item => {
    addInvoiceItemLine();
    const currIndex = STATE.activeInvoiceLineCount;
    document.getElementById(`lineProd_${currIndex}`).value = item.productId;
    document.getElementById(`lineRate_${currIndex}`).value = item.rate;
    document.getElementById(`lineQty_${currIndex}`).value = item.qty;
  });

  recalculateInvoiceTotal();
}

async function deleteOrder(orderId) {
  const o = STATE.orders.find(item => item.id === orderId);
  if (!o) return;

  const conf = confirm(`Are you absolutely sure you want to cancel and REMOVE Order Ledger ${o.orderNo}? Removing transactional records modifies central audited stats!`);
  if (!conf) return;

  try {
    const response = await fetch(`/api/orders/${orderId}?userEmail=${STATE.user.email}&userName=${STATE.user.name}&userRole=${STATE.user.role}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      showToast("Billing transaction canceled from active logs.", "success");
      await fetchSyncDatabase();
    } else {
      showToast("Access Level Override de-authorized.", "error");
    }
  } catch (err) {
    showToast("Audit write failed.", "error");
  }
}

// --- DIRECT INVOICE / EXPORTABLE PRINT CONTROLLER ---
function viewInvoice(orderId) {
  const o = STATE.orders.find(item => item.id === orderId);
  if (!o) return;

  const comp = STATE.company;
  const currencySymbol = comp.currency === 'ETB' ? 'Br ' : '$';

  // Fill Header Configs
  document.getElementById('inv-host-name').innerText = comp.name || "Apex Logistics Corp";
  document.getElementById('inv-host-address').innerText = comp.address || "220 Industrial Parkway, Chicago, IL 60601";
  document.getElementById('inv-host-phone').innerText = comp.phone || "+1 (312) 555-0150";
  document.getElementById('inv-footer-text').innerText = comp.footerText || "apex system watermark";

  // Fill Voucher Metadata
  document.getElementById('inv-header-type').innerText = o.orderType === 'sales' ? 'SALES RECEIPT' : 'SUPPLIER RECEIPT';
  document.getElementById('inv-code').innerText = o.orderNo;
  document.getElementById('inv-status').innerText = o.status;
  document.getElementById('inv-client-name').innerText = o.customerName;
  document.getElementById('inv-client-address').innerText = o.customerAddress || 'Customer Address Default';
  document.getElementById('inv-client-phone').innerText = o.customerPhone || 'N/A';
  
  const formattedDate = new Date(o.date).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  document.getElementById('inv-date').innerText = formattedDate;
  document.getElementById('inv-agent-name').innerText = o.userName || 'System Operator';

  // Render List Lines
  const tbody = document.getElementById('inv-tbody');
  tbody.innerHTML = '';
  
  o.items.forEach(item => {
    tbody.insertAdjacentHTML('beforeend', `
       <tr class="border-b border-slate-50">
         <td class="py-3 font-semibold text-slate-800">${item.name}</td>
         <td class="py-3 font-mono text-slate-500">${item.sku}</td>
         <td class="py-3 text-right font-mono">${currencySymbol}${item.rate.toFixed(2)}</td>
         <td class="py-3 text-center font-mono font-bold">${item.qty} units</td>
         <td class="py-3 text-right font-mono font-bold text-slate-900">${currencySymbol}${item.amount.toFixed(2)}</td>
       </tr>
    `);
  });

  // Calculations
  document.getElementById('inv-subtotal').innerText = currencySymbol + o.subtotal.toFixed(2);
  document.getElementById('inv-vat-pct-show').innerText = o.vatPercent || 0;
  document.getElementById('inv-vat').innerText = currencySymbol + (o.vatAmount || 0).toFixed(2);
  document.getElementById('inv-sc-pct-show').innerText = o.serviceChargePercent || 0;
  document.getElementById('inv-service-charge').innerText = currencySymbol + (o.serviceChargeAmount || 0).toFixed(2);
  document.getElementById('inv-discount').innerText = '-' + currencySymbol + (o.discount || 0).toFixed(2);
  document.getElementById('inv-net').innerText = currencySymbol + o.netAmount.toFixed(2);
  document.getElementById('inv-notes').innerText = o.notes || 'No operational remarks attached to transaction file.';

  document.getElementById('modal-invoice-viewer').classList.remove('hidden');
}

function closeInvoiceViewer() {
  document.getElementById('modal-invoice-viewer').classList.add('hidden');
}


// --- HIGH STABILITY METADATA CREATION SUBMISSIONS ---

// CATEGORIES
function openCategoryModal() {
  const isOperator = STATE.user.role === 'user';
  if (isOperator) return;

  document.getElementById('category-id').value = '';
  document.getElementById('category-form').reset();
  document.getElementById('category-modal-title').innerText = "Register Category Label";
  document.getElementById('modal-category').classList.remove('hidden');
}
function closeCategoryModal() {
  document.getElementById('modal-category').classList.add('hidden');
}
async function handleCategorySubmit(e) {
  e.preventDefault();
  const id = document.getElementById('category-id').value;
  const name = document.getElementById('cat-name-input').value;
  const status = document.getElementById('cat-status-input').value;

  const payload = { category: { name, status }, operator: STATE.user };
  try {
    let res = id 
      ? await fetch(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
      showToast("Category settings adjusted successfully.", "success");
      closeCategoryModal();
      await fetchSyncDatabase();
    } else {
      showToast("Operation de-authorized.", "error");
    }
  } catch (err) { showToast("Connection failed", "error"); }
}
function editCategory(id) {
  const c = STATE.categories.find(item => item.id === id);
  if (!c) return;
  openCategoryModal();
  document.getElementById('category-id').value = c.id;
  document.getElementById('cat-name-input').value = c.name;
  document.getElementById('cat-status-input').value = c.status;
  document.getElementById('category-modal-title').innerText = "Edit Category File";
}
async function deleteCategory(id) {
  const conf = confirm("Are you sure you want to remove this category? Active items might get classless.");
  if (!conf) return;
  try {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast("Category deleted.", "success");
      await fetchSyncDatabase();
    } else { showToast("Action de-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}

// BRANDS
function openBrandModal() {
  const isOperator = STATE.user.role === 'user';
  if (isOperator) return;

  document.getElementById('brand-id').value = '';
  document.getElementById('brand-form').reset();
  document.getElementById('brand-modal-title').innerText = "Register Brand Label";
  document.getElementById('modal-brand').classList.remove('hidden');
}
function closeBrandModal() {
  document.getElementById('modal-brand').classList.add('hidden');
}
async function handleBrandSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('brand-id').value;
  const name = document.getElementById('brand-name-input').value;
  const status = document.getElementById('brand-status-input').value;

  const payload = { brand: { name, status }, operator: STATE.user };
  try {
    let res = id 
      ? await fetch(`/api/brands/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
      showToast("Brand labels modified audited.", "success");
      closeBrandModal();
      await fetchSyncDatabase();
    } else { showToast("Operation de-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}
function editBrand(id) {
  const b = STATE.brands.find(item => item.id === id);
  if (!b) return;
  openBrandModal();
  document.getElementById('brand-id').value = b.id;
  document.getElementById('brand-name-input').value = b.name;
  document.getElementById('brand-status-input').value = b.status;
  document.getElementById('brand-modal-title').innerText = "Edit Brand label file";
}
async function deleteBrand(id) {
  const conf = confirm("Are you sure you want to delete brand registration?");
  if (!conf) return;
  try {
    const res = await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast("Brand registration deleted.", "success");
      await fetchSyncDatabase();
    } else { showToast("De-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}

// STORES / OUTLETS
function openStoreModal() {
  const isOperator = STATE.user.role === 'user';
  if (isOperator) return;

  document.getElementById('store-id').value = '';
  document.getElementById('store-form').reset();
  document.getElementById('store-modal-title').innerText = "Register warehouse Outlet Location";
  document.getElementById('modal-store').classList.remove('hidden');
}
function closeStoreModal() {
  document.getElementById('modal-store').classList.add('hidden');
}
async function handleStoreSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('store-id').value;
  const name = document.getElementById('store-name-input').value;
  const address = document.getElementById('store-address-input').value;
  const status = document.getElementById('store-status-input').value;

  const payload = { store: { name, address, status }, operator: STATE.user };
  try {
    let res = id 
      ? await fetch(`/api/stores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
      showToast("Location records updated.", "success");
      closeStoreModal();
      await fetchSyncDatabase();
    } else { showToast("Action de-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}
function editStore(id) {
  const s = STATE.stores.find(item => item.id === id);
  if (!s) return;
  openStoreModal();
  document.getElementById('store-id').value = s.id;
  document.getElementById('store-name-input').value = s.name;
  document.getElementById('store-address-input').value = s.address;
  document.getElementById('store-status-input').value = s.status;
  document.getElementById('store-modal-title').innerText = "Edit Location Outline Settings";
}
async function deleteStore(id) {
  const conf = confirm("Delete warehouse location distribution outlet? Storage parameters may get fragmented.");
  if (!conf) return;
  try {
    const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast("Outlet deleted.", "success");
      await fetchSyncDatabase();
    } else { showToast("Action de-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}

// ATTRIBUTES SPEC PARAMETERS
function openAttributeModal() {
  const isOperator = STATE.user.role === 'user';
  if (isOperator) return;

  document.getElementById('attribute-id').value = '';
  document.getElementById('attribute-form').reset();
  document.getElementById('attribute-modal-title').innerText = "Register specifications parameters";
  document.getElementById('modal-attribute').classList.remove('hidden');
}
function closeAttributeModal() {
  document.getElementById('modal-attribute').classList.add('hidden');
}
async function handleAttributeSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('attribute-id').value;
  const name = document.getElementById('attr-name-input').value;
  const status = document.getElementById('attr-status-input').value;
  
  // Split comma values
  const values = document.getElementById('attr-values-input').value
    .split(',')
    .map(v => v.trim())
    .filter(v => v !== '');

  const payload = { attribute: { name, values, status }, operator: STATE.user };
  try {
    let res = id 
      ? await fetch(`/api/attributes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/attributes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
      showToast("Specifications metrics adjusted.", "success");
      closeAttributeModal();
      await fetchSyncDatabase();
    } else { showToast("Action de-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}
function editAttribute(id) {
  const a = STATE.attributes.find(item => item.id === id);
  if (!a) return;
  openAttributeModal();
  document.getElementById('attribute-id').value = a.id;
  document.getElementById('attr-name-input').value = a.name;
  document.getElementById('attr-values-input').value = (a.values || []).join(', ');
  document.getElementById('attr-status-input').value = a.status;
  document.getElementById('attribute-modal-title').innerText = "Edit Sizing spec formats";
}
async function deleteAttribute(id) {
  const conf = confirm("Delete specs formatting metrics parameters?");
  if (!conf) return;
  try {
    const res = await fetch(`/api/attributes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast("Metrics parameter deleted.", "success");
      await fetchSyncDatabase();
    } else { showToast("Action de-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}

// EMPLOYEES & WORKFORCE REGISTRY
function openUserModal() {
  const isOperator = STATE.user.role === 'user';
  if (isOperator) return;

  document.getElementById('user-id').value = '';
  document.getElementById('user-form').reset();
  document.getElementById('usr-password').required = true;
  document.getElementById('lbl-usr-pass').innerText = "Workspace Password Token";
  document.getElementById('user-modal-title').innerText = "Register Workforce Personnel";

  // Hydrate custom active groups in selector
  const grpSelect = document.getElementById('usr-group');
  grpSelect.innerHTML = STATE.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

  document.getElementById('modal-user').classList.remove('hidden');
}
function closeUserModal() {
  document.getElementById('modal-user').classList.add('hidden');
}
async function handleUserSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('user-id').value;
  const password = document.getElementById('usr-password').value;

  const userData = {
    name: document.getElementById('usr-name').value,
    email: document.getElementById('usr-email').value,
    role: document.getElementById('usr-role').value,
    groupId: document.getElementById('usr-group').value,
    phone: document.getElementById('usr-phone').value || '',
    address: document.getElementById('usr-address').value || '',
    status: document.getElementById('usr-status').value
  };

  const payload = { user: userData, password, operator: STATE.user };
  try {
    let res = id 
      ? await fetch(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
      showToast("Workforce employee list updated.", "success");
      closeUserModal();
      await fetchSyncDatabase();
    } else {
      const err = await res.json();
      showToast(err.error || "Personnel credentials failure.", "error");
    }
  } catch (err) { showToast("Connection error", "error"); }
}
function editUser(id) {
  const u = STATE.users.find(item => item.id === id);
  if (!u) return;

  openUserModal();
  document.getElementById('user-id').value = u.id;
  document.getElementById('usr-password').required = false;
  document.getElementById('lbl-usr-pass').innerText = "Update Password (Leave blank to keep old)";

  document.getElementById('usr-name').value = u.name;
  document.getElementById('usr-email').value = u.email;
  document.getElementById('usr-role').value = u.role;
  document.getElementById('usr-group').value = u.groupId || '';
  document.getElementById('usr-phone').value = u.phone || '';
  document.getElementById('usr-address').value = u.address || '';
  document.getElementById('usr-status').value = u.status;
  document.getElementById('user-modal-title').innerText = `Repair coordinates: ${u.name}`;
}
async function deleteUser(id) {
  if (id === STATE.user.id) {
    showToast("You cannot self-decommission your logged-in administrator account!", "warn");
    return;
  }
  const conf = confirm("Delete workforce coordinate credentials from standard registry database?");
  if (!conf) return;
  try {
    const res = await fetch(`/api/users/${id}?userEmail=${STATE.user.email}&userName=${STATE.user.name}&userRole=${STATE.user.role}`, { method: 'DELETE' });
    if (res.ok) {
      showToast("Employee deleted from security roles registries.", "success");
      await fetchSyncDatabase();
    } else { showToast("De-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}

// GROUP SECURITY ROLES DYNAMICS
function openGroupModal() {
  const isOperator = STATE.user.role === 'user';
  if (isOperator) return;

  document.getElementById('group-id').value = '';
  document.getElementById('group-form').reset();
  document.getElementById('group-modal-title').innerText = "Configure Custom Security Workspace Privilege Group";

  // Checkboxes for workspace permissions
  const cboxContainer = document.getElementById('grp-permissions-checkboxes');
  cboxContainer.innerHTML = '';
  
  ALL_PERMISSIONS.forEach(p => {
    cboxContainer.insertAdjacentHTML('beforeend', `
       <label class="flex items-center gap-2 p-1 border border-slate-100 rounded bg-white hover:bg-slate-50 cursor-pointer select-none">
         <input type="checkbox" name="perm_${p.id}" value="${p.id}" class="rounded text-indigo-650 h-3.5 w-3.5 focus:ring-0 focus:ring-offset-0" />
         <span class="text-[10px] text-slate-700 font-medium">${p.label}</span>
       </label>
    `);
  });

  document.getElementById('modal-group').classList.remove('hidden');
}
function closeGroupModal() {
  document.getElementById('modal-group').classList.add('hidden');
}
async function handleGroupSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('group-id').value;
  const name = document.getElementById('grp-name').value;
  const description = document.getElementById('grp-desc').value;

  const permissions = [];
  const checked = document.querySelectorAll('#grp-permissions-checkboxes input[type="checkbox"]:checked');
  checked.forEach(cb => permissions.push(cb.value));

  const payload = { group: { name, description, permissions }, operator: STATE.user };
  try {
    let res = id 
      ? await fetch(`/api/groups/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
      showToast("Access Group Privileges re-configured successfully.", "success");
      closeGroupModal();
      await fetchSyncDatabase();
    } else { showToast("De-authorized.", "error"); }
  } catch (err) { showToast("Connection failed", "error"); }
}
function editGroup(id) {
  const g = STATE.groups.find(item => item.id === id);
  if (!g) return;

  openGroupModal();
  document.getElementById('group-id').value = g.id;
  document.getElementById('grp-name').value = g.name;
  document.getElementById('grp-desc').value = g.description;
  document.getElementById('group-modal-title').innerText = `Configure Access: ${g.name}`;

  // Check the active permissions checkboxes
  if (g.permissions) {
    g.permissions.forEach(pId => {
      const cb = document.querySelector(`input[name="perm_${pId}"]`);
      if (cb) cb.checked = true;
    });
  }
}

// COMPANY SETTINGS & PROFILE CONTROLLER
async function handleCompanySubmit(e) {
  e.preventDefault();
  const companyData = {
    name: document.getElementById('company-name').value,
    phone: document.getElementById('company-phone').value,
    address: document.getElementById('company-address').value,
    vatPercent: parseFloat(document.getElementById('company-vat').value),
    serviceChargePercent: parseFloat(document.getElementById('company-service-charge').value),
    currency: document.getElementById('company-currency').value,
    footerText: document.getElementById('company-footer').value
  };

  const payload = { company: companyData, operator: STATE.user };
  try {
    const res = await fetch('/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast("Structural settings and configuration variables audited and applied successfully.", "success");
      await fetchSyncDatabase();
    } else {
      showToast("Administrative configs re-authorized write failed.", "error");
    }
  } catch (err) { showToast("Connection failed.", "error"); }
}
