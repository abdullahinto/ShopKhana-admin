from flask import Flask, request, jsonify, render_template, url_for
from flask_pymongo import PyMongo
from werkzeug.utils import secure_filename
from bson.objectid import ObjectId
import os
import shutil


app = Flask(__name__)

# Configure MongoDB
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopkhana")
mongo = PyMongo(app)

# Configure file upload settings
UPLOAD_FOLDER = os.path.join(app.root_path, 'static/uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'jfif'}

SHOPKHANA_UPLOADS_PATH = r"C:\Users\HP\Documents\interface\static\uploads" # Adjust path if needed

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(SHOPKHANA_UPLOADS_PATH):
    os.makedirs(SHOPKHANA_UPLOADS_PATH)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def copy_to_shopkhana(filename):
    """Copy uploaded file to ShopKhana's static folder."""
    source = os.path.join(UPLOAD_FOLDER, filename)
    destination = os.path.join(SHOPKHANA_UPLOADS_PATH, filename)
    
    try:
        shutil.copy(source, destination)
    except Exception as e:
        print(f"Error copying file to ShopKhana: {e}")



# Upload endpoint
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        # Copy file to ShopKhana
        copy_to_shopkhana(filename)

        file_url = request.host_url + 'static/uploads/' + filename
        return jsonify({'url': file_url}), 201
    return jsonify({'error': 'File type not allowed'}), 400


# API: Get all products
@app.route('/api/products', methods=['GET'])
def get_products():
    products = []
    for prod in mongo.db.products.find():
        prod['_id'] = str(prod['_id'])
        products.append(prod)
    return jsonify(products), 200

# API: Add a new product
@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.get_json()
    result = mongo.db.products.insert_one(data)
    new_product = mongo.db.products.find_one({'_id': result.inserted_id})
    new_product['_id'] = str(new_product['_id'])
    return jsonify(new_product), 201

# API: Update an existing product
@app.route('/api/products/<product_id>', methods=['PUT'])
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
def delete_product(product_id):
    result = mongo.db.products.delete_one({'_id': ObjectId(product_id)})
    if result.deleted_count:
        return jsonify({"message": "Product deleted successfully."}), 200
    else:
        return jsonify({"error": "Product not found."}), 404

# Serve the admin product management page
@app.route('/admin/products')
def admin_products():
    return render_template('products.html')



# Category Endpoints
@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = []
    for cat in mongo.db.categories.find():
        cat['_id'] = str(cat['_id'])
        categories.append(cat)
    return jsonify(categories), 200

@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.get_json()
    # You may want to validate data here
    result = mongo.db.categories.insert_one(data)
    new_cat = mongo.db.categories.find_one({'_id': result.inserted_id})
    new_cat['_id'] = str(new_cat['_id'])
    return jsonify(new_cat), 201

@app.route('/api/categories/<cat_id>', methods=['PUT'])
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
def delete_category(cat_id):
    result = mongo.db.categories.delete_one({'_id': ObjectId(cat_id)})
    if result.deleted_count:
        return jsonify({"message": "Category deleted successfully."}), 200
    else:
        return jsonify({"error": "Category not found."}), 404

# Serve the admin categories page
@app.route('/admin/categories')
def admin_categories():
    return render_template('category.html')


# ----------------------------
# FAQs Endpoints
# ----------------------------

# GET all FAQs
@app.route('/api/faqs', methods=['GET'])
def get_faqs():
    faqs = []
    for faq in mongo.db.faqs.find():
        faq['_id'] = str(faq['_id'])
        faqs.append(faq)
    return jsonify(faqs), 200

# PUT: Update an FAQ (e.g., update Answer and Status)
@app.route('/api/faqs/<faq_id>', methods=['PUT'])
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
def admin_faqs():
    return render_template('faq.html')


# --------------------------
# Banners Endpoints
# --------------------------

# GET all banners
@app.route('/api/banners', methods=['GET'])
def get_banners():
    banners = []
    for banner in mongo.db.banners.find():
        banner['_id'] = str(banner['_id'])
        banners.append(banner)
    return jsonify(banners), 200

# POST a new banner
@app.route('/api/banners', methods=['POST'])
def add_banner():
    data = request.get_json()
    result = mongo.db.banners.insert_one(data)
    new_banner = mongo.db.banners.find_one({'_id': result.inserted_id})
    new_banner['_id'] = str(new_banner['_id'])
    return jsonify(new_banner), 201

# PUT: Update a banner
@app.route('/api/banners/<banner_id>', methods=['PUT'])
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
def admin_banners():
    return render_template('banners.html')


if __name__ == '__main__':
    app.run(debug=True)
