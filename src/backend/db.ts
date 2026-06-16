import fs from 'fs';
import path from 'path';
import { User, Group, Brand, Category, Store, Attribute, Product, Order, Company, AuditLog } from '../types';

const DATA_FILE = path.join(process.cwd(), 'inventory_data.json');

interface DbSchema {
  users: (User & { passwordHash: string })[];
  groups: Group[];
  brands: Brand[];
  categories: Category[];
  stores: Store[];
  attributes: Attribute[];
  products: Product[];
  orders: Order[];
  company: Company;
  auditLogs: AuditLog[];
}

const defaultDb: DbSchema = {
  users: [
    {
      id: "u1",
      name: "Super Admin",
      email: "superadmin@admin.com",
      passwordHash: "superadmin", // plain for demo convenience
      role: "superadmin",
      groupId: "g1",
      phone: "+1 (555) 019-2831",
      address: "100 Super HQ, Silicon Valley, CA",
      status: "active",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: "u2",
      name: "Operations Admin",
      email: "admin@admin.com",
      passwordHash: "admin",
      role: "admin",
      groupId: "g2",
      phone: "+1 (555) 018-9900",
      address: "Warehouse B, Los Angeles, CA",
      status: "active",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: "u3",
      name: "Stock Operator",
      email: "user@admin.com",
      passwordHash: "user",
      role: "user",
      groupId: "g3",
      phone: "+1 (555) 011-2244",
      address: "Storefront Alpha, Seattle, WA",
      status: "active",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
    }
  ],
  groups: [
    {
      id: "g1",
      name: "Super Administrator",
      description: "Full master administrative access with system override.",
      permissions: [
        "manage_system_config",
        "manage_users",
        "manage_groups",
        "manage_brands",
        "manage_categories",
        "manage_stores",
        "manage_attributes",
        "manage_products",
        "manage_orders",
        "view_reports",
        "manage_company",
        "view_profile"
      ]
    },
    {
      id: "g2",
      name: "Store Manager (Admin)",
      description: "Administrative operational oversight over products and sales orders.",
      permissions: [
        "manage_users",
        "manage_groups",
        "manage_brands",
        "manage_categories",
        "manage_stores",
        "manage_attributes",
        "manage_products",
        "manage_orders",
        "view_reports",
        "view_profile"
      ]
    },
    {
      id: "g3",
      name: "Staff Operator (User)",
      description: "Employee permissions for stock view and standard order placement.",
      permissions: [
        "view_products",
        "manage_products", // allow user to create/edit stock levels as defined
        "manage_orders",
        "view_reports",
        "view_profile"
      ]
    }
  ],
  brands: [
    { id: "b1", name: "Nike", status: "active" },
    { id: "b2", name: "Apple", status: "active" },
    { id: "b3", name: "Samsung", status: "active" },
    { id: "b4", name: "IKEA", status: "active" },
    { id: "b5", name: "Adidas", status: "active" },
    { id: "b6", name: "Sony", status: "active" },
    { id: "b7", name: "Logitech", status: "active" }
  ],
  categories: [
    { id: "c1", name: "Electronics", status: "active" },
    { id: "c2", name: "Apparel", status: "active" },
    { id: "c3", name: "Home Furniture", status: "active" },
    { id: "c4", name: "Kitchenware", status: "active" }
  ],
  stores: [
    { id: "s1", name: "Main Warehouse (Chicago)", address: "400 Logistics Way, Chicago IL", status: "active" },
    { id: "s2", name: "Los Angeles Showroom", address: "102 Beverly Blvd, Los Angeles CA", status: "active" },
    { id: "s3", name: "London Retail Outlet", address: "15 Oxford St, London UK", status: "active" }
  ],
  attributes: [
    { id: "a1", name: "Size", values: ["S", "M", "L", "XL", "Free Size"], status: "active" },
    { id: "a2", name: "Color", values: ["Black", "White", "Navy", "Silver", "Red"], status: "active" }
  ],
  products: [
    {
      id: "p1",
      name: "Nike Air Max Pro",
      sku: "NK-AM-PRO-01",
      barcode: "847291048291",
      description: "High performance sports sneakers with adaptive cushioning.",
      price: 150,
      buyingPrice: 85,
      qty: 65,
      brandId: "b1",
      categoryId: "c2",
      storeId: "s1",
      attributes: { "Size": "M", "Color": "Navy" },
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80",
      status: "active"
    },
    {
      id: "p2",
      name: "iPhone 15 Pro Max 256GB",
      sku: "AP-IP15-PM",
      barcode: "194253811562",
      description: "Titanium casing flagship smartphone with state-of-the-art triple camera.",
      price: 1199,
      buyingPrice: 820,
      qty: 18,
      brandId: "b2",
      categoryId: "c1",
      storeId: "s1",
      attributes: { "Color": "Silver" },
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80",
      status: "active"
    },
    {
      id: "p3",
      name: "Samsung Galaxy S24 Ultra",
      sku: "SM-S24-ULTRA",
      barcode: "880609530491",
      description: "Premium Android smartphone with integrated S-Pen stylus and smart automation.",
      price: 1299,
      buyingPrice: 900,
      qty: 12,
      brandId: "b3",
      categoryId: "c1",
      storeId: "s2",
      attributes: { "Color": "Black" },
      image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=500&q=80",
      status: "active"
    },
    {
      id: "p4",
      name: "IKEA Poäng Chair",
      sku: "IK-POANG-W",
      barcode: "731894210492",
      description: "Classically designed, highly durable bentwood armchair with premium cover.",
      price: 110,
      buyingPrice: 60,
      qty: 4,
      brandId: "b4",
      categoryId: "c3",
      storeId: "s3",
      attributes: { "Color": "White" },
      image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=500&q=80",
      status: "active"
    },
    {
      id: "p5",
      name: "Sony WH-1000XM5 ANC Headphones",
      sku: "SN-WH1000-XM5",
      barcode: "454873613255",
      description: "Industry leading active noise canceling wireless headphones with crystal audio.",
      price: 399,
      buyingPrice: 220,
      qty: 25,
      brandId: "b6",
      categoryId: "c1",
      storeId: "s1",
      attributes: { "Color": "Black" },
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80",
      status: "active"
    },
    {
      id: "p6",
      name: "Logitech MX Master 3S Mouse",
      sku: "LT-MXMAS-3S",
      barcode: "097855175519",
      description: "Ergonomic high precision master series office wireless scroll mouse.",
      price: 99,
      buyingPrice: 45,
      qty: 45,
      brandId: "b7",
      categoryId: "c1",
      storeId: "s1",
      attributes: { "Color": "White" },
      image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=500&q=80",
      status: "active"
    }
  ],
  orders: [
    {
      id: "o1",
      orderNo: "ORD-2026-0001",
      date: "2026-04-12T14:32:00.000Z",
      customerName: "Global Retailers Ltd",
      customerPhone: "+1 (555) 728-1920",
      customerAddress: "404 Commerce St, Boston MA",
      items: [
        {
          id: "oi1",
          productId: "p1",
          name: "Nike Air Max Pro",
          sku: "NK-AM-PRO-01",
          qty: 15,
          rate: 150,
          amount: 2250
        }
      ],
      subtotal: 2250,
      vatPercent: 12,
      vatAmount: 270,
      serviceChargePercent: 5,
      serviceChargeAmount: 112.5,
      discount: 100,
      netAmount: 2532.5,
      status: "paid",
      orderType: "sales",
      userId: "u2",
      userName: "Operations Admin"
    },
    {
      id: "o2",
      orderNo: "ORD-2026-0002",
      date: "2026-05-18T10:15:00.000Z",
      customerName: "Super Distributing Corp",
      customerPhone: "+1 (555) 432-1090",
      customerAddress: "Warehouse 4, Detroit MI",
      items: [
        {
          id: "oi2",
          productId: "p2",
          name: "iPhone 15 Pro Max 256GB",
          sku: "AP-IP15-PM",
          qty: 5,
          rate: 1199,
          amount: 5995
        },
        {
          id: "oi3",
          productId: "p3",
          name: "Samsung Galaxy S24 Ultra",
          sku: "SM-S24-ULTRA",
          qty: 2,
          rate: 1299,
          amount: 2598
        }
      ],
      subtotal: 8593,
      vatPercent: 12,
      vatAmount: 1031.16,
      serviceChargePercent: 5,
      serviceChargeAmount: 429.65,
      discount: 250,
      netAmount: 9803.81,
      status: "paid",
      orderType: "sales",
      userId: "u1",
      userName: "Super Admin"
    },
    {
      id: "o3",
      orderNo: "ORD-2026-06-03",
      date: "2026-06-12T09:00:00.000Z",
      customerName: "Apple Wholesale Inc",
      customerPhone: "+1-800-MY-APPLE",
      customerAddress: "One Infinite Loop, Cupertino",
      items: [
        {
          id: "oi4",
          productId: "p2",
          name: "iPhone 15 Pro Max 256GB",
          sku: "AP-IP15-PM",
          qty: 10,
          rate: 820,
          amount: 8200
        }
      ],
      subtotal: 8200,
      vatPercent: 0,
      vatAmount: 0,
      serviceChargePercent: 0,
      serviceChargeAmount: 0,
      discount: 0,
      netAmount: 8200,
      status: "paid",
      orderType: "purchase",
      userId: "u2",
      userName: "Operations Admin"
    }
  ],
  company: {
    name: "Apex Logistics Corp",
    address: "220 Industrial Parkway, Chicago, IL 60601",
    phone: "+1 (312) 555-0150",
    vatPercent: 12,
    serviceChargePercent: 5,
    currency: "USD",
    footerText: "Thank you for partnering with Apex Logistics Corp."
  },
  auditLogs: [
    {
      id: "log1",
      userEmail: "superadmin@admin.com",
      userName: "Super Admin",
      userRole: "superadmin",
      action: "System Initialized",
      module: "Settings",
      timestamp: "2026-04-01T08:00:00.000Z",
      details: "Database pre-hydrated with initial corporate assets."
    }
  ]
};

