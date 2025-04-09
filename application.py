

from flask import Flask, request, jsonify, render_template, url_for, redirect, flash, session
from flask_pymongo import PyMongo
from werkzeug.utils import secure_filename
from bson.objectid import ObjectId
import os
from datetime import datetime
import cloudinary
import cloudinary.uploader
import cloudinary.api
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps



print("==== Flask app is being loaded ====")




app = Flask(__name__)

# MongoDB Configuration
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopkhana")
mongo = PyMongo(app)

# After load_dotenv()
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY') or 'temp_fallback_key'
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopkhana")
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', 'Muhammad Abdullah')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', 'secretskadminbro')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'printabdullah285@gmail.com')
app.config['DEBUG'] = False



# Initialize Mail
mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Allowed admin emails
ALLOWED_ADMINS = {'contact.mrnow285@gmail.com', 'm.akashabunkers99@gmail.com'}


from dotenv import load_dotenv
load_dotenv()  # Loads variables from .env into os.environ


# Configure Cloudinary credentials (set these as environment variables or directly)
cloudinary.config( 
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "your_cloud_name"),  
    api_key = os.getenv("CLOUDINARY_API_KEY", "your_api_key"),  
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "your_api_secret")
)

# Allowed file extensions remain the same
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'jfif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS




def admin_login_required(ajax=False):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not session.get('admin_authenticated'):
                if ajax:
                    return jsonify({'error': 'Unauthorized access'}), 401
                flash('Please authenticate yourself before proceeding.', 'error')
                return redirect(url_for('admin_login', next=request.url))
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# Authentication Routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        if email not in ALLOWED_ADMINS:
            flash('Sorry, your email address is not recognized.', 'error')
            return redirect(url_for('admin_login'))
            
        admin = mongo.db.admins.find_one({'email': email})
        if not admin:
            mongo.db.admins.insert_one({'email': email, 'security_code_hash': None})
            return redirect(url_for('create_security_code', email=email))
            
        if not admin.get('security_code_hash'):
            return redirect(url_for('create_security_code', email=email))
        else:
            return redirect(url_for('verify_security_code', email=email))
    
    return render_template('login.html')

@app.route('/admin/create-code', methods=['GET', 'POST'])
def create_security_code():
    email = request.args.get('email')
    if not email or email not in ALLOWED_ADMINS:
        flash('Something went wrong.', 'error')
        return redirect(url_for('admin_login'))
        
    if request.method == 'POST':
        code = request.form.get('code', '').strip()
        if len(code) != 6:
            flash('The security code must be exactly 6 characters long. Try again.', 'error')
            return redirect(url_for('create_security_code', email=email))
            
        mongo.db.admins.update_one(
            {'email': email},
            {'$set': {'security_code_hash': generate_password_hash(code)}}
        )
        send_verification_email(email)
        flash('A confirmation email has been sent to your address.', 'success')
        return redirect(url_for('admin_login'))
    
    return render_template('create_code.html', email=email)

@app.route('/admin/verify-code', methods=['GET', 'POST'])
def verify_security_code():
    email = request.args.get('email')
    if not email or email not in ALLOWED_ADMINS:
        flash('Something went wrong.', 'error')
        return redirect(url_for('admin_login'))
        
    admin = mongo.db.admins.find_one({'email': email})
    if not admin or not admin.get('security_code_hash'):
        flash('It seems like this is your first time here. Please create a security code.', 'error')
        return redirect(url_for('create_security_code', email=email))
        
    if request.method == 'POST':
        code = request.form.get('code', '').strip()
        if check_password_hash(admin['security_code_hash'], code):
            send_verification_email(email)
            flash('A confirmation email has been sent to your address.', 'success')
            return redirect(url_for('admin_login'))
        else:
            flash('The entered code is incorrect.', 'error')
    
    return render_template('verify_code.html', email=email)

@app.route('/admin/verify/<token>')
def verify_token(token):
    try:
        email = serializer.loads(token, salt='email-verification', max_age=300)
    except:
        flash('Something went wrong.', 'error')
        return redirect(url_for('admin_login'))
        
    session['admin_authenticated'] = True
    session['admin_email'] = email
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_authenticated', None)
    session.pop('admin_email', None)
    flash('You have been logged out successfully. Stay safe!', 'success')
    return redirect(url_for('admin_login'))



