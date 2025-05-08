import mysql.connector
from faker import Faker
import os
import shutil
import uuid
import bcrypt
from decimal import Decimal
from datetime import datetime, timedelta
import random
import json
import requests

# --- Configuration ---
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '81780937ma',
    'database': 'commerce'
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
AVATAR_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'avatars')
PRODUCT_UPLOAD_DIR = os.path.join(UPLOAD_DIR, 'products')

SAMPLE_DATA_DIR = os.path.join(BASE_DIR, 'sample_data_for_script')
SAMPLE_AVATARS_DIR = os.path.join(SAMPLE_DATA_DIR, 'images', 'avatars')
SAMPLE_PRODUCTS_DIR = os.path.join(SAMPLE_DATA_DIR, 'images', 'products')

os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)
os.makedirs(PRODUCT_UPLOAD_DIR, exist_ok=True)
os.makedirs(SAMPLE_AVATARS_DIR, exist_ok=True)
os.makedirs(SAMPLE_PRODUCTS_DIR, exist_ok=True)

fake = Faker()

def get_db_connection():
    """Establishes a connection to the MySQL database."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print("Successfully connected to the database.")
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        exit(1)

def hash_password(password):
    """Hashes a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password.decode('utf-8')

def copy_and_get_image_path(source_image_dir, image_type, target_upload_dir):
    """
    Copies a random image from the source_image_dir to the target_upload_dir
    and returns the relative path for database storage.
    Returns None if source directory is empty or not found.
    """
    if not os.path.exists(source_image_dir) or not os.listdir(source_image_dir):
        print(f"Warning: Sample image directory not found or empty: {source_image_dir}")
        return None

    sample_images = [f for f in os.listdir(source_image_dir) if os.path.isfile(os.path.join(source_image_dir, f))]
    if not sample_images:
        print(f"Warning: No files found in sample image directory: {source_image_dir}")
        return None

    chosen_image_name = random.choice(sample_images)
    source_image_path = os.path.join(source_image_dir, chosen_image_name)
    
    _, extension = os.path.splitext(chosen_image_name)
    unique_filename = f"{uuid.uuid4()}{extension}"
    
    destination_path = os.path.join(target_upload_dir, unique_filename)
    
    try:
        shutil.copy2(source_image_path, destination_path)
        return f"/{image_type}s/{unique_filename}" 
    except Exception as e:
        print(f"Error copying image {source_image_path} to {destination_path}: {e}")
        return None

# --- Data Creation Functions ---

