import os
import uuid
import math
from datetime import timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from database import init_db, get_db_connection, delete_image_file_if_exists

app = Flask(__name__)

# Enable CORS for all routes (supporting Authorization header)
CORS(app)

UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# JWT Configuration
app.config['JWT_SECRET_KEY'] = 'jwt_ecommerce_secret_key_2026_antigravity'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=7)

jwt = JWTManager(app)

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM token_blocklist WHERE jti = ?", (jti,))
    token = cursor.fetchone()
    conn.close()
    return token is not None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[-1].lower() in ALLOWED_EXTENSIONS

@app.errorhandler(RequestEntityTooLarge)
def handle_large_file(e):
    return jsonify({"error": "File size exceeds 2 MB limit"}), 400

# -------------------------------------------------------------
# Authentication Routes (JWT)
# -------------------------------------------------------------
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'customer').strip().lower()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required fields"}), 400

    if role not in ['customer', 'admin']:
        role = 'customer'

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "An account with this email address already exists"}), 400

    password_hash = generate_password_hash(password)
    cursor.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        (name, email, password_hash, role)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    user_id_str = str(user_id)
    access_token = create_access_token(
        identity=user_id_str,
        additional_claims={'role': role, 'name': name, 'email': email}
    )
    refresh_token = create_refresh_token(identity=user_id_str)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user_id,
            'name': name,
            'email': email,
            'role': role,
            'avatar_url': None
        }
    }), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,))
    user_row = cursor.fetchone()
    conn.close()

    if user_row is None or not check_password_hash(user_row['password_hash'], password):
        return jsonify({"error": "Invalid email or password"}), 401

    user = dict(user_row)
    user_id_str = str(user['id'])

    access_token = create_access_token(
        identity=user_id_str,
        additional_claims={
            'role': user['role'],
            'name': user['name'],
            'email': user['email']
        }
    )
    refresh_token = create_refresh_token(identity=user_id_str)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'avatar_url': user.get('avatar_url') if user.get('avatar_url') else None,
            'created_at': user.get('created_at')
        }
    }), 200