# Protect admin routes
@app.before_request
def require_admin_auth():
    if request.path.startswith('/admin') and not request.path.startswith('/admin/login') \
        and not request.path.startswith('/admin/create-code') \
        and not request.path.startswith('/admin/verify-code') \
        and not request.path.startswith('/admin/verify/') \
        and not request.path.startswith('/admin/logout'):
        
        if not session.get('admin_authenticated'):
            flash('Please login first', 'error')
            return redirect(url_for('admin_login'))



# ---------------------------
# Upload endpoint using Cloudinary
# ---------------------------
@app.route('/api/upload', methods=['POST'])
@admin_login_required(ajax=True)
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        # Optionally secure the filename if needed (Cloudinary manages names, but you can use it for logging)
        filename = secure_filename(file.filename)
        try:
            # Upload directly to Cloudinary
            upload_result = cloudinary.uploader.upload(file)
            # Get the secure URL of the uploaded image
            image_url = upload_result.get("secure_url")
            return jsonify({'url': image_url}), 201
        except Exception as e:
            return jsonify({'error': f"Cloudinary upload failed: {e}"}), 500
    return jsonify({'error': 'File type not allowed'}), 400


# API: Get all products
@app.route('/api/products', methods=['GET'])
@admin_login_required(ajax=True)
def get_products():
    products = []
    for prod in mongo.db.products.find():
        prod['_id'] = str(prod['_id'])
        products.append(prod)
    return jsonify(products), 200

# API: Add a new product
@app.route('/api/products', methods=['POST'])
@admin_login_required(ajax=True)
def add_product():
    data = request.get_json()
    result = mongo.db.products.insert_one(data)
    new_product = mongo.db.products.find_one({'_id': result.inserted_id})
    new_product['_id'] = str(new_product['_id'])
    return jsonify(new_product), 201

# API: Update an existing product
@app.route('/api/products/<product_id>', methods=['PUT'])
@admin_login_required(ajax=True)
def update_product(product_id):
    data = request.get_json()
    result = mongo.db.products.update_one({'_id': ObjectId(product_id)}, {'$set': data})
    if result.modified_count:
        updated_product = mongo.db.products.find_one({'_id': ObjectId(product_id)})
        updated_product['_id'] = str(updated_product['_id'])
        return jsonify(updated_product), 200
    else:
        return jsonify({"error": "Product not found or no changes made."}), 404

# API: Delete a product
@app.route('/api/products/<product_id>', methods=['DELETE'])
@admin_login_required(ajax=True)
def delete_product(product_id):
    result = mongo.db.products.delete_one({'_id': ObjectId(product_id)})
    if result.deleted_count:
        return jsonify({"message": "Product deleted successfully."}), 200
    else:
        return jsonify({"error": "Product not found."}), 404

# Serve the admin product management page
@app.route('/admin/products')
@admin_login_required()
def admin_products():
    return render_template('products.html')



# Category Endpoints
@app.route('/api/categories', methods=['GET'])
@admin_login_required(ajax=True)
def get_categories():
    categories = []
    for cat in mongo.db.categories.find():
        cat['_id'] = str(cat['_id'])
        categories.append(cat)
    return jsonify(categories), 200

@app.route('/api/categories', methods=['POST'])
@admin_login_required(ajax=True)
def add_category():
    data = request.get_json()
    # You may want to validate data here
    result = mongo.db.categories.insert_one(data)
    new_cat = mongo.db.categories.find_one({'_id': result.inserted_id})
    new_cat['_id'] = str(new_cat['_id'])
    return jsonify(new_cat), 201

@app.route('/api/categories/<cat_id>', methods=['PUT'])
@admin_login_required(ajax=True)
def update_category(cat_id):
    data = request.get_json()
    result = mongo.db.categories.update_one({'_id': ObjectId(cat_id)}, {'$set': data})
    if result.modified_count:
        updated_cat = mongo.db.categories.find_one({'_id': ObjectId(cat_id)})
        updated_cat['_id'] = str(updated_cat['_id'])
        return jsonify(updated_cat), 200
    else:
        return jsonify({"error": "Category not found or no changes made."}), 404

@app.route('/api/categories/<cat_id>', methods=['DELETE'])
@admin_login_required(ajax=True)
def delete_category(cat_id):
    result = mongo.db.categories.delete_one({'_id': ObjectId(cat_id)})
    if result.deleted_count:
        return jsonify({"message": "Category deleted successfully."}), 200
    else:
        return jsonify({"error": "Category not found."}), 404

