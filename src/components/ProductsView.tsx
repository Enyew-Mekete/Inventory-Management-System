import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Folders, 
  Tag, 
  MapPin, 
  Sliders, 
  Search, 
  Filter, 
  ShoppingBag,
  ListFilter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  Barcode,
  Image as ImageIcon
} from 'lucide-react';
import { Product, Category, Brand, Store, Attribute, User } from '../types';

interface ProductsViewProps {
  currentUser: User;
  onRefreshStats: () => void;
}

type SubTab = 'products' | 'categories' | 'brands' | 'stores' | 'attributes';

export default function ProductsView({ currentUser, onRefreshStats }: ProductsViewProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals visibility toggles
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);

  // Edit targets
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);

  // FORM STATES: 1. Product Form
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    price: 0,
    buyingPrice: 0,
    qty: 0,
    brandId: '',
    categoryId: '',
    storeId: '',
    image: '',
    status: 'active' as 'active' | 'inactive',
    attributes: {} as Record<string, string>
  });

  // FORM STATES: 2. Category Form
  const [catForm, setCatForm] = useState({ name: '', status: 'active' as 'active' | 'inactive' });

  // FORM STATES: 3. Brand Form
  const [brandForm, setBrandForm] = useState({ name: '', status: 'active' as 'active' | 'inactive' });

  // FORM STATES: 4. Store Form
  const [storeForm, setStoreForm] = useState({ name: '', address: '', status: 'active' as 'active' | 'inactive' });

  // FORM STATES: 5. Attribute Form
  const [attrForm, setAttrForm] = useState({ name: '', valuesString: '', status: 'active' as 'active' | 'inactive' });

  const loadAllInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pRes, cRes, bRes, sRes, aRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/brands'),
        fetch('/api/stores'),
        fetch('/api/attributes'),
      ]);

      if (!pRes.ok || !cRes.ok || !bRes.ok || !sRes.ok || !aRes.ok) {
        throw new Error('Some remote datasets could not be resolved by server.');
      }

      const pData = await pRes.json();
      const cData = await cRes.json();
      const bData = await bRes.json();
      const sData = await sRes.json();
      const aData = await aRes.json();

      setProducts(pData);
      setCategories(cData);
      setBrands(bData);
      setStores(sData);
      setAttributes(aData);
    } catch (err: any) {
      setError(err.message || 'Telemetry connection broken.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllInventoryData();
  }, []);

  // --- PRODUCT MANAGEMENT OPERATIONS ---
  const handleOpenProductModal = (product: Product | null = null) => {
    setError(null);
    if (product) {
      setSelectedProduct(product);
      setProdForm({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        description: product.description || '',
        price: product.price,
        buyingPrice: product.buyingPrice,
        qty: product.qty,
        brandId: product.brandId || (brands[0]?.id || ''),
        categoryId: product.categoryId || (categories[0]?.id || ''),
        storeId: product.storeId || (stores[0]?.id || ''),
        image: product.image || '',
        status: product.status,
        attributes: product.attributes || {}
      });
    } else {
      setSelectedProduct(null);
      setProdForm({
        name: '',
        sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
        barcode: String(Math.floor(100000000000 + Math.random() * 900000000000)),
        description: '',
        price: 0,
        buyingPrice: 0,
        qty: 0,
        brandId: brands[0]?.id || '',
        categoryId: categories[0]?.id || '',
        storeId: stores[0]?.id || '',
        image: '',
        status: 'active',
        attributes: {}
      });
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!selectedProduct;
      const url = isEdit ? `/api/products/${selectedProduct.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            ...prodForm,
            // Fallback default image in case user paste invalid url
            image: prodForm.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80'
          },
          operator: {
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record current product specifications sheet.');
      }

      setSuccess(`Product '${prodForm.name}' saved successfully in catalog.`);
      setIsProductModalOpen(false);
      loadAllInventoryData();
      onRefreshStats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete '${productName}' from systems database files?`)) {
      return;
    }

    try {
      setError(null);
      const url = `/api/products/${productId}?userEmail=${encodeURIComponent(currentUser.email)}&userName=${encodeURIComponent(currentUser.name)}&userRole=${encodeURIComponent(currentUser.role)}`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Conflict error: Database restricts item deletion due to active links or transaction logs.');
      }

      setSuccess(`Product '${productName}' permanently terminated from warehouse listings.`);
      loadAllInventoryData();
      onRefreshStats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- CATEGORIES OPERATIONS ---
  const handleOpenCategoryModal = (cat: Category | null = null) => {
    setError(null);
    if (cat) {
      setSelectedCategory(cat);
      setCatForm({ name: cat.name, status: cat.status });
    } else {
      setSelectedCategory(null);
      setCatForm({ name: '', status: 'active' });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!selectedCategory;
      const url = isEdit ? `/api/categories/${selectedCategory.id}` : '/api/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: catForm,
          operator: { email: currentUser.email, name: currentUser.name, role: currentUser.role }
        })
      });

      if (!response.ok) throw new Error('Data transmission error');

      setSuccess(`Category '${catForm.name}' saved.`);
      setIsCategoryModalOpen(false);
      loadAllInventoryData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    // defend referenced categories
    const referenced = products.filter(p => p.categoryId === id);
    if (referenced.length > 0) {
      alert(`Access Forbidden: Category '${name}' is currently linked to ${referenced.length} products. Re-route products before deletion.`);
      return;
    }

    if (!window.confirm(`Permanently drop category ${name}?`)) return;

    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete');
      setSuccess(`Category '${name}' deleted.`);
      loadAllInventoryData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- BRANDS OPERATIONS ---
  const handleOpenBrandModal = (b: Brand | null = null) => {
    setError(null);
    if (b) {
      setSelectedBrand(b);
      setBrandForm({ name: b.name, status: b.status });
    } else {
      setSelectedBrand(null);
      setBrandForm({ name: '', status: 'active' });
    }
    setIsBrandModalOpen(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!selectedBrand;
      const url = isEdit ? `/api/brands/${selectedBrand.id}` : '/api/brands';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: brandForm,
          operator: { email: currentUser.email, name: currentUser.name, role: currentUser.role }
        })
      });

      if (!response.ok) throw new Error('Error processing petition.');

      setSuccess(`Brand '${brandForm.name}' configured.`);
      setIsBrandModalOpen(false);
      loadAllInventoryData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    const referenced = products.filter(p => p.brandId === id);
    if (referenced.length > 0) {
      alert(`Action Cancelled: Brand '${name}' is currently configured on ${referenced.length} products system-wide.`);
      return;
    }
    if (!window.confirm(`Delete brand ${name}?`)) return;

    try {
      await fetch(`/api/brands/${id}`, { method: 'DELETE' });
      setSuccess(`Brand '${name}' removed.`);
      loadAllInventoryData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- STORES/WAREHOUSES OPERATIONS ---
  const handleOpenStoreModal = (s: Store | null = null) => {
    setError(null);
    if (s) {
      setSelectedStore(s);
      setStoreForm({ name: s.name, address: s.address || '', status: s.status });
    } else {
      setSelectedStore(null);
      setStoreForm({ name: '', address: '', status: 'active' });
    }
    setIsStoreModalOpen(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!selectedStore;
      const url = isEdit ? `/api/stores/${selectedStore.id}` : '/api/stores';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: storeForm,
          operator: { email: currentUser.email, name: currentUser.name, role: currentUser.role }
        })
      });

      if (!response.ok) throw new Error('Could not save depot details');

      setSuccess(`Depot '${storeForm.name}' saved.`);
      setIsStoreModalOpen(false);
      loadAllInventoryData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteStore = async (id: string, name: string) => {
    const referenced = products.filter(p => p.storeId === id);
    if (referenced.length > 0) {
      alert(`Declined: Depot is currently holding ${referenced.length} stock products.`);
      return;
    }
    if (!window.confirm(`Decommission store '${name}'?`)) return;

    try {
      await fetch(`/api/stores/${id}`, { method: 'DELETE' });
      setSuccess(`Warehouse store '${name}' deleted.`);
      loadAllInventoryData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- ATTRIBUTES OPERATIONS ---
  const handleOpenAttributeModal = (a: Attribute | null = null) => {
    setError(null);
    if (a) {
      setSelectedAttribute(a);
      setAttrForm({ name: a.name, valuesString: a.values.join(', '), status: a.status });
    } else {
      setSelectedAttribute(null);
      setAttrForm({ name: '', valuesString: '', status: 'active' });
    }
    setIsAttributeModalOpen(true);
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!selectedAttribute;
      const url = isEdit ? `/api/attributes/${selectedAttribute.id}` : '/api/attributes';
      const method = isEdit ? 'PUT' : 'POST';

      // split tags
      const arr = attrForm.valuesString.split(',').map(s => s.trim()).filter(Boolean);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attribute: {
            name: attrForm.name,
            status: attrForm.status,
            values: arr
          },
          operator: { email: currentUser.email, name: currentUser.name, role: currentUser.role }
        })
      });

      if (!response.ok) throw new Error('Server error writing variants specifications.');

      setSuccess(`Variant Attribute '${attrForm.name}' configured.`);
      setIsAttributeModalOpen(false);
      loadAllInventoryData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAttribute = async (id: string, name: string) => {
    if (!window.confirm(`Delete attribute tag '${name}'?`)) return;
    try {
      await fetch(`/api/attributes/${id}`, { method: 'DELETE' });
      setSuccess(`Attribute '${name}' removed.`);
      loadAllInventoryData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // helper to get dynamic relation text label representation
  const getCatLabel = (id: string) => categories.find(c => c.id === id)?.name || 'Direct Stock';
  const getBrandLabel = (id: string) => brands.find(b => b.id === id)?.name || 'Generic';
  const getStoreLabel = (id: string) => stores.find(s => s.id === id)?.name || 'Unassigned Depot';

  // Filter products based on search bar text query
  const filteredProducts = products.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.barcode && p.barcode.includes(searchQuery));
    return matchesQuery;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Dynamic Tabs Navigation representing requested Scalable features */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 overflow-x-auto">
          <button 
            onClick={() => { setActiveTab('products'); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'products' ? 'bg-indigo-650 text-white shadow' : 'text-slate-650 hover:text-slate-900'}`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({products.length})</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('categories'); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'categories' ? 'bg-indigo-650 text-white shadow' : 'text-slate-650 hover:text-slate-900'}`}
          >
            <Folders className="w-4 h-4" />
            <span>Categories ({categories.length})</span>
          </button>

          <button 
            onClick={() => { setActiveTab('brands'); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'brands' ? 'bg-indigo-650 text-white shadow' : 'text-slate-650 hover:text-slate-900'}`}
          >
            <Tag className="w-4 h-4" />
            <span>Brands ({brands.length})</span>
          </button>

          <button 
            onClick={() => { setActiveTab('stores'); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'stores' ? 'bg-indigo-650 text-white shadow' : 'text-slate-650 hover:text-slate-900'}`}
          >
            <MapPin className="w-4 h-4" />
            <span>Depots Stores ({stores.length})</span>
          </button>

          <button 
            onClick={() => { setActiveTab('attributes'); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'attributes' ? 'bg-indigo-650 text-white shadow' : 'text-slate-650 hover:text-slate-900'}`}
          >
            <Sliders className="w-4 h-4" />
            <span>Attributes Specs ({attributes.length})</span>
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-xs pl-9 pr-4 py-2 rounded-lg outline-none transition-colors"
              placeholder="Search by SKU, Name, Barcode..."
            />
          </div>
        )}
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-lg flex items-center justify-between shadow-xs animate-fade-in">
          <span className="text-xs font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> {success}</span>
          <button onClick={() => setSuccess(null)} className="text-xs font-bold text-emerald-400">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-250 text-red-850 rounded-lg flex items-center justify-between shadow-xs animate-fade-in">
          <span className="text-xs font-medium flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" /> {error}</span>
          <button onClick={() => setError(null)} className="text-xs font-bold text-red-400">Dismiss</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB SUBSECTIONS CONTENT WRAPPERS */}
      {/* ========================================================= */}

      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3"></div>
          <p className="text-slate-550 text-xs">Syncing master inventory sheets...</p>
        </div>
      ) : activeTab === 'products' ? (
        
        // Products module List Card Grid Table
        <div className="bg-white rounded-xl border border-slate-205 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Operational Stock Products Catalog</h3>
              <p className="text-xs text-slate-400 mt-1">Manage physical merchandise quantities, target prices, barcodes identifiers, layout images and specs sheets.</p>
            </div>
            
            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
              <button
                onClick={() => handleOpenProductModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Post Item Catalog
              </button>
            )}
          </div>

          {filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/40 text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                    <th className="p-4">Item Snapshot</th>
                    <th className="p-4">SKU / Unique Codes</th>
                    <th className="p-4">Classification Details</th>
                    <th className="p-4">Buying cost / Price</th>
                    <th className="p-4 text-center">Remaining Quantity</th>
                    <th className="p-4">Target Depot</th>
                    <th className="p-4 text-right">Actions Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const isLowStock = p.qty < 10;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3.5">
                            <img 
                              src={p.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=120&q=80"} 
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 bg-slate-100 shadow-sm"
                            />
                            <div>
                              <p className="font-bold text-slate-800 text-sm leading-tight">{p.name}</p>
                              {p.attributes && Object.keys(p.attributes).length > 0 ? (
                                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                  {Object.entries(p.attributes).map(([k, v]) => (
                                    <span key={k} className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                                      {k}: {v}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 block mt-1">No custom variants specifications</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-mono text-slate-700 font-bold tracking-tight block">{p.sku}</span>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tight block mt-0.5">Barcode: {p.barcode || 'N/A'}</span>
                        </td>

                        <td className="p-4 space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Cat:</span>
                            <span className="font-medium text-slate-700">{getCatLabel(p.categoryId)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Brand:</span>
                            <span className="font-medium text-slate-700">{getBrandLabel(p.brandId)}</span>
                          </div>
                        </td>

                        <td className="p-4 space-y-1">
                          <p className="font-semibold text-slate-800">Price: <span className="text-indigo-650">${p.price}</span></p>
                          <p className="text-[10px] text-slate-400">Cost: ${p.buyingPrice}</p>
                        </td>

                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold leading-none inline-block ${
                            p.qty === 0 ? 'bg-red-50 text-red-650 ring-1 ring-red-200' :
                            isLowStock ? 'bg-amber-50 text-amber-650 ring-1 ring-amber-200' :
                            'bg-slate-50 text-slate-750'
                          }`}>
                            {p.qty} {p.qty === 0 ? '(Out of stock)' : isLowStock ? '(Low stock)' : 'Units'}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="text-slate-650 font-medium">{getStoreLabel(p.storeId)}</span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.role === 'user') && (
                              <button
                                onClick={() => handleOpenProductModal(p)}
                                title="Edit specs/catalog metadata"
                                className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-transform hover:scale-105"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                title="Erase item from systems listing"
                                className="p-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-transform hover:scale-105"
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
            <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center">
              <Package className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-xs">No products matched query or catalog is empty.</p>
            </div>
          )}
        </div>

      ) : activeTab === 'categories' ? (
        
        // Tab: Categories list
        <div className="bg-white rounded-xl border border-slate-205 shadow-sm overflow-hidden animate-fade-in max-w-3xl">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Categories Matrix Configuration</h3>
              <p className="text-xs text-slate-400 mt-1">Silo products systematically into structural classifications.</p>
            </div>
            
            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
              <button 
                onClick={() => handleOpenCategoryModal(null)}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Category
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {categories.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Folders className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{c.name}</h4>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">ID: {c.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-105 bg-slate-200 text-slate-600'
                  }`}>
                    {c.status}
                  </span>

                  {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleOpenCategoryModal(c)}
                        className="p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                        className="p-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-550 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : activeTab === 'brands' ? (
        
        // Tab: Brands List
        <div className="bg-white rounded-xl border border-slate-205 shadow-sm overflow-hidden animate-fade-in max-w-3xl">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Brands Register Management</h3>
              <p className="text-xs text-slate-400 mt-1">Formulate physical product manufacturers directories.</p>
            </div>
            
            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
              <button 
                onClick={() => handleOpenBrandModal(null)}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Brand Label
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {brands.map((b) => (
              <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{b.name}</h4>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">ID: {b.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    b.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {b.status}
                  </span>

                  {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleOpenBrandModal(b)}
                        className="p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteBrand(b.id, b.name)}
                        className="p-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-550 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : activeTab === 'stores' ? (
        
        // Tab: Depots stores list
        <div className="bg-white rounded-xl border border-slate-205 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Depots & Warehouse Outlet Stores</h3>
              <p className="text-xs text-slate-400 mt-1">Manage physical space allocations, shipping docks, addresses coordinates.</p>
            </div>
            
            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
              <button 
                onClick={() => handleOpenStoreModal(null)}
                className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Registered Depot Outpost
              </button>
            )}
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/40 text-[10px] font-bold text-slate-550 uppercase tracking-wider">
                  <th className="p-4">Depot Store</th>
                  <th className="p-4">Logistical Physical Address</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/55 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{s.name}</td>
                    <td className="p-4 text-slate-650">{s.address || 'Direct logistics shipping pipeline default address'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenStoreModal(s)}
                            className="p-1 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold rounded flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteStore(s.id, s.name)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        
        // Tab: Specifications Attributes list
        <div className="bg-white rounded-xl border border-slate-205 shadow-sm overflow-hidden animate-fade-in max-w-3xl">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Product Attributes Specifications</h3>
              <p className="text-xs text-slate-400 mt-1">Define multi-choice variants tags (e.g., Sizes: S, M, L or Colors: Black, Red) mapping cleanly onto product entries.</p>
            </div>
            
            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
              <button 
                onClick={() => handleOpenAttributeModal(null)}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Initialize Attribute
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 text-xs text-slate-705">
            {attributes.map((a) => (
              <div key={a.id} className="p-5 flex items-start justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-800">{a.name}</h4>
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {a.values.map(val => (
                      <span key={val} className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 font-bold border border-slate-200">
                        {val}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    a.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {a.status}
                  </span>

                  {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenAttributeModal(a)}
                        className="p-1 px-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-650 rounded flex items-center gap-1"
                      >
                        Adjust Values
                      </button>
                      <button 
                        onClick={() => handleDeleteAttribute(a.id, a.name)}
                        className="p-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      )}

      {/* ========================================================= */}
      {/* 5 DISTINCT MODEL DIALOG INTERFACES MODALS */}
      {/* ========================================================= */}

      {/* PRODUCT DIALOG FORM */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 selection:bg-indigo-600 selection:text-white">
          <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-zoom-in">
            <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                {selectedProduct ? `Edit Products Catalog details: ${selectedProduct.name}` : 'Post New Product Details Sheets'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="p-6 space-y-4 max-h-[480px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Product Title Label *</label>
                    <input
                      type="text"
                      value={prodForm.name}
                      onChange={(e) => setProdForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 focus:ring-1 focus:ring-indigo-505 px-3 py-2 text-xs rounded-lg outline-none"
                      placeholder="e.g. Nike Space Run Lightweight"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">SKU Uniform Serial Number</label>
                    <input
                      type="text"
                      value={prodForm.sku}
                      onChange={(e) => setProdForm(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-505 px-3 py-2 text-xs rounded-lg outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Barcode EPC ID Code</label>
                    <input
                      type="text"
                      value={prodForm.barcode}
                      onChange={(e) => setProdForm(prev => ({ ...prev, barcode: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Logistical Outlet Store / Depot</label>
                    <select
                      value={prodForm.storeId}
                      onChange={(e) => setProdForm(prev => ({ ...prev, storeId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none cursor-pointer"
                    >
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Supplier Brand Maker</label>
                    <select
                      value={prodForm.brandId}
                      onChange={(e) => setProdForm(prev => ({ ...prev, brandId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none cursor-pointer"
                    >
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Classification Category</label>
                    <select
                      value={prodForm.categoryId}
                      onChange={(e) => setProdForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none cursor-pointer"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Wholesale Procurement Cost</label>
                    <input
                      type="number"
                      value={prodForm.buyingPrice}
                      onChange={(e) => setProdForm(prev => ({ ...prev, buyingPrice: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Consumer Retail Price</label>
                    <input
                      type="number"
                      value={prodForm.price}
                      onChange={(e) => setProdForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Warehouse Balance Units</label>
                    <input
                      type="number"
                      value={prodForm.qty}
                      onChange={(e) => setProdForm(prev => ({ ...prev, qty: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Display Thumbnail Image Illustration URL</label>
                  <input
                    type="url"
                    value={prodForm.image}
                    onChange={(e) => setProdForm(prev => ({ ...prev, image: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                    placeholder="粘贴产品高清图片URL (e.g., https://...)"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Product Variant Attributes Configuration</label>
                  <div className="p-3 bg-slate-950 rounded-lg space-y-3">
                    {attributes.map(attr => {
                      const selectedVal = prodForm.attributes[attr.name] || '';
                      return (
                        <div key={attr.id} className="flex items-center gap-4 justify-between">
                          <span className="text-xs font-semibold text-slate-350">{attr.name}:</span>
                          <select
                            value={selectedVal}
                            onChange={(e) => setProdForm(prev => ({
                              ...prev,
                              attributes: {
                                ...prev.attributes,
                                [attr.name]: e.target.value
                              }
                            }))}
                            className="bg-slate-900 border border-slate-850 px-3 py-1.5 text-xs rounded outline-none text-slate-300"
                          >
                            <option value="">-- No variant selection --</option>
                            {attr.values.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      );
                    })}
                    {attributes.length === 0 && <span className="text-[10px] text-slate-500">Configure specifications tags under the Attributes tab first.</span>}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Technical Details Specifications</label>
                  <textarea
                    value={prodForm.description}
                    onChange={(e) => setProdForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                    placeholder="Enter notes, material components information, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Status</label>
                    <select
                      value={prodForm.status}
                      onChange={(e) => setProdForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none cursor-pointer"
                    >
                      <option value="active">Active (Available)</option>
                      <option value="inactive">Inactive (Archived)</option>
                    </select>
                  </div>
                </div>

              </div>

              <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-2.5">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-xs rounded-lg">Save Physical Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY FORM MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm">Configure Item Category Class</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category Identifier Label Title</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => setCatForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                  placeholder="e.g. Sports Footwear"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select
                  value={catForm.status}
                  onChange={(e) => setCatForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded cursor-pointer outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-3 py-1.5 bg-slate-800 text-xs rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-650 text-white font-semibold text-xs rounded">Commit Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRAND FORM MODAL */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm">Configure Brand Label Maker</h3>
              <button onClick={() => setIsBrandModalOpen(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleSaveBrand} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Brand Name Label</label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                  placeholder="e.g. Patagonia"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select
                  value={brandForm.status}
                  onChange={(e) => setBrandForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded cursor-pointer outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsBrandModalOpen(false)} className="px-3 py-1.5 bg-slate-800 text-xs rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-650 text-white font-semibold text-xs rounded">Record Brand Code</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORE/DEPOT FORM MODAL */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-200 text-sm">Configure Warehouse Outlet</h3>
              <button onClick={() => setIsStoreModalOpen(false)} className="text-slate-405">✕</button>
            </div>
            <form onSubmit={handleSaveStore} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Facility Store Name</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                  placeholder="e.g. North Side Warehouse 2"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Physical Facility Address Coordinates</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                  placeholder="e.g. 505 Industrial Blvd, NY"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select
                  value={storeForm.status}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded cursor-pointer outline-none"
                >
                  <option value="active">Active (Docks open)</option>
                  <option value="inactive">Inactive (Halt)</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsStoreModalOpen(false)} className="px-3 py-1.5 bg-slate-800 text-xs rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-650 text-white font-semibold text-xs rounded">Commit Logistics Depot</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTRIBUTE FORM MODAL */}
      {isAttributeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-205 text-sm">Record Variant Attribute Param Grid</h3>
              <button onClick={() => setIsAttributeModalOpen(false)} className="text-slate-405">✕</button>
            </div>
            <form onSubmit={handleSaveAttribute} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Attribute Characteristic Name</label>
                <input
                  type="text"
                  value={attrForm.name}
                  onChange={(e) => setAttrForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                  placeholder="e.g. Size or Color"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Predefined CSV values (comma separated)</label>
                <input
                  type="text"
                  value={attrForm.valuesString}
                  onChange={(e) => setAttrForm(prev => ({ ...prev, valuesString: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded-lg outline-none"
                  placeholder="e.g. S, M, L, XL or Red, Blue, White"
                  required
                />
                <span className="text-[9px] text-slate-450 block mt-1">Split options using commas. These populate product listing options.</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select
                  value={attrForm.status}
                  onChange={(e) => setAttrForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 text-xs rounded cursor-pointer outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAttributeModalOpen(false)} className="px-3 py-1.5 bg-slate-800 text-xs rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-650 text-white font-semibold text-xs rounded">Commit Param Specs</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
