import os
import json
import time
import random
from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'inventory_data.json')

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
PORT = 3000

def read_db():
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return {}

def write_db(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

# --- Logging Middleware ---
@app.before_request
def log_request_info():
    # print(f"Request: {request.method} {request.path}")
    pass

# --- Auth APIs ---
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    db_data = read_db()
    users = db_data.get('users', [])
    user = next((u for u in users if u.get('email', '').lower() == email.lower()), None)
    
    if not user or user.get('passwordHash') != password:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if user.get('status') != 'active':
        return jsonify({'error': 'User account is deactivated'}), 403
    
    # Return user without confidential passwordHash
    safe_user = {k: v for k, v in user.items() if k != 'passwordHash'}
    
    # Log audit logs
    audit_logs = db_data.get('auditLogs', [])
    audit_logs.append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': user.get('email'),
        'userName': user.get('name'),
        'userRole': user.get('role'),
        'action': 'Logged In',
        'module': 'Authentication',
        'details': 'Successfully logged in to standard workspace.',
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    db_data['auditLogs'] = audit_logs
    write_db(db_data)
    
    return jsonify({
        'token': f"session_token_{user.get('id')}",
        'user': safe_user
    })

# --- Products APIs ---
@app.route('/api/products', methods=['GET'])
def get_products():
    db_data = read_db()
    return jsonify(db_data.get('products', []))

@app.route('/api/products', methods=['POST'])
def post_products():
    req_data = request.json or {}
    data = req_data.get('product', {})
    editor = req_data.get('operator', {})
    
    if not data or not data.get('name') or not data.get('sku'):
        return jsonify({'error': 'Name and SKU are required'}), 400
        
    db_data = read_db()
    products = db_data.get('products', [])
    
    new_id = f"prod_{int(time.time()*1000)}"
    new_product = {
        **data,
        'id': new_id,
        'price': float(data.get('price') or 0),
        'buyingPrice': float(data.get('buyingPrice') or 0),
        'qty': int(data.get('qty') or 0)
    }
    
    products.append(new_product)
    db_data['products'] = products
    
    # audit log
    audit_logs = db_data.get('auditLogs', [])
    audit_logs.append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
         'action': 'Created Product',
         'module': 'Products',
         'details': f"Product '{new_product.get('name')}' (SKU: {new_product.get('sku')}) added to warehouse database with quantity {new_product.get('qty')}.",
         'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    db_data['auditLogs'] = audit_logs
    write_db(db_data)
    
    return jsonify(new_product), 201

@app.route('/api/products/<product_id>', methods=['PUT'])
def put_products(product_id):
    req_data = request.json or {}
    data = req_data.get('product', {})
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    products = db_data.get('products', [])
    idx = next((i for i, p in enumerate(products) if p.get('id') == product_id), -1)
    if idx == -1:
        return jsonify({'error': 'Product not found'}), 404
        
    current = products[idx]
    updated = {**current}
    for k, v in data.items():
        if k != 'id':
            updated[k] = v
            
    updated['price'] = float(data.get('price', current.get('price', 0)))
    updated['buyingPrice'] = float(data.get('buyingPrice', current.get('buyingPrice', 0)))
    updated['qty'] = int(data.get('qty', current.get('qty', 0)))
    
    products[idx] = updated
    db_data['products'] = products
    
    # audit log
    audit_logs = db_data.get('auditLogs', [])
    audit_logs.append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Updated Product',
        'module': 'Products',
        'details': f"Product '{current.get('name')}' (SKU: {current.get('sku')}) inventory records modified.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    db_data['auditLogs'] = audit_logs
    write_db(db_data)
    
    return jsonify(updated)

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_products(product_id):
    editor_email = request.args.get('userEmail') or 'system'
    editor_name = request.args.get('userName') or 'System'
    editor_role = request.args.get('userRole') or 'user'
    
    db_data = read_db()
    products = db_data.get('products', [])
    current = next((p for p in products if p.get('id') == product_id), None)
    if not current:
        return jsonify({'error': 'Product not found'}), 404
        
    products = [p for p in products if p.get('id') != product_id]
    db_data['products'] = products
    
    # audit log
    audit_logs = db_data.get('auditLogs', [])
    audit_logs.append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor_email,
        'userName': editor_name,
        'userRole': editor_role,
        'action': 'Deleted Product',
        'module': 'Products',
        'details': f"Product '{current.get('name')}' (SKU: {current.get('sku')}) removed from database.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    db_data['auditLogs'] = audit_logs
    write_db(db_data)
    
    return jsonify({'success': True})

# --- Users APIs ---
@app.route('/api/users', methods=['GET'])
def get_users():
    db_data = read_db()
    users = db_data.get('users', [])
    safe_users = [{k: v for k, v in u.items() if k != 'passwordHash'} for u in users]
    return jsonify(safe_users)

@app.route('/api/users', methods=['POST'])
def post_users():
    req_data = request.json or {}
    data = req_data.get('user', {})
    password = req_data.get('password')
    editor = req_data.get('operator', {})
    
    if not data.get('name') or not data.get('email') or not password:
        return jsonify({'error': 'Name, email and password are required'}), 400
        
    db_data = read_db()
    users = db_data.get('users', [])
    
    new_id = f"user_{int(time.time()*1000)}"
    new_user = {**data, 'id': new_id, 'passwordHash': password}
    
    users.append(new_user)
    db_data['users'] = users
    
    # audit log
    audit_logs = db_data.get('auditLogs', [])
    audit_logs.append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'superadmin'),
        'action': 'Created User',
        'module': 'Users',
        'details': f"New account created for '{new_user.get('name')}' with role '{new_user.get('role')}'.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    db_data['auditLogs'] = audit_logs
    write_db(db_data)
    
    safe_user = {k: v for k, v in new_user.items() if k != 'passwordHash'}
    return jsonify(safe_user), 201

