document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables for Categories
   *******************/
  let sk_cat_all_categories = [];
  let sk_cat_categories = [];
  let currentCatImageURLs = [];

  const tableBody = document.getElementById("sk-cat-table-body");
  const totalCountDisplay = document.getElementById("sk-cat-total-count");
  const searchInput = document.getElementById("sk-cat-search");
  const countFilter = document.getElementById("sk-cat-count-filter");

  const newCategoryBtn = document.getElementById("sk-cat-new-btn");
  if (!newCategoryBtn) {
    console.error("New Category button not found!");
    return;
  }

  newCategoryBtn.addEventListener("click", () => {
    console.log("New Category button clicked");
    openCategoryModal("new");
  });

  // Modal Elements
  const catModal = document.getElementById("sk-cat-modal");
  const catModalClose = document.querySelector(".sk-cat-modal-close");
  const catForm = document.getElementById("sk-cat-form");
  const catTitle = document.getElementById("sk-cat-title");
  const catImagesInput = document.getElementById("sk-cat-images");
  const catImagesPreview = document.getElementById("sk-cat-images-preview");

  let currentCatEditId = null;

  /*******************
   * Async Functions to Fetch Data
   *******************/
  async function fetchCategories() {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      sk_cat_all_categories = data;
      await updateCategoryProductCounts();
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }

  async function updateCategoryProductCounts() {
    try {
      const response = await fetch("/api/products");
      const productData = await response.json();
      // For each category, count matching products based on productCategory field
      sk_cat_all_categories.forEach((category) => {
        const count = productData.filter(
          (product) => product.productCategory === category.name
        ).length;
        category.numProducts = count;
      });
      applyFilters();
    } catch (err) {
      console.error("Error updating category product counts:", err);
    }
  }

  /*******************
   * Rendering & Filtering Functions
   *******************/
  function renderCategoriesTable() {
    tableBody.innerHTML = "";
    sk_cat_categories.forEach((category) => {
      const tr = document.createElement("tr");

      // Checkbox for bulk selection
      const tdCheckbox = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("sk-cat-row-checkbox");
      tdCheckbox.appendChild(checkbox);

      // Category Title (truncate)
      const tdTitle = document.createElement("td");
      tdTitle.textContent = truncateText(category.name, 3);

      // Images: "Show" button
      const tdImages = document.createElement("td");
      const showBtn = document.createElement("button");
      showBtn.textContent = "Show";
      showBtn.classList.add("sk-cat-show-btn");
      showBtn.addEventListener("click", () => {
        openCategoryImagePopup(category.images);
      });
      tdImages.appendChild(showBtn);

      // No. of Products
      const tdNumProducts = document.createElement("td");
      tdNumProducts.textContent = category.numProducts || 0;

      // Actions: Edit & Delete
      const tdActions = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.classList.add("sk-cat-edit-btn");
      editBtn.addEventListener("click", () => {
        openCategoryModal("edit", category);
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("sk-cat-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this category?")) {
          deleteCategory(category._id);
        }
      });
      tdActions.appendChild(editBtn);
      tdActions.appendChild(deleteBtn);

      tr.appendChild(tdCheckbox);
      tr.appendChild(tdTitle);
      tr.appendChild(tdImages);
      tr.appendChild(tdNumProducts);
      tr.appendChild(tdActions);
      tableBody.appendChild(tr);
    });
    totalCountDisplay.textContent =
      "Total Categories: " + sk_cat_categories.length;
  }

  function truncateText(text, wordLimit) {
    const words = text.split(" ");
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(" ") + "..."
      : text;
  }

  function applyFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const countRange = countFilter.value; // e.g., "0-5" or "21" for 21+
    sk_cat_categories = sk_cat_all_categories.filter((category) => {
      const matchesSearch =
        !searchQuery ||
        category.name.toLowerCase().includes(searchQuery) ||
        category._id.toLowerCase().includes(searchQuery);
      let matchesCount = true;
      if (countRange) {
        if (countRange.includes("-")) {
          const [min, max] = countRange.split("-").map(Number);
          matchesCount =
            category.numProducts >= min && category.numProducts <= max;
        } else {
          matchesCount = category.numProducts >= Number(countRange);
        }
      }
      return matchesSearch && matchesCount;
    });
    renderCategoriesTable();
  }

  searchInput.addEventListener("input", applyFilters);
  countFilter.addEventListener("change", applyFilters);

  /*******************
   * Modal for Adding/Editing Categories
   *******************/
  function openCategoryModal(mode, category = null) {
    catModal.style.display = "flex";
    if (mode === "new") {
      catForm.reset();
      catImagesPreview.innerHTML = "";
      currentCatEditId = null;
      currentCatImageURLs = [];
    } else if (mode === "edit" && category) {
      currentCatEditId = category._id;
      catTitle.value = category.name;
      catImagesPreview.innerHTML = "";
      // Store existing image URLs so that they persist if no new image is uploaded
      currentCatImageURLs = category.images || [];
      currentCatImageURLs.forEach((imgUrl) => {
        const img = document.createElement("img");
        img.src = imgUrl;
        catImagesPreview.appendChild(img);
      });
    }
  }

  function closeCategoryModal() {
    catModal.style.display = "none";
  }

  catModalClose.addEventListener("click", closeCategoryModal);

  /*******************
   * Upload Images and Submit Category
   *******************/
  async function uploadImages(files) {
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
    const urls = await Promise.all(uploadPromises);
    return urls.filter((url) => url);
  }

  catForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!catTitle.value) {
      alert("Please enter category title.");
      return;
    }
    const files = Array.from(catImagesInput.files);
    // If new files are uploaded, use them; otherwise, if editing, use the stored images.
    let imageUrls;
    if (files.length > 0) {
      imageUrls = await uploadImages(files);
    } else {
      imageUrls = currentCatEditId ? currentCatImageURLs : [];
    }
    const categoryData = {
      name: catTitle.value,
      images: imageUrls,
    };
    try {
      if (currentCatEditId) {
        // Update category
        const response = await fetch(`/api/categories/${currentCatEditId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryData),
        });
        const updatedCat = await response.json();
        sk_cat_all_categories = sk_cat_all_categories.map((cat) =>
          cat._id === currentCatEditId ? updatedCat : cat
        );
      } else {
        // Add new category
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryData),
        });
        const newCat = await response.json();
        sk_cat_all_categories.push(newCat);
      }
      await updateCategoryProductCounts();
      closeCategoryModal();
    } catch (err) {
      console.error("Error submitting category:", err);
    }
  });

  /*******************
   * Bulk Selection & Deletion for Categories
   *******************/
  document
    .getElementById("sk-cat-select-all")
    .addEventListener("change", (e) => {
      const checked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll(".sk-cat-row-checkbox");
      rowCheckboxes.forEach((cb) => {
        cb.checked = checked;
      });
    });

  document
    .getElementById("sk-cat-bulk-delete")
    .addEventListener("click", () => {
      if (confirm("Are you sure you want to delete selected categories?")) {
        const rowCheckboxes = document.querySelectorAll(".sk-cat-row-checkbox");
        rowCheckboxes.forEach((cb, index) => {
          if (cb.checked) {
            const categoryId = sk_cat_categories[index]._id;
            deleteCategory(categoryId);
          }
        });
      }
    });

  async function deleteCategory(categoryId) {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      sk_cat_all_categories = sk_cat_all_categories.filter(
        (cat) => cat._id !== categoryId
      );
      applyFilters();
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  }

  /*******************
   * Image Popup for Category Images
   *******************/
  const catImgPopup = document.getElementById("sk-cat-img-popup");
  const catImgPopupClose = document.querySelector(".sk-cat-img-popup-close");
  const catImgPopupGallery = document.getElementById(
    "sk-cat-img-popup-gallery"
  );
  function openCategoryImagePopup(images) {
    catImgPopupGallery.innerHTML = "";
    images.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      catImgPopupGallery.appendChild(img);
    });
    catImgPopup.style.display = "flex";
  }
  catImgPopupClose.addEventListener("click", () => {
    catImgPopup.style.display = "none";
  });

  /*******************
   * Initial Fetch of Categories
   *******************/
  fetchCategories();
});