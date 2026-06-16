import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Printer, 
  ArrowLeft, 
  ShoppingCart, 
  Briefcase, 
  Check, 
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
  Phone,
  MapPin,
  Calendar,
  X,
  CreditCard,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { Order, OrderItem, Product, User, Company } from '../types';

interface OrdersViewProps {
  currentUser: User;
  company: Company;
  onRefreshStats: () => void;
}

export default function OrdersView({ currentUser, company, onRefreshStats }: OrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'sales' | 'purchase'>('all');
  
  // Invoice viewing details hook
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // CREATE ORDER FORM STATES:
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderType, setOrderType] = useState<'sales' | 'purchase'>('sales');
  const [orderStatus, setOrderStatus] = useState<'paid' | 'unpaid'>('paid');
  const [discount, setDiscount] = useState<number>(0);
  
  // Active custom item builder
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState<number>(1);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/products')
      ]);

      if (!ordersRes.ok || !productsRes.ok) {
        throw new Error('Failed to download active transactions folders and available products.');
      }

      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();

      setOrders(ordersData);
      setProducts(productsData);
    } catch (err: any) {
      setError(err.message || 'Error occurred during orders retrieval.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCartItem = () => {
    if (!selectedProductId) return;
    
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    // Guard stock level if Sales Order
    if (orderType === 'sales' && prod.qty < selectedQty) {
      alert(`Critical Guard: Target stock level for '${prod.name}' is too low (${prod.qty} units left), you requested ${selectedQty} units.`);
      return;
    }

    // Check duplicate
    const existsIdx = cartItems.findIndex(item => item.productId === selectedProductId);
    const billingRate = orderType === 'sales' ? prod.price : prod.buyingPrice;

    if (existsIdx !== -1) {
      const updated = [...cartItems];
      const newQty = updated[existsIdx].qty + selectedQty;
      
      if (orderType === 'sales' && prod.qty < newQty) {
        alert(`Critical Guard: Aggregating item exceeds present catalog volume index limit.`);
        return;
      }
      
      updated[existsIdx].qty = newQty;
      updated[existsIdx].amount = newQty * billingRate;
      setCartItems(updated);
    } else {
      const newItem: OrderItem = {
        id: 'oi_' + Date.now() + '_' + Math.floor(Math.random() * 100),
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        qty: selectedQty,
        rate: billingRate,
        amount: selectedQty * billingRate
      };
      setCartItems([...cartItems, newItem]);
    }

    // resetting selection hooks
    setSelectedProductId('');
    setSelectedQty(1);
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  // Math calculator
  const subtotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = Math.round((subtotal * (company.vatPercent / 100)) * 100) / 100;
  const serviceChargeAmount = Math.round((subtotal * (company.serviceChargePercent / 100)) * 100) / 100;
  const netAmount = Math.max(0, Math.round((subtotal + vatAmount + serviceChargeAmount - discount) * 100) / 100);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setError('You must insert at least 1 item to formulate a valid logistics transition order.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const payload = {
        order: {
          customerName,
          customerPhone,
          customerAddress,
          items: cartItems,
          subtotal,
          vatPercent: company.vatPercent,
          vatAmount,
          serviceChargePercent: company.serviceChargePercent,
          serviceChargeAmount,
          discount,
          netAmount,
          status: orderStatus,
          orderType
        },
        operator: {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role
        }
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Database server denied ledger adjustments request.');
      }

      setSuccess(`Transaction order instantiated successfully. Stock levels auto-balanced.`);
      
      // Clear forms
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCartItems([]);
      setDiscount(0);
      
      // Redirect
      setActiveTab('list');
      loadData();
      onRefreshStats();
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving transaction order.');
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNo: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete transaction ledger record '${orderNo}'? Warning: This does not restore back-dated modified quantities.`)) {
      return;
    }

    try {
      setError(null);
      const url = `/api/orders/${orderId}?userEmail=${encodeURIComponent(currentUser.email)}&userName=${encodeURIComponent(currentUser.name)}&userRole=${encodeURIComponent(currentUser.role)}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to execute command on live express router.');
      }

      setSuccess(`Record for order '${orderNo}' erased successfully.`);
      loadData();
      onRefreshStats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateOrderStatus = async (order: Order, newStatus: 'paid' | 'unpaid' | 'cancelled') => {
    try {
      setError(null);
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: { ...order, status: newStatus },
          operator: { email: currentUser.email, name: currentUser.name, role: currentUser.role }
        })
      });

      if (!response.ok) throw new Error('Failed updating status codes.');

      setSuccess(`Ledger updated for order '${order.orderNo}'`);
      loadData();
      if (viewingOrder && viewingOrder.id === order.id) {
        setViewingOrder({ ...viewingOrder, status: newStatus });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const currencySymbol = company.currency === 'USD' ? '$' : company.currency + ' ';

  // Filter lists
  const filteredOrders = orders.filter(o => {
    if (orderTypeFilter === 'all') return true;
    return o.orderType === orderTypeFilter;
  });

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Top Banner Navigation bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-650" />
            TRANSACTIONAL ORDERS LEDGER
          </h1>
          <p className="text-sm text-slate-500 mt-1">Record client sales invoices, supplier procurement purchase requests, and live corporate financial journals.</p>
        </div>

        <div className="flex gap-2.5">
          {activeTab === 'list' ? (
            <button
              onClick={() => setActiveTab('create')}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:translate-y-px"
            >
              <Plus className="w-4 h-4" /> Record New Order
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('list')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Ledger Cards
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-lg flex items-center justify-between shadow-xs animate-fade-in">
          <span className="text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" /> {success}
          </span>
          <button onClick={() => setSuccess(null)} className="text-xs text-slate-400 font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-250 text-red-850 rounded-lg flex items-center justify-between shadow-xs animate-fade-in">
          <span className="text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" /> {error}
          </span>
          <button onClick={() => setError(null)} className="text-xs text-slate-400 font-bold">✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION: LIST VIEW */}
      {/* ======================================================== */}
      {activeTab === 'list' ? (
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          
          {/* List Toolbar filters */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/40">
            <div>
              <h3 className="font-bold text-slate-800">Corporate Transaction Ledger</h3>
              <p className="text-xs text-slate-405 mt-0.5">Filter by Sales output or Procurement Purchases input.</p>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
              <button
                onClick={() => setOrderTypeFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${orderTypeFilter === 'all' ? 'bg-white text-slate-800' : 'text-slate-500 hover:text-slate-900'}`}
              >
                All Orders
              </button>
              <button
                onClick={() => setOrderTypeFilter('sales')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-1 ${orderTypeFilter === 'sales' ? 'bg-indigo-650 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <TrendingUp className="w-3 h-3" /> Sales Invoices
              </button>
              <button
                onClick={() => setOrderTypeFilter('purchase')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-1 ${orderTypeFilter === 'purchase' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <TrendingDown className="w-3 h-3" /> Procurements
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20 bg-white">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3"></div>
              <p className="text-slate-500 text-xs">Syncing corporate balance logs...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/30 text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    <th className="p-4">Transaction Code</th>
                    <th className="p-4">Record Timestamp</th>
                    <th className="p-4">Customer / Supplier</th>
                    <th className="p-4">Item Scope</th>
                    <th className="p-4">Total Net Amount</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const isSalesObj = order.orderType === 'sales';
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isSalesObj ? 'bg-indigo-600' : 'bg-slate-500'}`}></span>
                            <div>
                              <p className="font-bold text-slate-800 text-sm font-sans tracking-tight leading-none">{order.orderNo}</p>
                              <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isSalesObj ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                {order.orderType === 'sales' ? '💸 SALES OUT' : '📥 procurement in'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-slate-655 font-mono">
                          {new Date(order.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-slate-850 text-xs leading-normal">{order.customerName}</p>
                          {order.customerPhone && <span className="text-[10px] text-slate-400 font-medium block mt-0.5">📞 {order.customerPhone}</span>}
                        </td>

                        <td className="p-4">
                          <span className="font-bold text-slate-700">
                            {order.items.reduce((sum, item) => sum + item.qty, 0)} items 
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 max-w-[150px] truncate">
                            {order.items.map(i => i.name).join(', ')}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                            {currencySymbol}{order.netAmount.toLocaleString()}
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            order.status === 'paid' ? 'bg-emerald-100 text-emerald-850' : 
                            order.status === 'unpaid' ? 'bg-amber-100 text-amber-850' : 
                            'bg-red-100 text-red-850'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${order.status === 'paid' ? 'bg-emerald-600' : order.status === 'unpaid' ? 'bg-amber-600 animate-pulse' : 'bg-red-650'}`}></span>
                            {order.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingOrder(order)}
                              title="Inspect full Invoice details"
                              className="p-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-lg flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View</span>
                            </button>
                            
                            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteOrder(order.id, order.orderNo)}
                                title="Purge records from database"
                                className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <Inbox className="w-12 h-12 text-slate-205 mb-2" />
              <p className="text-xs font-semibold">Ledger holds no transaction orders matching filters.</p>
            </div>
          )}

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-[11px] text-slate-400">
            <span>Aggregated Orders Count: <strong>{orders.length}</strong></span>
            <span>Real-time persistence layer active</span>
          </div>

        </div>

      ) : (

        // ========================================================
        // SECTION: CREATE TRANSACTION FORM
        // ========================================================
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-xs">
          
          {/* Order Metadata and Items Insertion Form */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-650" />
              PRODUCE DYNAMIC INVENTORY TRANSACTION
            </h3>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Choose Ledger Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setOrderType('sales'); setCartItems([]); }}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${orderType === 'sales' ? 'bg-indigo-950/20 border-indigo-500 text-indigo-850 font-bold' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sales (Invoices Out)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOrderType('purchase'); setCartItems([]); }}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${orderType === 'purchase' ? 'bg-indigo-950/20 border-indigo-500 text-indigo-850 font-bold' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-slate-600" />
                    <span>Purchase (Procure In)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Operational Payment Status</label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs outline-none cursor-pointer font-bold text-slate-750"
                >
                  <option value="paid">Paid (Close balance sheet block)</option>
                  <option value="unpaid">Unpaid (Create debit warning)</option>
                </select>
              </div>
            </div>

            {/* Client Details Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-widest text-[9px]">Client / Procurement Partner Metadata</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{orderType === 'sales' ? 'Customer Full Name *' : 'Supplier Company Name *'}</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none focus:bg-white"
                    placeholder={orderType === 'sales' ? "e.g. Acme Retailers Ltd" : "e.g. Apple Wholesale Inc"}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none focus:bg-white"
                    placeholder="+1 (555) 019-4820"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Logistics Shipment Destination Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-lg text-xs outline-none focus:bg-white"
                  placeholder="Street and Postal ZIP coordinate maps"
                />
              </div>
            </div>

            {/* Interactive Search-Select Items Builder Component */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-705 text-[11px] uppercase tracking-widest text-[9px]">Insert Products into Ledger Cartesian list</h4>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Catalog Item</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
                  >
                    <option value="">-- Choose target catalog item --</option>
                    {products
                      .filter(p => p.status === 'active')
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.sku}] - {orderType === 'sales' ? `Price: $${p.price} (In Stock: ${p.qty})` : `Buying cost: $${p.buyingPrice}`}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="w-full sm:w-28 shrink-0">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Quantity Units</label>
                  <input
                    type="number"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none"
                    min={1}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddCartItem}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg flex items-center justify-center gap-1 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cartesian Item Roster Table list */}
            <div className="pt-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-[9px]">Cartesian list items proposed</label>
              
              {cartItems.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                        <th className="p-3">Product Name</th>
                        <th className="p-3">SKU Code</th>
                        <th className="p-3 text-center">Qty Units</th>
                        <th className="p-3">Unit Cost Rate</th>
                        <th className="p-3">Total Cost</th>
                        <th className="p-3 text-right">Delete Item</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cartItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="p-3 font-mono text-slate-500">{item.sku}</td>
                          <td className="p-3 text-center font-bold">{item.qty}</td>
                          <td className="p-3 font-medium text-slate-600">${item.rate}</td>
                          <td className="p-3 font-bold text-slate-750">${item.amount}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(item.id)}
                              className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-250 rounded-lg text-slate-400 font-medium">
                  Ledger Cart is currently empty. Insert items from catalog above.
                </div>
              )}
            </div>

          </div>

          {/* Checkout parameters right column */}
          <div className="lg:col-span-4 bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-800 flex flex-col justify-between selection:bg-indigo-650">
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Balance sheet Preview</span>
                <span className="text-[10px] text-slate-500 uppercase">{orderType === 'sales' ? 'Invoice' : 'Procure'} Sheet</span>
              </div>

              {/* Dynamic Math calculations outputs */}
              <div className="space-y-3.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-100">${subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-400">
                  <span>VAT ({company.vatPercent}%):</span>
                  <span className="font-mono text-slate-100">${vatAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-400">
                  <span>Service Surcharge ({company.serviceChargePercent}%):</span>
                  <span className="font-mono text-slate-100">${serviceChargeAmount.toLocaleString()}</span>
                </div>

                <div className="pt-2.5 border-t border-slate-800 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-slate-350">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Dynamic Discount deduction:</span>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">$</span>
                      <input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-950 border border-slate-805 text-slate-100 pl-6 pr-2 py-1.5 rounded text-right text-xs outline-none"
                        min={0}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed border-slate-800 flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculated net Amount:</span>
                  <span className="text-3xl font-extrabold text-indigo-405 tracking-tight font-sans">
                    {currencySymbol}{netAmount.toLocaleString()}
                  </span>
                </div>

              </div>
              
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 text-[11px] text-slate-400 mt-4 leading-relaxed">
                📢 <strong>Stock balancer protocol:</strong> Upon submitting, physical quantities inside depot catalog files will be auto-adjusted to lock logistics consistency.
              </div>
            </div>

            <div className="pt-8 space-y-3">
              <button
                type="button"
                onClick={handleSubmitOrder}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-500 font-bold text-white text-xs rounded-lg transition-transform active:translate-y-px shadow-lg"
              >
                Submit and Commit Ledger Order
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('list'); setError(null); }}
                className="w-full py-2 bg-transparent text-slate-400 hover:text-white transition-colors text-xs font-bold text-center"
              >
                Discard Draft Configuration
              </button>
            </div>

          </div>

        </div>

      )}

      {/* ======================================================== */}
      {/* HIGH FIDELITY PRINTABLE INVOICE RECEIPT MODAL */}
      {/* ======================================================== */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-905/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 selection:bg-indigo-600 selection:text-white text-slate-900 leading-normal">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xl w-full max-w-2xl overflow-hidden animate-zoom-in flex flex-col max-h-[90vh]">
            
            {/* Modal Controls toolbar */}
            <div className="p-4 bg-slate-900 text-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight">Invoice Receipt: {viewingOrder.orderNo}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${viewingOrder.status === 'paid' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                  {viewingOrder.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-705 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>
                <button 
                  onClick={() => setViewingOrder(null)} 
                  className="text-slate-400 hover:text-white font-extrabold text-sm px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Actual receipt body */}
            <div className="p-8 overflow-y-auto space-y-8 flex-1" id="printable-invoice-block">
              {/* Receipt Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <span className="text-lg font-black tracking-tight text-slate-900 uppercase">{company.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">{company.address}</p>
                  <p className="text-[11px] text-slate-500">Corporate hotline: {company.phone}</p>
                </div>

                <div className="text-right">
                  <h2 className="text-2xl font-black text-indigo-750 uppercase tracking-tight">
                    {viewingOrder.orderType === 'sales' ? 'Sales Invoice' : 'Purchase Order'}
                  </h2>
                  <p className="text-xs font-bold text-slate-850 mt-1">Order ID: <span className="font-mono text-slate-700">{viewingOrder.orderNo}</span></p>
                  <p className="text-[11px] text-slate-400 mt-1">Printed UTC: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* metadata columns */}
              <div className="grid grid-cols-2 gap-8 p-4 bg-slate-50 rounded-xl border border-slate-205">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{viewingOrder.orderType === 'sales' ? 'Sold Clients Receiver:' : 'Supplier Merchant:'}</p>
                  <p className="text-sm font-extrabold text-slate-900">{viewingOrder.customerName}</p>
                  {viewingOrder.customerPhone && <p className="text-xs text-slate-500">Phone: {viewingOrder.customerPhone}</p>}
                  {viewingOrder.customerAddress && <p className="text-xs text-slate-500">Destination: {viewingOrder.customerAddress}</p>}
                </div>

                <div className="space-y-1 text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logistics Dispatcher:</p>
                  <p className="text-xs font-bold text-slate-850">{viewingOrder.userName || 'System Operator'}</p>
                  <p className="text-[11px] text-slate-500">Instance server: Central Hub</p>
                  <p className="text-xs text-slate-500 mt-1">Transaction date: {new Date(viewingOrder.date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Items Table details */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-[10px] font-bold text-slate-550 uppercase">
                    <th className="py-2.5">Specific SKU</th>
                    <th className="py-2.5">Merchandise Product Title</th>
                    <th className="py-2.5 text-center">Unit Qty</th>
                    <th className="py-2.5">Unit Rate</th>
                    <th className="py-2.5 text-right">Aggregate Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewingOrder.items && viewingOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 font-mono text-slate-500">{item.sku}</td>
                      <td className="py-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 text-center font-bold">{item.qty}</td>
                      <td className="py-3">${item.rate}</td>
                      <td className="py-3 text-right font-bold text-slate-800">${item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals dynamic summary */}
              <div className="pt-4 border-t border-slate-250 flex justify-end">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal cost:</span>
                    <span className="font-bold">${viewingOrder.subtotal?.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-500">
                    <span>VAT ({viewingOrder.vatPercent}%):</span>
                    <span>${viewingOrder.vatAmount?.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-500">
                    <span>Service Charge ({viewingOrder.serviceChargePercent}%):</span>
                    <span>${viewingOrder.serviceChargeAmount?.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-550">
                    <span>Discount subtraction:</span>
                    <span className="text-red-600">-${viewingOrder.discount?.toLocaleString()}</span>
                  </div>

                  <div className="pt-3 border-t-2 border-slate-300 flex justify-between text-sm font-extrabold text-slate-900">
                    <span className="uppercase text-[11px] tracking-wider">BALANCE NET DUE:</span>
                    <span className="text-xl text-indigo-750 font-sans">{currencySymbol}{viewingOrder.netAmount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Receipt footer text notes */}
              <div className="pt-10 border-t border-slate-100 text-center text-[10px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600">{company.footerText || ` Apex Logistics Corp. All rights reserved.`}</p>
                <p>Authenticity verified dynamically via SHA256 checksum tags logs block.</p>
              </div>

            </div>

            {/* Quick status change inside preview */}
            <div className="p-4 bg-slate-50 border-t border-slate-205 flex justify-between items-center text-xs shrink-0">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Adjust Ledger Code Status:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(viewingOrder, 'paid')}
                  className={`px-3 py-1 font-bold rounded ${viewingOrder.status === 'paid' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  Paid
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(viewingOrder, 'unpaid')}
                  className={`px-3 py-1 font-bold rounded ${viewingOrder.status === 'unpaid' ? 'bg-amber-600 text-white' : 'bg-slate-205 text-slate-750 hover:bg-slate-300'}`}
                >
                  Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateOrderStatus(viewingOrder, 'cancelled')}
                  className={`px-3 py-1 font-bold rounded ${viewingOrder.status === 'cancelled' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  Cancelled
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