@app.route('/api/users/<user_id>', methods=['PUT'])
def put_users(user_id):
    req_data = request.json or {}
    data = req_data.get('user', {})
    password = req_data.get('password')
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    users = db_data.get('users', [])
    idx = next((i for i, u in enumerate(users) if u.get('id') == user_id), -1)
    if idx == -1:
        return jsonify({'error': 'User not found'}), 404
        
    current = users[idx]
    updated = {**current}
    for k, v in data.items():
        if k != 'id' and k != 'passwordHash':
            updated[k] = v
            
    if password:
        updated['passwordHash'] = password
        
    users[idx] = updated
    db_data['users'] = users
    
    # audit log
    audit_logs = db_data.get('auditLogs', [])
    audit_logs.append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'superadmin'),
        'action': 'Updated User Account',
        'module': 'Users',
        'details': f"Account details modified for '{current.get('name')}'.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    db_data['auditLogs'] = audit_logs
    write_db(db_data)
    
    safe_user = {k: v for k, v in updated.items() if k != 'passwordHash'}
    return jsonify(safe_user)

@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_users(user_id):
    editor_email = request.args.get('userEmail') or 'system'
    editor_name = request.args.get('userName') or 'System'
    editor_role = request.args.get('userRole') or 'superadmin'
    
    db_data = read_db()
    users = db_data.get('users', [])
    current = next((u for u in users if u.get('id') == user_id), None)
    if not current:
        return jsonify({'error': 'User not found'}), 404
        
    users = [u for u in users if u.get('id') != user_id]
    db_data['users'] = users
    
    # audit log
    audit_logs = db_data.get('auditLogs', [])
    audit_logs.append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor_email,
        'userName': editor_name,
        'userRole': editor_role,
        'action': 'Deleted User',
        'module': 'Users',
        'details': f"User account '{current.get('name')}' ({current.get('email')}) deleted.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    db_data['auditLogs'] = audit_logs
    write_db(db_data)
    
    return jsonify({'success': True})

# --- Groups APIs ---
@app.route('/api/groups', methods=['GET'])
def get_groups():
    return jsonify(read_db().get('groups', []))

@app.route('/api/groups', methods=['POST'])
def post_groups():
    req_data = request.json or {}
    group = req_data.get('group', {})
    editor = req_data.get('operator', {})
    new_id = f"group_{int(time.time()*1000)}"
    new_group = {**group, 'id': new_id}
    
    db_data = read_db()
    db_data.setdefault('groups', []).append(new_group)
    
    # audit log
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
         'action': 'Created Group',
         'module': 'Groups',
         'details': f"Group '{new_group.get('name')}' created with {len(new_group.get('permissions', []))} specific permissions.",
         'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(new_group), 201