# Serve the admin categories page
@app.route('/admin/categories')
@admin_login_required()
def admin_categories():
    return render_template('category.html')


# ----------------------------
# FAQs Endpoints
# ----------------------------

# GET all FAQs
@app.route('/api/faqs', methods=['GET'])
@admin_login_required(ajax=True)
def get_faqs():
    faqs = []
    for faq in mongo.db.faqs.find():
        faq['_id'] = str(faq['_id'])
        faqs.append(faq)
    return jsonify(faqs), 200

# PUT: Update an FAQ (e.g., update Answer and Status)
@app.route('/api/faqs/<faq_id>', methods=['PUT'])
@admin_login_required(ajax=True)
def update_faq(faq_id):
    data = request.get_json()
    result = mongo.db.faqs.update_one({'_id': ObjectId(faq_id)}, {'$set': data})
    if result.modified_count:
        updated_faq = mongo.db.faqs.find_one({'_id': ObjectId(faq_id)})
        updated_faq['_id'] = str(updated_faq['_id'])
        return jsonify(updated_faq), 200
    else:
        return jsonify({"error": "FAQ not found or no changes made."}), 404

# DELETE an FAQ
@app.route('/api/faqs/<faq_id>', methods=['DELETE'])
@admin_login_required(ajax=True)
def delete_faq(faq_id):
    result = mongo.db.faqs.delete_one({'_id': ObjectId(faq_id)})
    if result.deleted_count:
        return jsonify({"message": "FAQ deleted successfully."}), 200
    else:
        return jsonify({"error": "FAQ not found."}), 404

# ----------------------------
# Serve the Admin FAQs Page
# ----------------------------
@app.route('/admin/faqs')
@admin_login_required()
def admin_faqs():
    return render_template('faq.html')


# --------------------------
# Banners Endpoints
# --------------------------

# GET all banners
@app.route('/api/banners', methods=['GET'])
@admin_login_required(ajax=True)
def get_banners():
    banners = []
    for banner in mongo.db.banners.find():
        banner['_id'] = str(banner['_id'])
        banners.append(banner)
    return jsonify(banners), 200

# POST a new banner
@app.route('/api/banners', methods=['POST'])
@admin_login_required(ajax=True)
def add_banner():
    data = request.get_json()
    result = mongo.db.banners.insert_one(data)
    new_banner = mongo.db.banners.find_one({'_id': result.inserted_id})
    new_banner['_id'] = str(new_banner['_id'])
    return jsonify(new_banner), 201

# PUT: Update a banner
@app.route('/api/banners/<banner_id>', methods=['PUT'])
@admin_login_required(ajax=True)
def update_banner(banner_id):
    data = request.get_json()
    result = mongo.db.banners.update_one({'_id': ObjectId(banner_id)}, {'$set': data})
    if result.modified_count:
        updated_banner = mongo.db.banners.find_one({'_id': ObjectId(banner_id)})
        updated_banner['_id'] = str(updated_banner['_id'])
        return jsonify(updated_banner), 200
    else:
        return jsonify({"error": "Banner not found or no changes made."}), 404

# DELETE a banner
@app.route('/api/banners/<banner_id>', methods=['DELETE'])
@admin_login_required(ajax=True)
def delete_banner(banner_id):
    result = mongo.db.banners.delete_one({'_id': ObjectId(banner_id)})
    if result.deleted_count:
        return jsonify({"message": "Banner deleted successfully."}), 200
    else:
        return jsonify({"error": "Banner not found."}), 404

# --------------------------
# Serve the Admin Banners Page
# --------------------------
@app.route('/admin/banners')
@admin_login_required()
def admin_banners():
    return render_template('banners.html')



# ----------------------------
# Coupon Endpoints
# ----------------------------

# Get all coupons
@app.route('/api/coupons', methods=['GET'])
@admin_login_required(ajax=True)
def get_coupons():
    coupons = []
    for coupon in mongo.db.coupons.find():
        coupon['_id'] = str(coupon['_id'])
        coupons.append(coupon)
    return jsonify(coupons), 200

