import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_NAME = "ecommerce.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'customer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Token Revocation Blocklist Table (Optional Bonus Feature)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS token_blocklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jti TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 3. Products Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            category TEXT,
            stock INTEGER DEFAULT 1,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 4. Orders Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'Pending',
            items_count INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()

    # Ensure user_id column exists in existing orders table
    cursor.execute("PRAGMA table_info(orders)")
    columns = [row['name'] for row in cursor.fetchall()]
    if 'user_id' not in columns:
        cursor.execute("ALTER TABLE orders ADD COLUMN user_id INTEGER")
        conn.commit()
        print("[DB Migration] Added missing 'user_id' column to orders table.")
    
    # Ensure avatar_url column exists in existing users table
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [row['name'] for row in cursor.fetchall()]
    if 'avatar_url' not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL")
        conn.commit()
        print("[DB Migration] Added missing 'avatar_url' column to users table.")
    
    # Seed Initial Users if Empty
    cursor.execute("SELECT COUNT(*) as count FROM users")
    u_count = cursor.fetchone()['count']
    if u_count == 0:
        admin_pass = generate_password_hash("admin123")
        user_pass = generate_password_hash("user123")
        sample_users = [
            ("Admin User", "admin@example.com", admin_pass, "admin"),
            ("Jane Doe", "user@example.com", user_pass, "customer"),
        ]
        cursor.executemany('''
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        ''', sample_users)
        conn.commit()
        print(f"[DB Initialized] Seeded default users: admin@example.com, user@example.com")

    # Seed or Update Products
    sample_products = [
        ("Wireless Noise-Canceling Headphones", 199.99, "Premium over-ear audio with active noise cancellation and 30-hour battery life.", "Electronics", 15, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80"),
        ("Minimalist Mechanical Keyboard", 89.50, "Sleek RGB mechanical keyboard with tactile switches and durable aluminum frame.", "Electronics", 25, "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80"),
        ("Ergonomic Desk Chair", 249.00, "High-density mesh back support chair designed for all-day workspace comfort.", "Home & Kitchen", 8, "https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?auto=format&fit=crop&w=600&q=80"),
        ("Ultra-Wide 34-inch Monitor", 499.99, "Immersive 144Hz curved QHD display for gaming and multitasking productivity.", "Electronics", 12, "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80"),
        ("Smart Fitness Watch v2", 149.95, "Track your heart rate, sleep metrics, GPS activities, and daily notifications.", "Electronics", 30, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80"),
        ("Premium Leather Backpack", 119.00, "Handcrafted genuine leather backpack with padded laptop sleeve and waterproof lining.", "Accessories", 18, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80"),
        ("Stainless Steel Thermal Bottle", 29.99, "Keep beverages hot for 12 hours or ice-cold for 24 hours in style.", "Home & Kitchen", 50, "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80"),
        ("Portable Bluetooth Speaker", 59.90, "Deep bass outdoor wireless speaker with IPX7 waterproof rating.", "Electronics", 40, "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80")
    ]

    cursor.execute("SELECT COUNT(*) as count FROM products")
    p_count = cursor.fetchone()['count']
    
    if p_count == 0:
        cursor.executemany('''
            INSERT INTO products (name, price, description, category, stock, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_products)
        conn.commit()
        print(f"[DB Initialized] Seeded {len(sample_products)} sample products.")
    else:
        for p in sample_products:
            name = p[0]
            img = p[5]
            cursor.execute("UPDATE products SET image_url = ? WHERE name = ?", (img, name))
        conn.commit()
        print(f"[DB Updated] Updated image URLs for sample products.")

    # Seed Orders if empty
    cursor.execute("SELECT COUNT(*) as count FROM orders")
    o_count = cursor.fetchone()['count']
    
    if o_count == 0:
        sample_orders = [
            (2, "Jane Doe", "user@example.com", 289.49, "Shipped", 2),
            (2, "Jane Doe", "user@example.com", 89.50, "Delivered", 1),
            (1, "Admin User", "admin@example.com", 499.99, "Processing", 1),
        ]
        
        cursor.executemany('''
            INSERT INTO orders (user_id, customer_name, customer_email, total_amount, status, items_count)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_orders)
        conn.commit()
        print(f"[DB Initialized] Seeded {len(sample_orders)} sample orders.")

    conn.close()

def delete_image_file_if_exists(image_url):
    if not image_url or not image_url.startswith("/static/uploads/"):
        return
    filename = os.path.basename(image_url)
    filepath = os.path.join("static", "uploads", filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            print(f"[Storage Cleanup] Deleted image file: {filepath}")
        except Exception as e:
            print(f"[Storage Cleanup Error] {e}")