@app.route('/api/groups/<group_id>', methods=['PUT'])
def put_groups(group_id):
    req_data = request.json or {}
    group = req_data.get('group', {})
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    groups = db_data.get('groups', [])
    idx = next((i for i, g in enumerate(groups) if g.get('id') == group_id), -1)
    if idx == -1:
        return jsonify({'error': 'Group not found'}), 404
        
    current = groups[idx]
    updated = {**current, **group, 'id': group_id}
    groups[idx] = updated
    
    # audit log
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Updated Group',
        'module': 'Groups',
        'details': f"Group levels updated for '{updated.get('name')}'.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(updated)

@app.route('/api/groups/<group_id>', methods=['DELETE'])
def delete_groups(group_id):
    editor_email = request.args.get('userEmail') or 'system'
    editor_name = request.args.get('userName') or 'System'
    editor_role = request.args.get('userRole') or 'user'
    
    db_data = read_db()
    groups = db_data.get('groups', [])
    current = next((g for g in groups if g.get('id') == group_id), None)
    
    db_data['groups'] = [g for g in groups if g.get('id') != group_id]
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor_email,
        'userName': editor_name,
        'userRole': editor_role,
        'action': 'Deleted Group',
        'module': 'Groups',
        'details': f"Group '{current.get('name') if current else 'Unknown'}' removed.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify({'success': True})

# --- Brands APIs ---
@app.route('/api/brands', methods=['GET'])
def get_brands():
    return jsonify(read_db().get('brands', []))

@app.route('/api/brands', methods=['POST'])
def post_brands():
    req_data = request.json or {}
    brand = req_data.get('brand', {})
    editor = req_data.get('operator', {})
    new_brand = {**brand, 'id': f"brand_{int(time.time()*1000)}"}
    
    db_data = read_db()
    db_data.setdefault('brands', []).append(new_brand)
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
         'action': 'Created Brand',
         'module': 'Brands',
         'details': f"Brand '{new_brand.get('name')}' added.",
         'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(new_brand), 201

@app.route('/api/brands/<brand_id>', methods=['PUT'])
def put_brands(brand_id):
    req_data = request.json or {}
    brand = req_data.get('brand', {})
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    brands = db_data.get('brands', [])
    idx = next((i for i, b in enumerate(brands) if b.get('id') == brand_id), -1)
    if idx == -1:
        return jsonify({'error': 'Brand not found'}), 404
    current = brands[idx]
    updated = {**current, **brand, 'id': brand_id}
    brands[idx] = updated
    
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Updated Brand',
        'module': 'Brands',
        'details': f"Brand '{updated.get('name')}' updated.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(updated)

@app.route('/api/brands/<brand_id>', methods=['DELETE'])
def delete_brands(brand_id):
    db_data = read_db()
    db_data['brands'] = [b for b in db_data.get('brands', []) if b.get('id') != brand_id]
    write_db(db_data)
    return jsonify({'success': True})

# --- Categories APIs ---
@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify(read_db().get('categories', []))

@app.route('/api/categories', methods=['POST'])
def post_categories():
    req_data = request.json or {}
    category = req_data.get('category', {})
    editor = req_data.get('operator', {})
    new_cat = {**category, 'id': f"cat_{int(time.time()*1000)}"}
    
    db_data = read_db()
    db_data.setdefault('categories', []).append(new_cat)
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Created Category',
        'module': 'Categories',
        'details': f"Category '{new_cat.get('name')}' added.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(new_cat), 201

@app.route('/api/categories/<cat_id>', methods=['PUT'])
def put_categories(cat_id):
    req_data = request.json or {}
    category = req_data.get('category', {})
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    categories = db_data.get('categories', [])
    idx = next((i for i, c in enumerate(categories) if c.get('id') == cat_id), -1)
    if idx == -1:
        return jsonify({'error': 'Category not found'}), 404
    current = categories[idx]
    updated = {**current, **category, 'id': cat_id}
    categories[idx] = updated
    
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Updated Category',
        'module': 'Categories',
        'details': f"Category status updated to '{updated.get('status')}' for '{updated.get('name')}'.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(updated)

@app.route('/api/categories/<cat_id>', methods=['DELETE'])
def delete_categories(cat_id):
    db_data = read_db()
    db_data['categories'] = [c for c in db_data.get('categories', []) if c.get('id') != cat_id]
    write_db(db_data)
    return jsonify({'success': True})

# --- Stores APIs ---
@app.route('/api/stores', methods=['GET'])
def get_stores():
    return jsonify(read_db().get('stores', []))