# Add a new coupon
@app.route('/api/coupons', methods=['POST'])
@admin_login_required(ajax=True)
def add_coupon():
    data = request.get_json()
    # Expecting data to have couponCode and discountPercent
    result = mongo.db.coupons.insert_one(data)
    new_coupon = mongo.db.coupons.find_one({'_id': result.inserted_id})
    new_coupon['_id'] = str(new_coupon['_id'])
    return jsonify(new_coupon), 201

# Update an existing coupon
@app.route('/api/coupons/<coupon_id>', methods=['PUT'])
@admin_login_required(ajax=True)
def update_coupon(coupon_id):
    data = request.get_json()
    result = mongo.db.coupons.update_one({'_id': ObjectId(coupon_id)}, {'$set': data})
    if result.modified_count:
        updated_coupon = mongo.db.coupons.find_one({'_id': ObjectId(coupon_id)})
        updated_coupon['_id'] = str(updated_coupon['_id'])
        return jsonify(updated_coupon), 200
    else:
        return jsonify({"error": "Coupon not found or no changes made."}), 404

# Delete a coupon
@app.route('/api/coupons/<coupon_id>', methods=['DELETE'])
@admin_login_required(ajax=True)
def delete_coupon(coupon_id):
    result = mongo.db.coupons.delete_one({'_id': ObjectId(coupon_id)})
    if result.deleted_count:
        return jsonify({"message": "Coupon deleted successfully."}), 200
    else:
        return jsonify({"error": "Coupon not found."}), 404

# Serve the admin coupons page
@app.route('/admin/coupons')
@admin_login_required()
def admin_coupons():
    return render_template('coupon.html')


# Endpoint to get fee details (deliveryFee and codfee)
@app.route('/api/fee_details', methods=['GET'])
@admin_login_required(ajax=True)
def get_fee_details():
    fee = mongo.db.main_details.find_one()
    if fee:
        fee['_id'] = str(fee['_id'])
        return jsonify(fee), 200
    else:
        # If no fee document exists, you may want to return default fees or an error
        default_fee = {"deliveryFee": 0, "codfee": 0}
        return jsonify(default_fee), 200

# Endpoint to update fee details
@app.route('/api/fee_details', methods=['PUT'])
@admin_login_required(ajax=True)
def update_fee_details():
    data = request.get_json()
    # Check if fee details exist
    fee = mongo.db.main_details.find_one()
    if fee:
        result = mongo.db.main_details.update_one(
            {'_id': fee['_id']},
            {'$set': data}
        )
        if result.modified_count:
            updated_fee = mongo.db.main_details.find_one({'_id': fee['_id']})
            updated_fee['_id'] = str(updated_fee['_id'])
            return jsonify(updated_fee), 200
        else:
            return jsonify({"error": "No changes made."}), 400
    else:
        # If not, insert a new document
        result = mongo.db.main_details.insert_one(data)
        new_fee = mongo.db.main_details.find_one({'_id': result.inserted_id})
        new_fee['_id'] = str(new_fee['_id'])
        return jsonify(new_fee), 201

# Serve the admin fee details page
@app.route('/admin/fee_details')
@admin_login_required()
def admin_fee_details():
    return render_template('fee_details.html')



# GET all reviews
@app.route('/api/reviews', methods=['GET'])
@admin_login_required(ajax=True)
def get_reviews():
    reviews = []
    for review in mongo.db.reviews.find():
        review['_id'] = str(review['_id'])
        reviews.append(review)
    return jsonify(reviews), 200

# Update a review
@app.route('/api/reviews/<review_id>', methods=['PUT'])
@admin_login_required(ajax=True)
def update_review(review_id):
    data = request.get_json()
    result = mongo.db.reviews.update_one({'_id': ObjectId(review_id)}, {'$set': data})
    if result.modified_count:
        updated_review = mongo.db.reviews.find_one({'_id': ObjectId(review_id)})
        updated_review['_id'] = str(updated_review['_id'])
        return jsonify(updated_review), 200
    else:
        return jsonify({"error": "Review not found or no changes made"}), 404

# Delete a review
@app.route('/api/reviews/<review_id>', methods=['DELETE'])
@admin_login_required(ajax=True)
def delete_review(review_id):
    result = mongo.db.reviews.delete_one({'_id': ObjectId(review_id)})
    if result.deleted_count:
        return jsonify({"message": "Review deleted successfully."}), 200
    else:
        return jsonify({"error": "Review not found."}), 404

