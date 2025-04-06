document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables for Products
   *******************/
  let sk_prod_all_products = [];
  let sk_prod_products = [];
  // For edit: store existing image URLs
  let currentImageURLs = [];

  const tableBody = document.getElementById("sk-prod-table-body");
  const itemCountDisplay = document.getElementById("sk-prod-item-count");

  // Search & Filter Elements
  const searchInput = document.getElementById("sk-prod-search");
  const categoryFilter = document.getElementById("sk-prod-category-filter");
  const promotionFilter = document.getElementById("sk-prod-promotion-filter");
  const brandFilter = document.getElementById("sk-prod-brand-filter");

  // Fetch dropdowns for category (for modal) & filter (for table)
  fetchCategoriesForDropdown();
  fetchCategoriesForDropdownFilter();

  // First, fetch products then update brand filter dropdown
  fetchProducts().then(() => {
    fetchBrandsForDropdownFilter();
  });

  /*******************
   * Fetch Products from Backend
   *******************/
  function fetchProducts() {
    return fetch("/api/products")
      .then((response) => response.json())
      .then((data) => {
        sk_prod_all_products = data;
        // Initially, show all products
        sk_prod_products = data;
        applyFilters();
      })
      .catch((err) => console.error("Error fetching products:", err));
  }

  /*******************
   * Fetch Categories for Modal & Filter Dropdowns
   *******************/
  function fetchCategoriesForDropdown() {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => {
        const dropdown = document.getElementById("sk-prod-category");
        dropdown.innerHTML = '<option value="">Select Category</option>';
        data.forEach((category) => {
          const option = document.createElement("option");
          option.value = category.name;
          option.textContent = category.name;
          dropdown.appendChild(option);
        });
      })
      .catch((err) =>
        console.error("Error fetching categories for dropdown:", err)
      );
  }

  function fetchCategoriesForDropdownFilter() {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => {
        const dropdown = document.getElementById("sk-prod-category-filter");
        dropdown.innerHTML = '<option value="">All Categories</option>';
        data.forEach((category) => {
          const option = document.createElement("option");
          option.value = category.name;
          option.textContent = category.name;
          dropdown.appendChild(option);
        });
      })
      .catch((err) =>
        console.error("Error fetching categories for dropdown filter:", err)
      );
  }

  function fetchBrandsForDropdownFilter() {
    // Use all fetched products to derive unique brand names
    const dropdown = document.getElementById("sk-prod-brand-filter");
    dropdown.innerHTML = '<option value="">All Brands</option>';
    const brandSet = new Set();
    sk_prod_products.forEach((product) => {
      if (product.brandName) {
        brandSet.add(product.brandName);
      }
    });
    brandSet.forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand;
      option.textContent = brand;
      dropdown.appendChild(option);
    });
  }

  /*******************
   * Render Products Table
   *******************/
  function renderProductsTable() {
    tableBody.innerHTML = "";
    sk_prod_products.forEach((product) => {
      const tr = document.createElement("tr");

      // Checkbox for bulk selection
      const tdCheckbox = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("sk-prod-row-checkbox");
      tdCheckbox.appendChild(checkbox);

      // Title (truncate if > 3 words)
      const tdTitle = document.createElement("td");
      tdTitle.textContent = truncateText(product.title, 3);

      // Description (truncate if > 3 words)
      const tdDesc = document.createElement("td");
      tdDesc.textContent = truncateText(product.description, 3);

      // Original Price
      const tdOrigPrice = document.createElement("td");
      tdOrigPrice.textContent = product.originalPrice;

      // Discount Percent
      const tdDiscountPercent = document.createElement("td");
      tdDiscountPercent.textContent = product.discountPercent;

      // Discounted Price
      const tdDiscountedPrice = document.createElement("td");
      tdDiscountedPrice.textContent = product.discountedPrice;

      // Colors (comma-separated)
      const tdColors = document.createElement("td");
      tdColors.textContent = product.colors.join(", ");

      // Additional Info (comma-separated)
      const tdAdditionalInfo = document.createElement("td");
      tdAdditionalInfo.textContent =
        product.additionalInfo && product.additionalInfo.length
          ? product.additionalInfo.join(", ")
          : "";

      // Product Category
      const tdCategory = document.createElement("td");
      tdCategory.textContent = product.productCategory;

      // Promotion Category
      const tdPromo = document.createElement("td");
      tdPromo.textContent = product.promotionCategory;

      // Brand Name
      const tdBrand = document.createElement("td");
      tdBrand.textContent = product.brandName;

      // Images: "Show" button
      const tdImages = document.createElement("td");
      const showBtn = document.createElement("button");
      showBtn.textContent = "Show";
      showBtn.classList.add("sk-prod-show-btn");
      showBtn.addEventListener("click", () => {
        openImagePopup(product.images);
      });
      tdImages.appendChild(showBtn);

      // Actions: Edit & Delete
      const tdActions = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.classList.add("sk-prod-edit-btn");
      editBtn.addEventListener("click", () => {
        openProductModal("edit", product);
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("sk-prod-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this product?")) {
          deleteProduct(product._id);
        }
      });
      tdActions.appendChild(editBtn);
      tdActions.appendChild(deleteBtn);

      // Append cells in order matching table header
      tr.appendChild(tdCheckbox);
      tr.appendChild(tdTitle);
      tr.appendChild(tdDesc);
      tr.appendChild(tdOrigPrice);
      tr.appendChild(tdDiscountPercent);
      tr.appendChild(tdDiscountedPrice);
      tr.appendChild(tdColors);
      tr.appendChild(tdAdditionalInfo);
      tr.appendChild(tdCategory);
      tr.appendChild(tdPromo);
      tr.appendChild(tdBrand);
      tr.appendChild(tdImages);
      tr.appendChild(tdActions);

      tableBody.appendChild(tr);
    });
    itemCountDisplay.textContent = "Total Products: " + sk_prod_products.length;
  }

  function truncateText(text, wordLimit) {
    const words = text.split(" ");
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(" ") + "..."
      : text;
  }

  /*******************
   * Search & Filter Functionality
   *******************/
  function applyFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const categoryValue = categoryFilter.value;
    const promotionValue = promotionFilter.value;
    const brandValue = brandFilter.value;

    sk_prod_products = sk_prod_all_products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.title.toLowerCase().includes(searchQuery) ||
        product._id.toLowerCase().includes(searchQuery);
      const matchesCategory =
        !categoryValue || product.productCategory === categoryValue;
      const matchesPromotion =
        !promotionValue || product.promotionCategory === promotionValue;
      const matchesBrand =
        !brandValue ||
        product.brandName.toLowerCase() === brandValue.toLowerCase();
      return (
        matchesSearch && matchesCategory && matchesPromotion && matchesBrand
      );
    });
    renderProductsTable();
  }

  searchInput.addEventListener("input", applyFilters);
  categoryFilter.addEventListener("change", applyFilters);
  promotionFilter.addEventListener("change", applyFilters);
  brandFilter.addEventListener("change", applyFilters);

  /*******************
   * Modal for Adding/Editing Products
   *******************/
  const prodModal = document.getElementById("sk-prod-modal");
  const prodModalClose = document.querySelector(".sk-prod-modal-close");
  const prodForm = document.getElementById("sk-prod-form");

  const prodTitle = document.getElementById("sk-prod-title");
  const prodDescription = document.getElementById("sk-prod-description");
  const prodOrigPrice = document.getElementById("sk-prod-original-price");
  const prodDiscountPercent = document.getElementById(
    "sk-prod-discount-percent"
  );
  const prodDiscountedPrice = document.getElementById(
    "sk-prod-discounted-price"
  );
  const prodColorsInput = document.getElementById("sk-prod-colors-input");
  const prodColorsTags = document.getElementById("sk-prod-colors-tags");
  const prodAdditionalInfoInput = document.getElementById(
    "sk-prod-additional-info-input"
  );
  const prodAdditionalInfoTags = document.getElementById(
    "sk-prod-additional-info-tags"
  );
  const prodCategory = document.getElementById("sk-prod-category");
  const prodPromotion = document.getElementById("sk-prod-promotion");
  const prodBrand = document.getElementById("sk-prod-brand");
  const prodImagesInput = document.getElementById("sk-prod-images");
  const prodImagesPreview = document.getElementById("sk-prod-images-preview");

  let currentEditId = null;

  document.getElementById("sk-prod-new-btn").addEventListener("click", () => {
    openProductModal("new");
  });

  prodModalClose.addEventListener("click", closeProductModal);

  function updateDiscountedPrice() {
    const orig = parseFloat(prodOrigPrice.value);
    let discount = parseFloat(prodDiscountPercent.value);
    // If discount is not provided, default to 0
    if (isNaN(discount)) discount = 0;
    if (!isNaN(orig)) {
      const discounted = orig * (1 - discount / 100);
      // If a discount is applied, round off the discounted price, otherwise use original price
      prodDiscountedPrice.value = discount > 0 ? Math.round(discounted) : orig;
    } else {
      prodDiscountedPrice.value = "";
    }
  }
  
  prodOrigPrice.addEventListener("input", updateDiscountedPrice);
  prodDiscountPercent.addEventListener("input", updateDiscountedPrice);

  // Colors Tag Input
  prodColorsInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const color = prodColorsInput.value.trim();
      if (color !== "") {
        addColorTag(color);
        prodColorsInput.value = "";
      }
    }
  });

  function addColorTag(color) {
    const tag = document.createElement("span");
    tag.classList.add("sk-prod-colors-tag");
    tag.textContent = color;
    const removeIcon = document.createElement("i");
    removeIcon.classList.add("fas", "fa-times");
    removeIcon.addEventListener("click", () => {
      prodColorsTags.removeChild(tag);
    });
    tag.appendChild(removeIcon);
    prodColorsTags.appendChild(tag);
  }

  // Additional Info Tag Input
  prodAdditionalInfoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const info = prodAdditionalInfoInput.value.trim();
      if (info !== "") {
        addAdditionalInfoTag(info);
        prodAdditionalInfoInput.value = "";
      }
    }
  });

  function addAdditionalInfoTag(info) {
    const tag = document.createElement("span");
    tag.classList.add("sk-prod-additional-info-tag");
    tag.textContent = info;
    const removeIcon = document.createElement("i");
    removeIcon.classList.add("fas", "fa-times");
    removeIcon.addEventListener("click", () => {
      prodAdditionalInfoTags.removeChild(tag);
    });
    tag.appendChild(removeIcon);
    prodAdditionalInfoTags.appendChild(tag);
  }

  // Image Upload Preview (temporary preview using Blob URLs)
  prodImagesInput.addEventListener("change", () => {
    prodImagesPreview.innerHTML = "";
    const files = Array.from(prodImagesInput.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.src = e.target.result;
        prodImagesPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // Function to upload images and return permanent URLs
  function uploadImages(files) {
    const uploadPromises = files.map((file) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => data.url)
        .catch((err) => {
          console.error("Error uploading file:", err);
          return null;
        });
    });
    return Promise.all(uploadPromises).then((urls) =>
      urls.filter((url) => url)
    );
  }

  prodForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (
      !prodTitle.value ||
      !prodDescription.value ||
      !prodOrigPrice.value ||
      !prodCategory.value ||
      !prodPromotion.value ||
      !prodBrand.value
    ) {
      alert("Please fill in all mandatory fields.");
      return;
    }
    const colorTags = Array.from(prodColorsTags.children).map((tag) =>
      tag.textContent.replace("×", "").trim()
    );
    const additionalInfoTags = Array.from(prodAdditionalInfoTags.children).map(
      (tag) => tag.textContent.replace("×", "").trim()
    );
    const files = Array.from(prodImagesInput.files);

    // For edit mode, if no new files are selected, preserve currentImageURLs
    const uploadPromise = files.length
      ? uploadImages(files)
      : Promise.resolve(currentImageURLs);

    uploadPromise.then((imageUrls) => {
      // If editing and no new images were uploaded, use previously stored URLs.
      if (currentEditId && !files.length && currentImageURLs.length) {
        imageUrls = currentImageURLs;
      }
      const product = {
        title: prodTitle.value,
        description: prodDescription.value,
        originalPrice: parseFloat(prodOrigPrice.value),
        discountPercent: isNaN(parseFloat(prodDiscountPercent.value)) ? 0 : parseFloat(prodDiscountPercent.value),
        discountedPrice: parseFloat(prodDiscountedPrice.value),
        colors: colorTags,
        additionalInfo: additionalInfoTags,
        productCategory: prodCategory.value,
        promotionCategory: prodPromotion.value,
        brandName: prodBrand.value,
        images: imageUrls,
      };
      if (currentEditId) {
        fetch(`/api/products/${currentEditId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        })
          .then((response) => response.json())
          .then((updatedProduct) => {
            sk_prod_all_products = sk_prod_all_products.map((p) =>
              p._id === currentEditId ? updatedProduct : p
            );
            fetchProducts(); // Refresh products from backend
            closeProductModal();
          });
      } else {
        fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        })
          .then((response) => response.json())
          .then((newProduct) => {
            sk_prod_all_products.push(newProduct);
            fetchProducts(); // Refresh products from backend
            closeProductModal();
          });
      }
    });
  });

  function openProductModal(mode, product = null) {
    prodModal.style.display = "flex";
    if (mode === "new") {
      prodForm.reset();
      prodColorsTags.innerHTML = "";
      prodAdditionalInfoTags.innerHTML = "";
      prodImagesPreview.innerHTML = "";
      currentEditId = null;
      prodDiscountedPrice.value = "";
      currentImageURLs = [];
    } else if (mode === "edit" && product) {
      currentEditId = product._id;
      prodTitle.value = product.title;
      prodDescription.value = product.description;
      prodOrigPrice.value = product.originalPrice;
      prodDiscountPercent.value = product.discountPercent;
      updateDiscountedPrice();
      prodColorsTags.innerHTML = "";
      product.colors.forEach((color) => addColorTag(color));
      prodAdditionalInfoTags.innerHTML = "";
      if (product.additionalInfo && product.additionalInfo.length) {
        product.additionalInfo.forEach((info) => addAdditionalInfoTag(info));
      }
      prodCategory.value = product.productCategory;
      prodPromotion.value = product.promotionCategory;
      prodBrand.value = product.brandName;
      prodImagesPreview.innerHTML = "";
      // Preserve existing images if any
      currentImageURLs = product.images || [];
      currentImageURLs.forEach((imgUrl) => {
        const img = document.createElement("img");
        img.src = imgUrl;
        prodImagesPreview.appendChild(img);
      });
    }
  }

  function closeProductModal() {
    prodModal.style.display = "none";
  }

  /*******************
   * Bulk Selection & Deletion
   *******************/
  document
    .getElementById("sk-prod-select-all")
    .addEventListener("change", (e) => {
      const checked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll(".sk-prod-row-checkbox");
      rowCheckboxes.forEach((cb) => {
        cb.checked = checked;
      });
    });

  document
    .getElementById("sk-prod-bulk-delete")
    .addEventListener("click", () => {
      if (confirm("Are you sure you want to delete selected products?")) {
        const rowCheckboxes = document.querySelectorAll(
          ".sk-prod-row-checkbox"
        );
        rowCheckboxes.forEach((cb, index) => {
          if (cb.checked) {
            const productId = sk_prod_products[index]._id;
            deleteProduct(productId);
          }
        });
      }
    });

  function deleteProduct(productId) {
    fetch(`/api/products/${productId}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((result) => {
        sk_prod_all_products = sk_prod_all_products.filter(
          (p) => p._id !== productId
        );
        fetchProducts();
      });
  }

  /*******************
   * Image Popup Functionality
   *******************/
  const imgPopup = document.getElementById("sk-prod-img-popup");
  const imgPopupClose = document.querySelector(".sk-prod-img-popup-close");
  const imgPopupGallery = document.getElementById("sk-prod-img-popup-gallery");
  function openImagePopup(images) {
    imgPopupGallery.innerHTML = "";
    images.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      imgPopupGallery.appendChild(img);
    });
    imgPopup.style.display = "flex";
  }
  imgPopupClose.addEventListener("click", () => {
    imgPopup.style.display = "none";
  });

  /*******************
   * Search & Filter Functionality
   *******************/
  function applyFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const categoryValue = categoryFilter.value;
    const promotionValue = promotionFilter.value;
    const brandValue = brandFilter.value;

    sk_prod_products = sk_prod_all_products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.title.toLowerCase().includes(searchQuery) ||
        product._id.toLowerCase().includes(searchQuery);
      const matchesCategory =
        !categoryValue || product.productCategory === categoryValue;
      const matchesPromotion =
        !promotionValue || product.promotionCategory === promotionValue;
      const matchesBrand =
        !brandValue ||
        product.brandName.toLowerCase() === brandValue.toLowerCase();
      return (
        matchesSearch && matchesCategory && matchesPromotion && matchesBrand
      );
    });
    renderProductsTable();
  }

  searchInput.addEventListener("input", applyFilters);
  categoryFilter.addEventListener("change", applyFilters);
  promotionFilter.addEventListener("change", applyFilters);
  brandFilter.addEventListener("change", applyFilters);

  /*******************
   * Initial Fetch of Products
   *******************/
  fetchProducts();
});