@app.route('/api/stores', methods=['POST'])
def post_stores():
    req_data = request.json or {}
    store = req_data.get('store', {})
    editor = req_data.get('operator', {})
    new_store = {**store, 'id': f"store_{int(time.time()*1000)}"}
    
    db_data = read_db()
    db_data.setdefault('stores', []).append(new_store)
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
         'action': 'Created Warehouse Store',
         'module': 'Stores',
         'details': f"Location outlet/store '{new_store.get('name')}' registered.",
         'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(new_store), 201

@app.route('/api/stores/<store_id>', methods=['PUT'])
def put_stores(store_id):
    req_data = request.json or {}
    store = req_data.get('store', {})
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    stores = db_data.get('stores', [])
    idx = next((i for i, s in enumerate(stores) if s.get('id') == store_id), -1)
    if idx == -1:
         return jsonify({'error': 'Store not found'}), 404
    current = stores[idx]
    updated = {**current, **store, 'id': store_id}
    stores[idx] = updated
    
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Updated Warehouse Store',
        'module': 'Stores',
        'details': f"Location details modified for '{updated.get('name')}'.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(updated)

@app.route('/api/stores/<store_id>', methods=['DELETE'])
def delete_stores(store_id):
    db_data = read_db()
    db_data['stores'] = [s for s in db_data.get('stores', []) if s.get('id') != store_id]
    write_db(db_data)
    return jsonify({'success': True})

# --- Attributes APIs ---
@app.route('/api/attributes', methods=['GET'])
def get_attributes():
    return jsonify(read_db().get('attributes', []))

@app.route('/api/attributes', methods=['POST'])
def post_attributes():
    req_data = request.json or {}
    attr = req_data.get('attribute', {})
    editor = req_data.get('operator', {})
    new_attr = {**attr, 'id': f"attr_{int(time.time()*1000)}"}
    
    db_data = read_db()
    db_data.setdefault('attributes', []).append(new_attr)
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Created Attribute',
        'module': 'Attributes',
        'details': f"Product specifications variant parameter '{new_attr.get('name')}' registered.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(new_attr), 201

@app.route('/api/attributes/<attr_id>', methods=['PUT'])
def put_attributes(attr_id):
    req_data = request.json or {}
    attr = req_data.get('attribute', {})
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    attrs = db_data.get('attributes', [])
    idx = next((i for i, a in enumerate(attrs) if a.get('id') == attr_id), -1)
    if idx == -1:
        return jsonify({'error': 'Attribute not found'}), 404
    current = attrs[idx]
    updated = {**current, **attr, 'id': attr_id}
    attrs[idx] = updated
    
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Updated Attribute',
        'module': 'Attributes',
        'details': f"Attribute key values updated for '{updated.get('name')}'.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(updated)

@app.route('/api/attributes/<attr_id>', methods=['DELETE'])
def delete_attributes(attr_id):
    db_data = read_db()
    db_data['attributes'] = [a for a in db_data.get('attributes', []) if a.get('id') != attr_id]
    write_db(db_data)
    return jsonify({'success': True})

# --- Orders APIs ---
@app.route('/api/orders', methods=['GET'])
def get_orders():
    return jsonify(read_db().get('orders', []))

@app.route('/api/orders', methods=['POST'])
def post_orders():
    req_data = request.json or {}
    data = req_data.get('order', {})
    editor = req_data.get('operator', {})
    
    if not data.get('items') or len(data.get('items', [])) == 0:
        return jsonify({'error': 'Order must contain at least 1 item'}), 400
        
    order_no = f"ORD-{time.strftime('%Y')}-{random.randint(1000, 9999)}"
    new_id = f"ord_{int(time.time()*1000)}"
    new_order = {
        **data,
        'id': new_id,
        'orderNo': order_no,
        'date': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
        'userId': editor.get('id', 'unknown'),
        'userName': editor.get('name', 'Unknown Operator')
    }
    
    db_data = read_db()
    db_data.setdefault('orders', []).append(new_order)
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': f"Created {new_order.get('orderType', '').upper()} Order",
        'module': 'Orders',
        'details': f"{'Sales' if new_order.get('orderType') == 'sales' else 'Purchase'} transaction '{new_order.get('orderNo')}' initialized for customer/supplier: '{new_order.get('customerName')}'. Total: ${new_order.get('netAmount')}.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(new_order), 201