# Serve the admin reviews page
@app.route('/admin/reviews')
@admin_login_required()
def admin_reviews():
    return render_template('reviews.html')




# Endpoint to get all orders
@app.route('/api/orders', methods=['GET'])
@admin_login_required(ajax=True)
def get_orders():
    orders = []
    for order in mongo.db.orders.find():
        order['_id'] = str(order['_id'])
        # Format the transaction date (if exists)
        if 'transaction_date' in order and order['transaction_date']:
            order['transaction_date'] = order['transaction_date'].strftime("%Y-%m-%d %H:%M:%S")
        if 'order_arrival_date' in order and order['order_arrival_date']:
            order['order_arrival_date'] = order['order_arrival_date'].strftime("%Y-%m-%d %H:%M:%S")
        orders.append(order)
    return jsonify(orders), 200

# Endpoint to update an order (e.g., mark as Delivered)
@app.route('/api/orders/<order_id>', methods=['PUT'])
@admin_login_required(ajax=True)
def update_order(order_id):
    data = request.get_json()
    # If marking delivered, add order_arrival_date as current time.
    if data.get("order_status") == "Delivered":
        data["order_arrival_date"] = datetime.utcnow()
    result = mongo.db.orders.update_one({'_id': ObjectId(order_id)}, {'$set': data})
    if result.modified_count:
        updated_order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        updated_order['_id'] = str(updated_order['_id'])
        if 'transaction_date' in updated_order and updated_order['transaction_date']:
            updated_order['transaction_date'] = updated_order['transaction_date'].strftime("%Y-%m-%d %H:%M:%S")
        if 'order_arrival_date' in updated_order and updated_order['order_arrival_date']:
            updated_order['order_arrival_date'] = updated_order['order_arrival_date'].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(updated_order), 200
    else:
        return jsonify({"error": "Order not found or no changes made."}), 404

# Serve the admin orders page
@app.route('/admin/orders')
@admin_login_required()
def admin_orders():
    return render_template('orders.html')

# ----- Returns Endpoints -----

# Get all returns
@app.route('/api/returns', methods=['GET'])
@admin_login_required(ajax=True)
def get_returns():
    returns = []
    for ret in mongo.db.returns.find():
        ret['_id'] = str(ret['_id'])
        # Convert requested_at to a formatted string if exists
        if 'requested_at' in ret and ret['requested_at']:
            ret['requested_at'] = ret['requested_at'].strftime("%Y-%m-%d %H:%M:%S")
        returns.append(ret)
    return jsonify(returns), 200

# Update a return (e.g. update refund_status and add refund_screenshot)
@app.route('/api/returns/<return_id>', methods=['PUT'])
@admin_login_required(ajax=True)
def update_return(return_id):
    data = request.get_json()
    # Update the return document
    result = mongo.db.returns.update_one({'_id': ObjectId(return_id)}, {'$set': data})
    if result.modified_count:
        updated_return = mongo.db.returns.find_one({'_id': ObjectId(return_id)})
        updated_return['_id'] = str(updated_return['_id'])
        if 'requested_at' in updated_return and updated_return['requested_at']:
            updated_return['requested_at'] = updated_return['requested_at'].strftime("%Y-%m-%d %H:%M:%S")
        return jsonify(updated_return), 200
    else:
        return jsonify({"error": "Return not found or no changes made."}), 404

# Delete a return (if needed)
@app.route('/api/returns/<return_id>', methods=['DELETE'])
@admin_login_required(ajax=True)
def delete_return(return_id):
    result = mongo.db.returns.delete_one({'_id': ObjectId(return_id)})
    if result.deleted_count:
        return jsonify({"message": "Return deleted successfully."}), 200
    else:
        return jsonify({"error": "Return not found."}), 404

# Serve the admin returns page
@app.route('/admin/returns')
@admin_login_required()
def admin_returns():
    return render_template('returns.html')


@app.route('/')
@admin_login_required()
def admin_dashboard():
    return render_template('dashboard.html')    



def send_verification_email(email):
    token = serializer.dumps(email, salt='email-verification')
    verification_link = url_for('verify_token', token=token, _external=True)
    
    msg = Message('Admin Verification Link', recipients=[email])
    msg.body = f'Click this link to verify your account (expires in 5 minutes):\n\n{verification_link}'
    mail.send(msg)


# Expose the WSGI callable for Elastic Beanstalk / gunicorn
application = app    

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)




