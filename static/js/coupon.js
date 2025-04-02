document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables for Coupons
   *******************/
  let sk_cpn_all_coupons = [];
  let sk_cpn_coupons = [];
  const tableBody = document.getElementById("sk-cpn-table-body");
  const totalCountDisplay = document.getElementById("sk-cpn-total-count");

  // Search, Filter & Sort Elements
  const searchInput = document.getElementById("sk-cpn-search");
  const discountFilter = document.getElementById("sk-cpn-discount-filter");
  const sortSelect = document.getElementById("sk-cpn-sort");

  // Modal Elements
  const cpnModal = document.getElementById("sk-cpn-modal");
  const cpnModalClose = document.querySelector(".sk-cpn-modal-close");
  const cpnForm = document.getElementById("sk-cpn-form");
  const cpnCode = document.getElementById("sk-cpn-code");
  const cpnDiscount = document.getElementById("sk-cpn-discount");

  let currentCpnEditId = null;

  // Event listener for "+ New Coupon" button
  document.getElementById("sk-cpn-new-btn").addEventListener("click", () => {
    openCouponModal("new");
  });

  cpnModalClose.addEventListener("click", closeCouponModal);

  /*******************
   * Fetch Coupons from Backend
   *******************/
  function fetchCoupons() {
    fetch("/api/coupons")
      .then((response) => response.json())
      .then((data) => {
        sk_cpn_all_coupons = data;
        sk_cpn_coupons = data;
        applyCouponFilters();
      })
      .catch((err) => console.error("Error fetching coupons:", err));
  }

  /*******************
   * Render Coupons Table
   *******************/
  function renderCouponsTable() {
    tableBody.innerHTML = "";
    sk_cpn_coupons.forEach((coupon) => {
      const tr = document.createElement("tr");

      // Checkbox for bulk selection
      const tdCheckbox = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("sk-cpn-row-checkbox");
      tdCheckbox.appendChild(checkbox);

      // Coupon Code (truncate if needed)
      const tdCode = document.createElement("td");
      tdCode.textContent = coupon.couponCode;

      // Discount Percent
      const tdDiscount = document.createElement("td");
      tdDiscount.textContent = coupon.discountPercent;

      // Actions: Edit & Delete (Answer not needed here)
      const tdActions = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.classList.add("sk-cpn-edit-btn");
      editBtn.addEventListener("click", () => {
        openCouponModal("edit", coupon);
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("sk-cpn-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this coupon?")) {
          deleteCoupon(coupon._id);
        }
      });
      tdActions.appendChild(editBtn);
      tdActions.appendChild(deleteBtn);

      tr.appendChild(tdCheckbox);
      tr.appendChild(tdCode);
      tr.appendChild(tdDiscount);
      tr.appendChild(tdActions);
      tableBody.appendChild(tr);
    });
    totalCountDisplay.textContent = "Total Coupons: " + sk_cpn_coupons.length;
  }

  /*******************
   * Search, Filter & Sort Functionality for Coupons
   *******************/
  function applyCouponFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const discountRange = discountFilter.value; // e.g., "10-30", "31-50", "51-80"
    sk_cpn_coupons = sk_cpn_all_coupons.filter((coupon) => {
      const matchesSearch =
        !searchQuery ||
        coupon.couponCode.toLowerCase().includes(searchQuery) ||
        coupon._id.toLowerCase().includes(searchQuery);
      let matchesDiscount = true;
      if (discountRange) {
        const [min, max] = discountRange.split("-").map(Number);
        matchesDiscount =
          coupon.discountPercent >= min && coupon.discountPercent <= max;
      }
      return matchesSearch && matchesDiscount;
    });

    // Sorting
    const sortValue = sortSelect.value;
    if (sortValue === "code-asc") {
      sk_cpn_coupons.sort((a, b) => a.couponCode.localeCompare(b.couponCode));
    } else if (sortValue === "code-desc") {
      sk_cpn_coupons.sort((a, b) => b.couponCode.localeCompare(a.couponCode));
    } else if (sortValue === "discount-asc") {
      sk_cpn_coupons.sort((a, b) => a.discountPercent - b.discountPercent);
    } else if (sortValue === "discount-desc") {
      sk_cpn_coupons.sort((a, b) => b.discountPercent - a.discountPercent);
    }
    renderCouponsTable();
  }

  searchInput.addEventListener("input", applyCouponFilters);
  discountFilter.addEventListener("change", applyCouponFilters);
  sortSelect.addEventListener("change", applyCouponFilters);

  /*******************
   * Modal for Adding/Editing Coupons
   *******************/
  function openCouponModal(mode, coupon = null) {
    cpnModal.style.display = "flex";
    if (mode === "new") {
      cpnForm.reset();
      currentCpnEditId = null;
    } else if (mode === "edit" && coupon) {
      currentCpnEditId = coupon._id;
      cpnCode.value = coupon.couponCode;
      cpnDiscount.value = coupon.discountPercent;
    }
  }

  function closeCouponModal() {
    cpnModal.style.display = "none";
    currentCpnEditId = null;
  }

  cpnModalClose.addEventListener("click", closeCouponModal);

  cpnForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = cpnCode.value.trim();
    const discount = parseFloat(cpnDiscount.value);
    if (!code) {
      alert("Please enter a coupon code.");
      return;
    }
    if (isNaN(discount) || discount < 10 || discount > 80) {
      alert("Discount percent must be between 10 and 80.");
      return;
    }
    const couponData = {
      couponCode: code,
      discountPercent: discount,
    };
    if (currentCpnEditId) {
      // Update coupon via PUT request
      fetch(`/api/coupons/${currentCpnEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(couponData),
      })
        .then((response) => response.json())
        .then((updatedCoupon) => {
          sk_cpn_all_coupons = sk_cpn_all_coupons.map((cpn) =>
            cpn._id === currentCpnEditId ? updatedCoupon : cpn
          );
          applyCouponFilters();
          closeCouponModal();
        })
        .catch((err) => console.error("Error updating coupon:", err));
    } else {
      // Add new coupon via POST request
      fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(couponData),
      })
        .then((response) => response.json())
        .then((newCoupon) => {
          sk_cpn_all_coupons.push(newCoupon);
          applyCouponFilters();
          closeCouponModal();
        })
        .catch((err) => console.error("Error adding coupon:", err));
    }
  });

  /*******************
   * Bulk Selection & Deletion for Coupons
   *******************/
  document
    .getElementById("sk-cpn-select-all")
    .addEventListener("change", (e) => {
      const checked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll(".sk-cpn-row-checkbox");
      rowCheckboxes.forEach((cb) => {
        cb.checked = checked;
      });
    });

  document
    .getElementById("sk-cpn-bulk-delete")
    .addEventListener("click", () => {
      if (confirm("Are you sure you want to delete selected coupons?")) {
        const rowCheckboxes = document.querySelectorAll(".sk-cpn-row-checkbox");
        rowCheckboxes.forEach((cb, index) => {
          if (cb.checked) {
            const couponId = sk_cpn_coupons[index]._id;
            deleteCoupon(couponId);
          }
        });
      }
    });

  function deleteCoupon(couponId) {
    fetch(`/api/coupons/${couponId}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((result) => {
        sk_cpn_all_coupons = sk_cpn_all_coupons.filter(
          (cpn) => cpn._id !== couponId
        );
        applyCouponFilters();
      })
      .catch((err) => console.error("Error deleting coupon:", err));
  }

  /*******************
   * Initial Fetch of Coupons
   *******************/
  function fetchCoupons() {
    fetch("/api/coupons")
      .then((response) => response.json())
      .then((data) => {
        sk_cpn_all_coupons = data;
        sk_cpn_coupons = data;
        applyCouponFilters();
      })
      .catch((err) => console.error("Error fetching coupons:", err));
  }

  fetchCoupons();
});