@app.route('/api/orders/<order_id>', methods=['PUT'])
def put_orders(order_id):
    req_data = request.json or {}
    data = req_data.get('order', {})
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    orders = db_data.get('orders', [])
    idx = next((i for i, o in enumerate(orders) if o.get('id') == order_id), -1)
    if idx == -1:
        return jsonify({'error': 'Order record not found'}), 404
    current = orders[idx]
    updated = {**current, **data, 'id': order_id}
    orders[idx] = updated
    
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'user'),
        'action': 'Updated Order Status',
        'module': 'Orders',
        'details': f"Transaction '{current.get('orderNo')}' status adjusted to '{data.get('status', current.get('status'))}'.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(updated)

@app.route('/api/orders/<order_id>', methods=['DELETE'])
def delete_orders(order_id):
    editor_email = request.args.get('userEmail') or 'system'
    editor_name = request.args.get('userName') or 'System'
    editor_role = request.args.get('userRole') or 'user'
    
    db_data = read_db()
    orders = db_data.get('orders', [])
    current = next((o for o in orders if o.get('id') == order_id), None)
    if not current:
         return jsonify({'error': 'Order not found'}), 404
         
    db_data['orders'] = [o for o in orders if o.get('id') != order_id]
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor_email,
        'userName': editor_name,
        'userRole': editor_role,
        'action': 'Deleted Order',
        'module': 'Orders',
        'details': f"{'Sales' if current.get('orderType') == 'sales' else 'Purchase'} record '{current.get('orderNo')}' removed.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify({'success': True})

# --- Company Settings APIs ---
@app.route('/api/company', methods=['GET'])
def get_company():
    return jsonify(read_db().get('company', {}))

@app.route('/api/company', methods=['PUT'])
def put_company():
    req_data = request.json or {}
    data = req_data.get('company', {})
    editor = req_data.get('operator', {})
    
    db_data = read_db()
    current = db_data.get('company', {})
    updated = {**current, **data}
    db_data['company'] = updated
    
    db_data.setdefault('auditLogs', []).append({
        'id': f"log_{int(time.time()*1000)}_{random.randint(100, 999)}",
        'userEmail': editor.get('email', 'system'),
        'userName': editor.get('name', 'System'),
        'userRole': editor.get('role', 'superadmin'),
        'action': 'Updated Company Settings',
        'module': 'Company Settings',
        'details': "Company profile configs modified.",
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    })
    write_db(db_data)
    return jsonify(updated)

# --- Audit Logs APIs ---
@app.route('/api/audit-logs', methods=['GET'])
def get_audit_logs():
    return jsonify(read_db().get('auditLogs', []))

# --- System Stats APIs ---
@app.route('/api/stats', methods=['GET'])
def get_stats():
    db_data = read_db()
    products = db_data.get('products', [])
    orders = db_data.get('orders', [])
    users = db_data.get('users', [])
    
    low_stock_threshold = 10
    low_stock_count = sum(1 for p in products if p.get('qty', 0) < low_stock_threshold and p.get('status') == 'active')
    total_products = len(products)
    
    sales_orders = [o for o in orders if o.get('orderType') == 'sales' and o.get('status') != 'cancelled']
    total_sales_value = sum(float(o.get('netAmount') or 0) for o in sales_orders)
    
    purchase_orders = [o for o in orders if o.get('orderType') == 'purchase' and o.get('status') != 'cancelled']
    total_purchase_value = sum(float(o.get('netAmount') or 0) for o in purchase_orders)
    
    # Yearly/Monthly aggregation
    months_short = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    monthly_stats = {m: {'sales': 0.0, 'purchases': 0.0, 'count': 0} for m in months_short}
    
    # Hydrate base values to match Node.js exactly
    monthly_stats['Jan'] = {'sales': 480.0, 'purchases': 320.0, 'count': 2}
    monthly_stats['Feb'] = {'sales': 850.0, 'purchases': 450.0, 'count': 3}
    monthly_stats['Mar'] = {'sales': 1200.0, 'purchases': 800.0, 'count': 5}
    
    for o in orders:
        try:
            date_str = o.get('date', '')
            if date_str:
                month_idx = int(date_str[5:7]) - 1
                month_short = months_short[month_idx]
                if o.get('status') != 'cancelled':
                    if o.get('orderType') == 'sales':
                        monthly_stats[month_short]['sales'] += float(o.get('netAmount') or 0)
                    else:
                        monthly_stats[month_short]['purchases'] += float(o.get('netAmount') or 0)
                monthly_stats[month_short]['count'] += 1
        except Exception:
            pass
            
    yearly_chart_data = []
    for m in months_short:
        yearly_chart_data.append({
            'month': m,
            'sales': round(monthly_stats[m]['sales']),
            'purchases': round(monthly_stats[m]['purchases']),
            'count': monthly_stats[m]['count']
        })
        
    return jsonify({
        'totalProducts': total_products,
        'lowStockCount': low_stock_count,
        'totalSalesValue': round(total_sales_value, 2),
        'totalPurchaseValue': round(total_purchase_value, 2),
        'totalOrders': len(orders),
        'totalUsers': len(users),
        'yearlyChartData': yearly_chart_data
    })