// Helper inside container to read/write JSON
function readDb(): DbSchema {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data) as DbSchema;
    }
  } catch (error) {
    console.warn("Failed reading data file, using default DB schema", error);
  }
  
  // write defaultDb on startup
  writeDb(defaultDb);
  return defaultDb;
}

function writeDb(db: DbSchema): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error("Failed writing data file", error);
  }
}

// Export database operations
export const db = {
  getUsers: () => readDb().users,
  addUser: (user: User & { passwordHash: string }) => {
    const current = readDb();
    current.users.push(user);
    writeDb(current);
  },
  updateUser: (id: string, updated: Partial<User & { passwordHash: string }>) => {
    const current = readDb();
    const idx = current.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      current.users[idx] = { ...current.users[idx], ...updated };
      writeDb(current);
      return current.users[idx];
    }
    return null;
  },
  deleteUser: (id: string) => {
    const current = readDb();
    current.users = current.users.filter(u => u.id !== id);
    writeDb(current);
  },

  getGroups: () => readDb().groups,
  addGroup: (group: Group) => {
    const current = readDb();
    current.groups.push(group);
    writeDb(current);
  },
  updateGroup: (id: string, updated: Partial<Group>) => {
    const current = readDb();
    const idx = current.groups.findIndex(g => g.id === id);
    if (idx !== -1) {
      current.groups[idx] = { ...current.groups[idx], ...updated };
      writeDb(current);
      return current.groups[idx];
    }
    return null;
  },
  deleteGroup: (id: string) => {
    const current = readDb();
    current.groups = current.groups.filter(g => g.id !== id);
    writeDb(current);
  },

  getBrands: () => readDb().brands,
  addBrand: (brand: Brand) => {
    const current = readDb();
    current.brands.push(brand);
    writeDb(current);
  },
  updateBrand: (id: string, updated: Partial<Brand>) => {
    const current = readDb();
    const idx = current.brands.findIndex(b => b.id === id);
    if (idx !== -1) {
      current.brands[idx] = { ...current.brands[idx], ...updated };
      writeDb(current);
      return current.brands[idx];
    }
    return null;
  },
  deleteBrand: (id: string) => {
    const current = readDb();
    current.brands = current.brands.filter(b => b.id !== id);
    writeDb(current);
  },

  getCategories: () => readDb().categories,
  addCategory: (category: Category) => {
    const current = readDb();
    current.categories.push(category);
    writeDb(current);
  },
  updateCategory: (id: string, updated: Partial<Category>) => {
    const current = readDb();
    const idx = current.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      current.categories[idx] = { ...current.categories[idx], ...updated };
      writeDb(current);
      return current.categories[idx];
    }
    return null;
  },
  deleteCategory: (id: string) => {
    const current = readDb();
    current.categories = current.categories.filter(c => c.id !== id);
    writeDb(current);
  },

  getStores: () => readDb().stores,
  addStore: (store: Store) => {
    const current = readDb();
    current.stores.push(store);
    writeDb(current);
  },
  updateStore: (id: string, updated: Partial<Store>) => {
    const current = readDb();
    const idx = current.stores.findIndex(s => s.id === id);
    if (idx !== -1) {
      current.stores[idx] = { ...current.stores[idx], ...updated };
      writeDb(current);
      return current.stores[idx];
    }
    return null;
  },
  deleteStore: (id: string) => {
    const current = readDb();
    current.stores = current.stores.filter(s => s.id !== id);
    writeDb(current);
  },

  getAttributes: () => readDb().attributes,
  addAttribute: (attr: Attribute) => {
    const current = readDb();
    current.attributes.push(attr);
    writeDb(current);
  },
  updateAttribute: (id: string, updated: Partial<Attribute>) => {
    const current = readDb();
    const idx = current.attributes.findIndex(a => a.id === id);
    if (idx !== -1) {
      current.attributes[idx] = { ...current.attributes[idx], ...updated };
      writeDb(current);
      return current.attributes[idx];
    }
    return null;
  },
  deleteAttribute: (id: string) => {
    const current = readDb();
    current.attributes = current.attributes.filter(a => a.id !== id);
    writeDb(current);
  },

  getProducts: () => readDb().products,
  addProduct: (product: Product) => {
    const current = readDb();
    current.products.push(product);
    writeDb(current);
  },
  updateProduct: (id: string, updated: Partial<Product>) => {
    const current = readDb();
    const idx = current.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      current.products[idx] = { ...current.products[idx], ...updated };
      writeDb(current);
      return current.products[idx];
    }
    return null;
  },
  deleteProduct: (id: string) => {
    const current = readDb();
    current.products = current.products.filter(p => p.id !== id);
    writeDb(current);
  },

  getOrders: () => readDb().orders,
  addOrder: (order: Order) => {
    const current = readDb();
    current.orders.push(order);
    
    // adjust product stock levels automatically if it is a Sales or Purchase order
    order.items.forEach(item => {
      const pIdx = current.products.findIndex(p => p.id === item.productId);
      if (pIdx !== -1) {
        if (order.orderType === 'sales') {
          current.products[pIdx].qty = Math.max(0, current.products[pIdx].qty - item.qty);
        } else {
          current.products[pIdx].qty += item.qty;
        }
      }
    });

    writeDb(current);
  },
  updateOrder: (id: string, updated: Partial<Order>) => {
    const current = readDb();
    const idx = current.orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      current.orders[idx] = { ...current.orders[idx], ...updated };
      writeDb(current);
      return current.orders[idx];
    }
    return null;
  },
  deleteOrder: (id: string) => {
    const current = readDb();
    current.orders = current.orders.filter(o => o.id !== id);
    writeDb(current);
  },

  getCompany: () => readDb().company,
  updateCompany: (updated: Partial<Company>) => {
    const current = readDb();
    current.company = { ...current.company, ...updated };
    writeDb(current);
    return current.company;
  },

  getAuditLogs: () => readDb().auditLogs,
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const current = readDb();
    const newLog: AuditLog = {
      ...log,
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString()
    };
    current.auditLogs.unshift(newLog); // Put news at top
    // Trim logs count for convenience
    if (current.auditLogs.length > 500) {
      current.auditLogs = current.auditLogs.slice(0, 500);
    }
    writeDb(current);
  }
};
