document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables for Banners
   *******************/
  let sk_ban_all = [];
  let sk_ban_filtered = [];

  const tableBody = document.getElementById("sk-ban-table-body");
  const searchInput = document.getElementById("sk-ban-search");
  const typeFilter = document.getElementById("sk-ban-type-filter");

  // Modal Elements for Banner Popup
  const banModal = document.getElementById("sk-ban-modal");
  const banModalClose = document.querySelector(".sk-ban-modal-close");
  const banForm = document.getElementById("sk-ban-form");
  const banName = document.getElementById("sk-ban-name");
  const banPromotion = document.getElementById("sk-ban-promotion");
  const banProduct = document.getElementById("sk-ban-product");
  const banImageInput = document.getElementById("sk-ban-image");
  const banImagePreview = document.getElementById("sk-ban-image-preview");

  let currentBanEditId = null;

  // Fetch product categories for the product category dropdown (from /api/categories)
  function fetchCategoriesForBannerDropdown() {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => {
        banProduct.innerHTML =
          '<option value="">Select Product Category</option>';
        data.forEach((category) => {
          const option = document.createElement("option");
          option.value = category.name;
          option.textContent = category.name;
          banProduct.appendChild(option);
        });
      })
      .catch((err) =>
        console.error("Error fetching categories for banner dropdown:", err)
      );
  }

  // Fetch Banners from Backend
  async function fetchBanners() {
    try {
      const response = await fetch("/api/banners");
      const data = await response.json();
      sk_ban_all = data;
      sk_ban_filtered = data;
      renderBannersTable();
    } catch (err) {
      console.error("Error fetching banners:", err);
    }
  }

  function renderBannersTable() {
    tableBody.innerHTML = "";
    sk_ban_filtered.forEach((banner) => {
      const tr = document.createElement("tr");

      // Bulk Selection Checkbox Column
      const tdCheckbox = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("sk-ban-row-checkbox");
      tdCheckbox.appendChild(checkbox);

      // Banner ID
      const tdId = document.createElement("td");
      tdId.textContent = banner._id;

      // Banner Name
      const tdName = document.createElement("td");
      tdName.textContent = banner.bannerName;

      // Category Column: Dynamically show either promotion or product category
      const tdCategory = document.createElement("td");
      tdCategory.textContent =
        banner.promotionCategory || banner.productCategory || "";

      // Image Column: "Show" button
      const tdImage = document.createElement("td");
      const showBtn = document.createElement("button");
      showBtn.textContent = "Show";
      showBtn.type = "button"; // Ensure it's not triggering a form submission
      showBtn.classList.add("sk-ban-show-btn");
      showBtn.addEventListener("click", () => {
        openBannerImagePopup(banner.image);
      });
      tdImage.appendChild(showBtn);

      // Action Column: Edit & Delete buttons
      const tdActions = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.type = "button";
      editBtn.classList.add("sk-ban-edit-btn");
      // Fix: Call openBannerModal() instead of open() to prevent navigation
      editBtn.addEventListener("click", () => {
        openBannerModal("edit", banner);
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.type = "button";
      deleteBtn.classList.add("sk-ban-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this banner?")) {
          deleteBanner(banner._id);
        }
      });
      tdActions.appendChild(editBtn);
      tdActions.appendChild(deleteBtn);

      // Append all columns to the row
      tr.appendChild(tdCheckbox);
      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdCategory);
      tr.appendChild(tdImage);
      tr.appendChild(tdActions);

      tableBody.appendChild(tr);
    });
  }

  // Search & Filter for Banners
  function applyBannerFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const typeValue = typeFilter.value; // "promotion" or "product"
    sk_ban_filtered = sk_ban_all.filter((banner) => {
      const matchesSearch =
        !searchQuery ||
        banner._id.toLowerCase().includes(searchQuery) ||
        banner.bannerName.toLowerCase().includes(searchQuery);
      let matchesType = true;
      if (typeValue === "promotion") {
        matchesType = !!banner.promotionCategory;
      } else if (typeValue === "product") {
        matchesType = !!banner.productCategory;
      }
      return matchesSearch && matchesType;
    });
    renderBannersTable();
  }

  searchInput.addEventListener("input", applyBannerFilters);
  typeFilter.addEventListener("change", applyBannerFilters);

  /*******************
   * Modal for Adding/Editing Banner
   *******************/
  function openBannerModal(mode, banner = null) {
    banModal.style.display = "flex";
    // Clear previous preview and form
    banForm.reset();
    banImagePreview.innerHTML = "";
    currentBanEditId = null;

    // Also clear dropdowns (if necessary)
    // Ensure that if one category is chosen, the other is cleared automatically.
    banPromotion.value = "";
    banProduct.value = "";

    if (mode === "edit" && banner) {
      currentBanEditId = banner._id;
      document.getElementById("sk-ban-name").value = banner.bannerName;
      // Set dropdowns: only one should be set.
      if (banner.promotionCategory) {
        banPromotion.value = banner.promotionCategory;
      } else if (banner.productCategory) {
        banProduct.value = banner.productCategory;
      }
      // Show existing image preview
      if (banner.image) {
        const img = document.createElement("img");
        img.src = banner.image;
        banImagePreview.appendChild(img);
      }
    }
  }

  document.getElementById("sk-ban-new-btn").addEventListener("click", () => {
    openBannerModal("new");
  });

  function closeBannerModal() {
    banModal.style.display = "none";
  }

  catModalClose = document.querySelector(".sk-ban-modal-close");
  catModalClose.addEventListener("click", closeBannerModal);

  // Handle Banner Form Submission
  banForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bannerName = document.getElementById("sk-ban-name").value.trim();
    if (!bannerName) {
      alert("Please enter banner name.");
      return;
    }
    // Validate: only one of promotion or product category should be selected
    const promotionVal = banPromotion.value;
    const productVal = banProduct.value;
    if (promotionVal && productVal) {
      alert(
        "Please select only one category type: either Promotion OR Product."
      );
      return;
    }
    if (!promotionVal && !productVal) {
      alert("Please select one category type: either Promotion OR Product.");
      return;
    }
    const files = Array.from(banImageInput.files);
    let imageUrl = "";
    if (files.length > 0) {
      try {
        const urls = await uploadBannerImage(files[0]); // Only one banner image allowed
        if (urls.length > 0) {
          imageUrl = urls[0];
        }
      } catch (err) {
        console.error("Error uploading banner image:", err);
        alert("Image upload failed.");
        return;
      }
    }
    const bannerData = {
      bannerName: bannerName,
      promotionCategory: promotionVal || null,
      productCategory: productVal || null,
      image: imageUrl,
    };
    try {
      if (currentBanEditId) {
        const response = await fetch(`/api/banners/${currentBanEditId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bannerData),
        });
        const updatedBanner = await response.json();
        sk_ban_all = sk_ban_all.map((ban) =>
          ban._id === currentBanEditId ? updatedBanner : ban
        );
      } else {
        const response = await fetch("/api/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bannerData),
        });
        const newBanner = await response.json();
        sk_ban_all.push(newBanner);
      }
      applyBannerFilters();
      closeBannerModal();
    } catch (err) {
      console.error("Error submitting banner:", err);
    }
  });

  // Function to upload banner image (returns a permanent URL)
  async function uploadBannerImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    return data.url ? [data.url] : [];
  }

  /*******************
   * Bulk Selection & Deletion for Banners
   *******************/
  document
    .getElementById("sk-ban-select-all")
    .addEventListener("change", (e) => {
      const checked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll(".sk-ban-row-checkbox");
      rowCheckboxes.forEach((cb) => (cb.checked = checked));
    });

  document.getElementById("sk-ban-bulk-delete") &&
    document
      .getElementById("sk-ban-bulk-delete")
      .addEventListener("click", () => {
        if (confirm("Are you sure you want to delete selected banners?")) {
          const rowCheckboxes = document.querySelectorAll(
            ".sk-ban-row-checkbox"
          );
          rowCheckboxes.forEach((cb, index) => {
            if (cb.checked) {
              const bannerId = sk_ban_filtered[index]._id;
              deleteBanner(bannerId);
            }
          });
        }
      });

  async function deleteBanner(bannerId) {
    try {
      const response = await fetch(`/api/banners/${bannerId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      sk_ban_all = sk_ban_all.filter((ban) => ban._id !== bannerId);
      applyBannerFilters();
    } catch (err) {
      console.error("Error deleting banner:", err);
    }
  }

  /*******************
   * Image Popup for Banner Image
   *******************/
  const banImgPopup = document.getElementById("sk-ban-img-popup");
  const banImgPopupClose = document.querySelector(".sk-ban-img-popup-close");
  const banImgPopupGallery = document.getElementById(
    "sk-ban-img-popup-gallery"
  );
  function openBannerImagePopup(imageUrl) {
    banImgPopupGallery.innerHTML = "";
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      banImgPopupGallery.appendChild(img);
    }
    banImgPopup.style.display = "flex";
  }
  banImgPopupClose.addEventListener("click", () => {
    banImgPopup.style.display = "none";
  });

  /*******************
   * Initial Fetch of Banners & Setup
   *******************/
  fetchCategoriesForBannerDropdown();
  fetchBanners();
});