@app.route('/api/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row:
        return jsonify({"error": "User profile no longer exists"}), 404

    user = dict(user_row)
    new_token = create_access_token(
        identity=str(user['id']),
        additional_claims={
            'role': user['role'],
            'name': user['name'],
            'email': user['email']
        }
    )
    return jsonify({'access_token': new_token}), 200


@app.route('/api/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row:
        return jsonify({"error": "User profile not found"}), 404

    user_data = dict(user_row)
    if not user_data.get('avatar_url'):
        user_data['avatar_url'] = None

    return jsonify(user_data), 200


@app.route('/api/me', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    avatar_url = data.get('avatar_url', None)

    if not name or not email:
        return jsonify({"error": "Name and email required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if email is used by another user
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ? AND id != ?", (email, user_id))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Email already in use"}), 409

    if avatar_url is not None:
        cursor.execute(
            "UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE id = ?",
            (name, email, avatar_url, user_id)
        )
    else:
        cursor.execute(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            (name, email, user_id)
        )
    conn.commit()

    cursor.execute("SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
    updated_user = dict(cursor.fetchone())
    conn.close()

    if not updated_user.get('avatar_url'):
        updated_user['avatar_url'] = None

    return jsonify({
        "message": "Profile updated",
        "user": updated_user
    }), 200


@app.route('/api/me/password', methods=['PUT'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    current = data.get('current_password') or data.get('current', '')
    new_pass = data.get('new_password') or data.get('new_pass', '')
    confirm = data.get('confirm_password') or data.get('confirm', '')

    if new_pass != confirm:
        return jsonify({"error": "Passwords do not match"}), 400

    if len(new_pass) < 6:
        return jsonify({"error": "Min 6 characters"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        return jsonify({"error": "User profile not found"}), 404

    user = dict(user_row)
    if not check_password_hash(user['password_hash'], current):
        conn.close()
        return jsonify({"error": "Current password incorrect"}), 401

    hashed = generate_password_hash(new_pass)
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hashed, user_id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Password changed"}), 200


@app.route('/api/me/avatar', methods=['PUT'])
@jwt_required()
def update_avatar():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Formats allowed: PNG, JPG, JPEG, WEBP"}), 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({"error": "File size exceeds 2 MB"}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
    file.save(filepath)

    avatar_url = f"/static/uploads/{unique_name}"
    user_id = get_jwt_identity()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, user_id))
    conn.commit()

    cursor.execute("SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
    updated_user = dict(cursor.fetchone())
    conn.close()

    if not updated_user.get('avatar_url'):
        updated_user['avatar_url'] = None

    return jsonify({
        "message": "Profile picture updated successfully!",
        "avatar_url": avatar_url,
        "user": updated_user
    }), 200


@app.route('/api/me/avatar', methods=['DELETE'])
@jwt_required()
def delete_avatar():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT avatar_url FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if row and row['avatar_url']:
        old_avatar = row['avatar_url']
        if old_avatar.startswith('/static/uploads/'):
            filename = old_avatar.replace('/static/uploads/', '')
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception as e:
                    print(f"Failed to remove avatar file {filepath}: {e}")

    cursor.execute("UPDATE users SET avatar_url = NULL WHERE id = ?", (user_id,))
    conn.commit()

    cursor.execute("SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
    updated_user = dict(cursor.fetchone())
    conn.close()

    if not updated_user.get('avatar_url'):
        updated_user['avatar_url'] = None

    return jsonify({
        "message": "Profile picture removed. Initials avatar restored!",
        "avatar_url": None,
        "user": updated_user
    }), 200


@app.route('/api/me/stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT created_at FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    cursor.execute("SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_spent FROM orders WHERE user_id = ?", (user_id,))
    stats_row = cursor.fetchone()
    conn.close()

    return jsonify({
        "created_at": user_row['created_at'],
        "total_orders": stats_row['total_orders'],
        "total_spent": round(stats_row['total_spent'], 2)
    }), 200


@app.route('/api/me', methods=['DELETE'])
@jwt_required()
def delete_account():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM orders WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

    return jsonify({"message": "Account deleted successfully"}), 200


@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    jwt_data = get_jwt()
    jti = jwt_data['jti']
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO token_blocklist (jti) VALUES (?)", (jti,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Successfully logged out"}), 200


# -------------------------------------------------------------
# File Upload Route (Protected for authenticated users)
# -------------------------------------------------------------
@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Allowed formats: PNG, JPG, JPEG, WEBP"}), 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({"error": "File size exceeds maximum allowed size of 2 MB"}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
    
    file.save(filepath)

    image_url = f"/static/uploads/{unique_name}"
    return jsonify({"image_url": image_url, "message": "Image uploaded successfully!"}), 201


# -------------------------------------------------------------
# Products Routes (Public GET, Protected POST/PUT/DELETE for Admin)
# -------------------------------------------------------------
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        page = max(1, int(request.args.get('page', 1)))
    except ValueError:
        page = 1

    try:
        limit = max(1, int(request.args.get('limit', 8)))
    except ValueError:
        limit = 8

    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    sort = request.args.get('sort', 'newest').strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    where_clauses = []
    params = []

    if search:
        where_clauses.append("(name LIKE ? OR description LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])

    if category and category.lower() != 'all':
        where_clauses.append("category = ?")
        params.append(category)

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    count_query = f"SELECT COUNT(*) as total FROM products {where_sql}"
    cursor.execute(count_query, params)
    total = cursor.fetchone()['total']

    total_pages = math.ceil(total / limit) if total > 0 else 1
    if page > total_pages and total_pages > 0:
        page = total_pages

    offset = (page - 1) * limit

    order_clause = "ORDER BY created_at DESC, id DESC"
    if sort == 'price_low':
        order_clause = "ORDER BY price ASC"
    elif sort == 'price_high':
        order_clause = "ORDER BY price DESC"
    elif sort == 'name':
        order_clause = "ORDER BY name ASC"

    data_query = f"SELECT * FROM products {where_sql} {order_clause} LIMIT ? OFFSET ?"
    cursor.execute(data_query, params + [limit, offset])
    rows = cursor.fetchall()
    conn.close()

    products = [dict(row) for row in rows]

    return jsonify({
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }), 200


@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return jsonify({"error": "Product not found"}), 404

    return jsonify(dict(row)), 200


@app.route('/api/products', methods=['POST'])
@jwt_required()
def create_product():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required to create products'}), 403

    data = request.get_json() or {}
    name = data.get('name')
    price = data.get('price')
    description = data.get('description', '')
    category = data.get('category', 'Electronics')
    stock = data.get('stock', 1)
    image_url = data.get('image_url', '')

    if not name or price is None:
        return jsonify({"error": "Name and price are required fields"}), 400

    try:
        price = float(price)
        stock = int(stock)
    except ValueError:
        return jsonify({"error": "Price must be a number and stock must be an integer"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO products (name, price, description, category, stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (name, price, description, category, stock, image_url))
    conn.commit()
    new_id = cursor.lastrowid
    
    cursor.execute("SELECT * FROM products WHERE id = ?", (new_id,))
    new_product = dict(cursor.fetchone())
    conn.close()

    return jsonify(new_product), 201


@app.route('/api/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required to update products'}), 403

    data = request.get_json() or {}

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    existing = cursor.fetchone()

    if existing is None:
        conn.close()
        return jsonify({"error": "Product not found"}), 404

    existing_dict = dict(existing)
    
    name = data.get('name', existing_dict['name'])
    price = data.get('price', existing_dict['price'])
    description = data.get('description', existing_dict['description'])
    category = data.get('category', existing_dict['category'])
    stock = data.get('stock', existing_dict['stock'])
    new_image_url = data.get('image_url', existing_dict['image_url'])

    if new_image_url != existing_dict['image_url']:
        delete_image_file_if_exists(existing_dict['image_url'])

    cursor.execute('''
        UPDATE products
        SET name = ?, price = ?, description = ?, category = ?, stock = ?, image_url = ?
        WHERE id = ?
    ''', (name, float(price), description, category, int(stock), new_image_url, product_id))
    conn.commit()

    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    updated_product = dict(cursor.fetchone())
    conn.close()

    return jsonify(updated_product), 200


@app.route('/api/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required to delete products'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    existing = cursor.fetchone()

    if existing is None:
        conn.close()
        return jsonify({"error": "Product not found"}), 404

    image_url = existing['image_url']
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()

    delete_image_file_if_exists(image_url)

    return jsonify({"message": "Product deleted successfully"}), 200


# -------------------------------------------------------------
# User Orders & Admin Orders Routes
# -------------------------------------------------------------
@app.route('/api/orders/my', methods=['GET'])
@jwt_required()
def my_orders():
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_email = (claims.get('email') or '').strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM orders WHERE user_id = ? OR LOWER(customer_email) = ? ORDER BY created_at DESC",
        (user_id, user_email)
    )
    rows = cursor.fetchall()
    conn.close()

    orders = [dict(row) for row in rows]
    return jsonify({"orders": orders}), 200


@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    claims = get_jwt()
    user_name = claims.get('name', 'Customer')
    user_email = (claims.get('email') or '').strip()

    data = request.get_json() or {}
    product_id = data.get('product_id')
    items_count = max(1, int(data.get('items_count', 1)))

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        total_amount = 0.0
        if product_id:
            cursor.execute("SELECT price, stock FROM products WHERE id = ?", (product_id,))
            prod = cursor.fetchone()
            if prod:
                total_amount = float(prod['price']) * items_count
                if prod['stock'] >= items_count:
                    cursor.execute("UPDATE products SET stock = stock - ? WHERE id = ?", (items_count, product_id))

        if total_amount == 0.0 and data.get('total_amount'):
            total_amount = float(data.get('total_amount'))

        cursor.execute('''
            INSERT INTO orders (user_id, customer_name, customer_email, total_amount, status, items_count)
            VALUES (?, ?, ?, ?, 'Pending', ?)
        ''', (user_id, user_name, user_email, total_amount, items_count))
        conn.commit()
        new_order_id = cursor.lastrowid

        cursor.execute("SELECT * FROM orders WHERE id = ?", (new_order_id,))
        new_order = dict(cursor.fetchone())
        return jsonify(new_order), 201
    except Exception as e:
        conn.rollback()
        print(f"[Order Creation Error] {e}")
        return jsonify({"error": f"Failed to place order: {str(e)}"}), 500
    finally:
        conn.close()


@app.route('/api/admin/orders', methods=['GET'])
@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    try:
        page = max(1, int(request.args.get('page', 1)))
    except ValueError:
        page = 1

    try:
        limit = max(1, int(request.args.get('limit', 10)))
    except ValueError:
        limit = 10

    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    where_clauses = []
    params = []

    if search:
        where_clauses.append("(customer_name LIKE ? OR customer_email LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])

    if status and status.lower() != 'all':
        where_clauses.append("status = ?")
        params.append(status)

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    cursor.execute(f"SELECT COUNT(*) as total FROM orders {where_sql}", params)
    total = cursor.fetchone()['total']

    total_pages = math.ceil(total / limit) if total > 0 else 1
    if page > total_pages and total_pages > 0:
        page = total_pages

    offset = (page - 1) * limit

    cursor.execute(f"SELECT * FROM orders {where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?", params + [limit, offset])
    rows = cursor.fetchall()
    conn.close()

    orders = [dict(row) for row in rows]

    return jsonify({
        "orders": orders,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }), 200


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
