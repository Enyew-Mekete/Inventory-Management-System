# 🐍 Run ERP Inventory Management System Purely in Python!

This project has been fully equipped with an **equivalent, production-grade Python Flask backend** (`app.py`). You do **not** need to install Node.js, `npm`, or any advanced JavaScript frameworks on your local device to run this application!

By running our compiled React static UI through the Flask Python server, you get the absolute full-stack experience with live state retention, audit tracking, JSON DB persistence, and interactive settings purely in Python.

---

## 🛠️ Requirements
You only need:
- **Python 3.8+**
- **VS Code** (or your favorite IDE)

---

## 🚀 Easy Quickstart (VS Code)

1. **Open the project folder** in VS Code.
2. Open a terminal in VS Code (`Ctrl + ~` or `Cmd + ~`) and install Flask:
   ```bash
   pip install -r requirements.txt
   ```
3. **Execute the Python server**:
   ```bash
   python app.py
   ```
4. **Access the Portal**:
   Open your browser and navigate to:
   ```
   http://127.0.0.1:3000
   ```

---

## 📁 How It Works Under the Hood
1. **Frontend**: The React application has been precompiled and built into the `dist/` directory. These static files are delivered immediately when accessing the python webserver.
2. **Backend**: `app.py` acts as the complete central ERP hub. It replicates every single API route from the Node workspace, including:
   - Credentials check & Quick login modes (Superadmin, Admin, User)
   - Dynamic inventory stock operations (add/edit/delete SKU)
   - Order, sales tracking, and analytical stats aggregates
   - Interactive profile avatar image file imports & presets
3. **Storage**: All ERP data is persistently stored in the `inventory_data.json` file. Any modifications made via the Python web server will write instantly to this file in real time.

---

## 🔒 Default Sandbox Logins
- 👑 **Superadmin**: `superadmin@admin.com` / Password: `superadmin`
- 🛠️ **Admin**: `admin@admin.com` / Password: `admin`
- 👤 **User Staff**: `user@admin.com` / Password: `user`