# Serve static frontend files directly from the root workspace directory
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    file_path = os.path.join(BASE_DIR, path)
    if path and os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(BASE_DIR, path)
    return send_from_directory(BASE_DIR, 'index.html')

# Serve static React frontend files (built inside 'dist/' directory)
def serve_spa_old_unused(path):
    dist_dir = os.path.join(BASE_DIR, 'dist')
    
    # Check if the dist directory or at least index.html exists
    if not os.path.exists(dist_dir) or not os.path.exists(os.path.join(dist_dir, 'index.html')):
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>En-Tech S.C Inventory Management — Setup Helper</title>
            <style>
                body {{
                    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
                    background: #0f172a;
                    color: #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 24px;
                }}
                .card {{
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 16px;
                    padding: 40px;
                    max-width: 600px;
                    width: 100%;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
                }}
                h1 {{
                    color: #818cf8;
                    font-size: 24px;
                    font-weight: 800;
                    margin-top: 0;
                    margin-bottom: 12px;
                    letter-spacing: -0.025em;
                }}
                p {{
                    color: #94a3b8;
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 24px;
                }}
                .step {{
                    background: #0f172a;
                    border-radius: 8px;
                    padding: 16px;
                    font-family: monospace;
                    font-size: 13px;
                    color: #38bdf8;
                    margin-bottom: 16px;
                    border: 1px solid #1e293b;
                    overflow-x: auto;
                }}
                .badge {{
                    display: inline-block;
                    background: rgba(129, 140, 248, 0.1);
                    color: #818cf8;
                    border: 1px solid rgba(129, 140, 248, 0.2);
                    padding: 4px 10px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 16px;
                }}
                .btn {{
                    display: inline-block;
                    background: #4f46e5;
                    color: #ffffff;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 13px;
                    padding: 10px 20px;
                    border-radius: 8px;
                    transition: all 0.2s;
                    border: none;
                    cursor: pointer;
                }}
                .btn:hover {{
                    background: #4338ca;
                }}
            </style>
        </head>
        <body>
            <div class="card">
                <span class="badge">Notice for Local VS Code Users</span>
                <h1>En-Tech S.C Inventory Management — Setup Helper</h1>
                <p>
                    Greetings! The Python Flask server is running perfectly on port 3000, but it couldn't locate the compiled frontend files inside the <code>dist/</code> folder. 
                </p>
                
                <p><strong>Option A: Build/Compile the UI (Recommended)</strong><br>
                If you have Node.js / npm installed locally, compile the UI files by running these commands in your project root, then refresh this page:
                </p>
                <div class="step">
                    # 1. Install react dependencies<br>
                    npm install<br><br>
                    # 2. Build the distribution folder<br>
                    npm run build
                </div>

                <p><strong>Option B: Pure Python Run (Offline ZIP)</strong><br>
                If you downloaded this app as a ZIP and want to run purely in Python with no Node/npm installers, please verify that the <code>dist/</code> folder has been successfully downloaded or extracted alongside <code>app.py</code> in your main project folder.
                </p>
                
                <button onclick="window.location.reload()" class="btn">🔄 Reload & Check Again</button>
            </div>
        </body>
        </html>
        """, 404
        
    if path and os.path.exists(os.path.join(dist_dir, path)):
        return send_from_directory(dist_dir, path)
    return send_from_directory(dist_dir, 'index.html')

if __name__ == '__main__':
    print(f"Inventory Python Flask server starting on http://0.0.0.0:{PORT}...")
    app.run(host='0.0.0.0', port=PORT, debug=True)