def create_users(cursor, num_customers=10, num_merchants=3, num_admins=1):
    """Creates users with different roles."""
    print("\nCreating users...")
    created_users_data = {'customers': [], 'merchants': [], 'admins': []}
    
    roles_map = {
        'customer': 'USER', 
        'merchant': 'MERCHANT',
        'admin': 'ADMIN'
    }

    def _create_user_set(n, role_key):
        user_group_list = []
        for i in range(n):
            username = fake.user_name() + str(random.randint(100,999))
            email = fake.email()
            password = "password123"
            hashed_pass = hash_password(password)
            nickname = fake.name()
            avatar_path = copy_and_get_image_path(SAMPLE_AVATARS_DIR, "avatar", AVATAR_UPLOAD_DIR)
            role = roles_map[role_key]
            status = "ACTIVE"
            created_at = datetime.now()
            updated_at = datetime.now()

            sql = """
            INSERT INTO users (username, email, password, nickname, avatar, role, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            try:
                cursor.execute(sql, (username, email, hashed_pass, nickname, avatar_path, role, status, created_at, updated_at))
                user_id = cursor.lastrowid
                user_group_list.append({'id': user_id, 'username': username, 'email': email, 'nickname': nickname, 'role': role})
                print(f"  Created {role_key}: {username} (ID: {user_id}) with role: {role}")
            except mysql.connector.Error as err:
                print(f"  Error creating {role_key} {username}: {err}")
        return user_group_list

    created_users_data['customers'] = _create_user_set(num_customers, 'customer')
    created_users_data['merchants'] = _create_user_set(num_merchants, 'merchant')
    created_users_data['admins'] = _create_user_set(num_admins, 'admin')
    
    print("Users creation complete.")
    return created_users_data

# ... (rest of the script remains the same for product, variant, order creation as table names were correct there)
# ... but the TRUNCATE list needs to be updated

def create_products_and_variants(cursor, merchants, num_products_per_merchant=5, variants_per_product_range=(1, 4)):
    """Creates products and their variants for given merchants."""
    print("\nCreating products and variants...")
    all_products_info = []
    all_variants_info = []
    if not merchants:
        print("  No merchants to create products for. Skipping product creation.")
        return all_products_info, all_variants_info
    for merchant in merchants:
        merchant_id = merchant['id']
        print(f"  Creating products for merchant ID: {merchant_id}")
        for i in range(num_products_per_merchant):
            product_name = fake.catch_phrase() + " " + fake.word().capitalize()
            description = fake.paragraph(nb_sentences=3)
            category = random.choice(["Electronics", "Books", "Clothing", "Home & Kitchen", "Sports"])
            default_image_path = copy_and_get_image_path(SAMPLE_PRODUCTS_DIR, "product", PRODUCT_UPLOAD_DIR)
            
            features_list = fake.words(nb=random.randint(3,7))
            features_json = json.dumps(features_list)
            # 修改这部分代码：
            specifications_list = [{"key": fake.word(), "value": fake.sentence()} for _ in range(random.randint(2,5))]
            specifications_json = json.dumps(specifications_list)
            
            status = "ACTIVE"
            created_at = datetime.now()
            updated_at = datetime.now()
            sql_product = """
            INSERT INTO products (owner_id, name, description, category, default_image, 
                                 features, specifications, status, 
                                 min_price, total_stock, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            initial_min_price = Decimal('0.00')
            initial_total_stock = 0
            
            try:
                cursor.execute(sql_product, (merchant_id, product_name, description, category, default_image_path,
                                             features_json, specifications_json, status,
                                             initial_min_price, initial_total_stock, created_at, updated_at))
                product_id = cursor.lastrowid
                print(f"    Created product: {product_name} (ID: {product_id})")
                all_products_info.append({
                    'id': product_id, 
                    'name': product_name, 
                    'owner_id': merchant_id, 
                    'default_image': default_image_path,
                    'category': category
                })
            except mysql.connector.Error as err:
                print(f"    Error creating product {product_name}: {err}")
                continue
            num_variants = random.randint(variants_per_product_range[0], variants_per_product_range[1])
            for j in range(num_variants):
                color = fake.color_name() if random.choice([True, False]) else None
                size = random.choice(["S", "M", "L", "XL", "One Size"]) if random.choice([True, False]) else None
                if num_variants > 1 and color is None and size is None:
                    if j % 2 == 0 and color is None: color = fake.color_name()
                    elif size is None : size = random.choice(["S", "M", "L", "XL"])
                price = Decimal(str(round(random.uniform(5.0, 200.0), 2)))
                variant_image_path = copy_and_get_image_path(SAMPLE_PRODUCTS_DIR, "product", PRODUCT_UPLOAD_DIR)
                if not variant_image_path:
                    variant_image_path = default_image_path 
                
                stock_quantity = random.randint(0, 100)
                
                sql_variant = """
                INSERT INTO product_variants (product_id, color, size, price, image, stock_quantity, reserved_quantity, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """ 
                try:
                    cursor.execute(sql_variant, (product_id, color, size, price, variant_image_path, 
                                                 stock_quantity, 0, created_at, updated_at))
                    variant_id = cursor.lastrowid
                    print(f"      Created variant for product {product_id}: Color: {color}, Size: {size}, Price: {price}, Stock: {stock_quantity}, Reserved: 0 (ID: {variant_id})")
                    
                    variant_info = {
                        'id': variant_id, 
                        'product_id': product_id, 
                        'product_name': product_name, 
                        'color': color, 
                        'size': size, 
                        'price': price, 
                        'image': variant_image_path,
                        'stock_quantity': stock_quantity
                    }
                    all_variants_info.append(variant_info)
                except mysql.connector.Error as err:
                    print(f"      Error creating variant for product {product_id}: {err}")
                
    print("Products and variants creation complete.")
    return all_products_info, all_variants_info

def create_orders(cursor, customers, all_variants_info, all_products_info, num_orders_per_customer_range=(0, 3), items_per_order_range=(1, 5)):
    """Creates orders and order items for given customers, reflecting new order logic."""
    print("\nCreating orders...")
    if not customers:
        print("  No customers to create orders for. Skipping order creation.")
        return
    if not all_variants_info:
        print("  No product variants available to create orders. Skipping order creation.")
        return
    if not all_products_info:
        print("  No product info available to map variants to merchants. Skipping order creation.")
        return

    # Build a map for product_id to owner_id for quick lookup
    product_to_owner_map = {p['id']: p['owner_id'] for p in all_products_info}

    # Updated order statuses with new states, can adjust weights by repetition
    order_statuses_pool = [
        "PENDING_PAYMENT", "PENDING_PAYMENT", "PENDING_PAYMENT", "PENDING_PAYMENT",
        "PENDING", "PENDING", "PENDING", 
        "SHIPPED", "SHIPPED", "SHIPPED","SHIPPED", "SHIPPED", "SHIPPED",
        "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED",
        "CANCELED", "CANCELED", "CANCELED", "CANCELED", "CANCELED",
        # CANCELED_TIMEOUT is now derived only from PENDING_PAYMENT orders expiring
    ]
    
    PAYMENT_EXPIRY_MINUTES = 15 # Align with application logic

    for customer in customers:
        customer_id = customer['id']
        # num_conceptual_orders determines how many times a customer attempts to "checkout"
        # Each conceptual order might result in multiple actual orders if items are from different merchants
        num_conceptual_orders = random.randint(num_orders_per_customer_range[0], num_orders_per_customer_range[1])
        print(f"  Conceptualizing {num_conceptual_orders} 'checkout attempts' for customer: {customer['username']} (ID: {customer_id})")

        for i in range(num_conceptual_orders):
            num_items_in_conceptual_order = random.randint(items_per_order_range[0], items_per_order_range[1])
            if not all_variants_info or num_items_in_conceptual_order == 0:
                continue # Skip if no items to order or no variants available

            k_items = min(num_items_in_conceptual_order, len(all_variants_info))
            selected_variants_for_conceptual_order = random.sample(all_variants_info, k_items)
            
            if not selected_variants_for_conceptual_order:
                continue

            # Group selected variants by merchant (owner_id)
            items_by_merchant = {}
            for variant_data in selected_variants_for_conceptual_order:
                product_id = variant_data['product_id']
                owner_id = product_to_owner_map.get(product_id)
                if owner_id is None:
                    print(f"      Warning: Could not find owner for product_id {product_id} (variant_id {variant_data['id']}). Skipping this variant.")
                    continue
                
                if owner_id not in items_by_merchant:
                    items_by_merchant[owner_id] = []
                
                # Add quantity for this specific item in the conceptual order
                current_item_details = variant_data.copy()
                current_item_details['quantity_in_order'] = random.randint(1, 2) # Simpler quantity per item
                items_by_merchant[owner_id].append(current_item_details)

            # For each merchant group, create an actual order
            for merchant_id, merchant_items_list in items_by_merchant.items():
                if not merchant_items_list:
                    continue

                order_status = random.choice(order_statuses_pool)
                
                # Determine created_at (making some orders older)
                if random.random() < 0.7: # 70% chance of older order
                    created_at_dt = fake.date_time_between(start_date="-90d", end_date="-1d", tzinfo=None)
                else: # 30% chance of recent order
                    created_at_dt = fake.date_time_between(start_date="-24h", end_date="now", tzinfo=None)

                updated_at_dt = created_at_dt
                expires_at_dt = None

                if order_status == "PENDING_PAYMENT":
                    # Set expires_at relative to created_at
                    expires_at_dt = created_at_dt + timedelta(minutes=PAYMENT_EXPIRY_MINUTES + random.randint(0, 10))
                    # Check if this PENDING_PAYMENT order should have timed out
                    if expires_at_dt < datetime.now() and random.random() < 0.8: # 80% chance if expiry time has passed
                        order_status = "CANCELED_TIMEOUT" # Correctly set to CANCELED_TIMEOUT
                        updated_at_dt = expires_at_dt + timedelta(seconds=random.randint(60, 3600)) # Mark as updated sometime after expiry
                        if updated_at_dt > datetime.now(): # Ensure updated_at is not in the future
                           updated_at_dt = datetime.now() - timedelta(seconds=random.randint(1,60))
                        expires_at_dt = None # No future expiry for timed-out orders
                    else: # Still pending payment, updated_at can be same as created_at or slightly later
                        if random.random() < 0.3 : updated_at_dt = fake.date_time_between(start_date=created_at_dt, end_date=min(datetime.now(), expires_at_dt if expires_at_dt else datetime.now()), tzinfo=None)
                
                elif order_status not in ["PENDING_PAYMENT", "PENDING"]: # For PENDING, updated_at might be same as created_at
                     updated_at_dt = fake.date_time_between(start_date=created_at_dt, end_date="now", tzinfo=None)
                     if updated_at_dt < created_at_dt : updated_at_dt = created_at_dt # Sanity check


                # Convert datetimes to strings for DB
                created_at_str = created_at_dt.strftime('%Y-%m-%d %H:%M:%S')
                updated_at_str = updated_at_dt.strftime('%Y-%m-%d %H:%M:%S')
                expires_at_str = expires_at_dt.strftime('%Y-%m-%d %H:%M:%S') if expires_at_dt else None
                
                # Calculate total_amount for this merchant-specific order
                current_order_total_amount = Decimal('0.00')
                for item_detail in merchant_items_list:
                    current_order_total_amount += (item_detail['price'] * item_detail['quantity_in_order'])

                sql_order = """
                INSERT INTO `orders` (user_id, status, created_at, updated_at, total_amount, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                """
                try:
                    cursor.execute(sql_order, (customer_id, order_status, created_at_str, updated_at_str, 
                                                current_order_total_amount, expires_at_str))
                    order_id = cursor.lastrowid
                    print(f"    Created Order ID: {order_id} for Merchant: {merchant_id}, User: {customer_id}, Status: {order_status}, Total: {current_order_total_amount}, Expires: {expires_at_str}, Created: {created_at_str}")

                    # Insert order_items for this order
                    for item_detail in merchant_items_list:
                sql_order_item = """
                INSERT INTO order_items (order_id, product_id, product_variant_id, quantity, purchased_price,
                                        snapshot_product_name, snapshot_variant_color, snapshot_variant_size, snapshot_variant_image,
                                        created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                        # Order items share created/updated timestamps with their parent order for simplicity in script
                        cursor.execute(sql_order_item, (order_id, item_detail['product_id'], item_detail['id'], 
                                                        item_detail['quantity_in_order'], item_detail['price'],
                                                        item_detail['product_name'], item_detail['color'], 
                                                        item_detail['size'], item_detail['image'],
                                                        created_at_str, updated_at_str)) # Using order's timestamps
                    # print(f"      Items added for order {order_id}")
                except mysql.connector.Error as err:
                    print(f"    Error creating order or items for merchant {merchant_id}, customer {customer_id}: {err}")
                    # conn.rollback() # Might be too granular to rollback here if part of larger transaction
                    continue # Skip to next merchant or conceptual order

    print("Orders creation complete.")

# --- Main Population Function ---
def populate_database(clear_existing_data=False):
    """Main function to populate the database."""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return
        
        cursor = conn.cursor()

        if clear_existing_data:
            print("\nClearing existing data...")
            tables_to_clear_in_order = [
                'order_items',
                'orders',
                'wishlist_items',
                'cart_items',
                'product_variants',
                'products',
                'users'
            ]
            try:
                cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
                print("  Disabled foreign key checks.")
                for table_name in tables_to_clear_in_order:
                    print(f"    Clearing table: {table_name}...")
                    cursor.execute(f"TRUNCATE TABLE {table_name};")
                print("  All specified tables cleared.")
            except mysql.connector.Error as err:
                print(f"  Error during table clearing: {err}")
            finally:
                cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
                print("  Re-enabled foreign key checks.")

        # Call user creation function, which now returns the created users list
        all_created_users = create_users(cursor, num_customers=20, num_merchants=5, num_admins=2)
        
        # Pass the merchants list from the returned data
        products, variants = create_products_and_variants(cursor, all_created_users['merchants'], 
                                                          num_products_per_merchant=random.randint(3,8), 
                                                          variants_per_product_range=(1,5))
        # Pass the customers list and products list to create_orders
        create_orders(cursor, all_created_users['customers'], variants, products,
                      num_orders_per_customer_range=(0,4), 
                      items_per_order_range=(1,3)) # Adjusted ranges slightly for variety

        conn.commit()
        print("\nDatabase population script completed successfully!")

    except mysql.connector.Error as err:
        print(f"Database error during population: {err}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    print("Starting database population script...")

    # --- Auto-download placeholder images if sample directories are empty ---
    def download_placeholder_images(target_dir, image_prefix, num_images, base_width, base_height, variation_w, variation_h, image_type_param=""):
        if not os.listdir(target_dir):
            print(f"Sample directory {target_dir} is empty. Attempting to download placeholder images from unsplash.it...")
            for i in range(num_images):
                width = base_width + random.randint(-variation_w, variation_w)
                height = base_height + random.randint(-variation_h, variation_h)
                width = max(100, width)
                height = max(100, height)
                
                # Using unsplash.it for placeholder images
                image_url = f"https://unsplash.it/{width}/{height}?random"
                if image_type_param: # Add specific parameters like gravity=face for avatars
                    image_url += f"&{image_type_param}"
                
                try:
                    # unsplash.it redirects to an actual image URL, requests handles redirects by default
                    print(f"  Requesting: {image_url}")
                    response = requests.get(image_url, stream=True, timeout=20) # Increased timeout for potential redirects
                    response.raise_for_status()
                    
                    # Determine file extension (unsplash.it usually gives jpeg)
                    # For simplicity, we'll assume .jpg. A more robust way would be to check Content-Type header.
                    filename = os.path.join(target_dir, f"{image_prefix}_placeholder_{i+1}.jpg") 
                    
                    with open(filename, "wb") as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    print(f"  Downloaded: {filename}") # Removed (from {image_url}) as it might be the final redirected URL
                except requests.exceptions.RequestException as e:
                    print(f"  Error downloading from {image_url}: {e}")
                except Exception as e:
                    print(f"  An unexpected error occurred while downloading from {image_url}: {e}")
            
            if not os.listdir(target_dir):
                 print(f"  Warning: Still no images in {target_dir} after attempting download. Image-dependent features might fail.")
        else:
            print(f"Sample directory {target_dir} is not empty. Skipping placeholder download.")

    print("\nChecking for sample avatar images...")
    download_placeholder_images(target_dir=SAMPLE_AVATARS_DIR, 
                                image_prefix="avatar", 
                                num_images=5,
                                base_width=150, base_height=150, 
                                variation_w=20, variation_h=20, # Reduced variation for more consistent avatar sizes
                                image_type_param="gravity=face") # Attempt to get face-centered images

    print("\nChecking for sample product images...")
    download_placeholder_images(target_dir=SAMPLE_PRODUCTS_DIR, 
                                image_prefix="product", 
                                num_images=10,
                                base_width=400, base_height=300, 
                                variation_w=100, variation_h=50)
    
    print("\nProceeding with database population...")
    populate_database(clear_existing_data=False)
