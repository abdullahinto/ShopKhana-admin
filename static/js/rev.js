document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables for Reviews
   *******************/
  let sk_rv_all_reviews = [];
  let sk_rv_filtered = [];

  const tableBody = document.getElementById("sk-rv-table-body");
  const searchInput = document.getElementById("sk-rv-search");
  const ratingFilter = document.getElementById("sk-rv-rating-filter");
  const totalCountDisplay = document.getElementById("sk-rv-total-count");

  // Modal elements for editing review
  const rvModal = document.getElementById("sk-rv-modal");
  const rvModalClose = document.querySelector(".sk-rv-modal-close");
  const rvForm = document.getElementById("sk-rv-form");
  const rvProductLink = document.getElementById("sk-rv-product-link");
  // Removed rvQuestionField as it's not needed
  const rvReviewField = document.getElementById("sk-rv-review");
  const rvRatingField = document.getElementById("sk-rv-rating");
  let currentReviewId = null;

  // Modal for image gallery
  const rvImgModal = document.getElementById("sk-rv-img-modal");
  const rvImgModalClose = document.querySelector(".sk-rv-img-modal-close");
  const rvImgGallery = document.getElementById("sk-rv-img-gallery");

  /*******************
   * Fetch Reviews from Backend
   *******************/
  async function fetchReviews() {
    try {
      const response = await fetch("/api/reviews");
      const data = await response.json();
      sk_rv_all_reviews = data;
      sk_rv_filtered = data;
      renderReviewsTable();
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  }

  /*******************
   * Render Reviews Table
   *******************/
  function renderReviewsTable() {
    tableBody.innerHTML = "";
    sk_rv_filtered.forEach((review) => {
      const tr = document.createElement("tr");

      // Bulk selection checkbox
      const tdCheckbox = document.createElement("td");
      const rowCheckbox = document.createElement("input");
      rowCheckbox.type = "checkbox";
      rowCheckbox.classList.add("sk-rv-row-checkbox");
      tdCheckbox.appendChild(rowCheckbox);

      // ProductLink column (clickable)
      const tdLink = document.createElement("td");
      const aLink = document.createElement("a");
      aLink.href = review.ProductLink;
      aLink.textContent = review.ProductLink;
      aLink.target = "_blank";
      tdLink.appendChild(aLink);

      // User Email column
      const tdEmail = document.createElement("td");
      tdEmail.textContent = review.user_email;

      // Review column
      const tdReview = document.createElement("td");
      tdReview.textContent = review.review;

      // Rating column
      const tdRating = document.createElement("td");
      tdRating.textContent = review.rating;

      // Images column: Show button if images exist, else "No Image"
      const tdImages = document.createElement("td");
      if (review.img && review.img.length > 0) {
        const showBtn = document.createElement("button");
        showBtn.textContent = "Show";
        showBtn.classList.add("sk-rv-show-btn");
        showBtn.addEventListener("click", () => {
          openImageGallery(review.img);
        });
        tdImages.appendChild(showBtn);
      } else {
        tdImages.textContent = "No Image";
      }

      // Actions column: Edit & Delete
      const tdActions = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.classList.add("sk-rv-edit-btn");
      editBtn.addEventListener("click", () => {
        openReviewModal(review);
      });
      tdActions.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("sk-rv-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this review?")) {
          deleteReview(review._id);
        }
      });
      tdActions.appendChild(deleteBtn);

      // Append cells in proper order: Checkbox, Product Link, Email, Review, Rating, Images, Actions
      tr.appendChild(tdCheckbox);
      tr.appendChild(tdLink);
      tr.appendChild(tdEmail);
      tr.appendChild(tdReview);
      tr.appendChild(tdRating);
      tr.appendChild(tdImages);
      tr.appendChild(tdActions);

      tableBody.appendChild(tr);
    });
    totalCountDisplay.textContent = "Total Reviews: " + sk_rv_filtered.length;
  }

  /*******************
   * Search & Filter Functionality for Reviews
   *******************/
  function applyReviewFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const ratingValue = ratingFilter.value; // e.g., "4" for 4 stars
    sk_rv_filtered = sk_rv_all_reviews.filter((review) => {
      const matchesSearch =
        !searchQuery ||
        review.ProductLink.toLowerCase().includes(searchQuery) ||
        review.user_email.toLowerCase().includes(searchQuery);
      const matchesRating = !ratingValue || review.rating == ratingValue;
      return matchesSearch && matchesRating;
    });
    renderReviewsTable();
  }

  searchInput.addEventListener("input", applyReviewFilters);
  ratingFilter.addEventListener("change", applyReviewFilters);

  /*******************
   * Modal for Editing Review (without the Question field)
   *******************/
  function openReviewModal(review) {
    rvModal.style.display = "flex";
    currentReviewId = review._id;
    rvProductLink.href = review.ProductLink;
    rvProductLink.textContent = review.ProductLink;
    // Removed the question field; we now only populate review and rating
    rvReviewField.value = review.review;
    rvRatingField.value = review.rating;
  }

  rvModalClose.addEventListener("click", () => {
    rvModal.style.display = "none";
    currentReviewId = null;
  });

  rvForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updatedData = {
      review: rvReviewField.value,
      rating: parseInt(rvRatingField.value),
    };
    try {
      const response = await fetch(`/api/reviews/${currentReviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const updatedReview = await response.json();
      sk_rv_all_reviews = sk_rv_all_reviews.map((rv) =>
        rv._id === currentReviewId ? updatedReview : rv
      );
      applyReviewFilters();
      rvModal.style.display = "none";
      currentReviewId = null;
    } catch (err) {
      console.error("Error updating review:", err);
    }
  });

  /*******************
   * Delete Review Functionality
   *******************/
  async function deleteReview(reviewId) {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      sk_rv_all_reviews = sk_rv_all_reviews.filter((rv) => rv._id !== reviewId);
      applyReviewFilters();
    } catch (err) {
      console.error("Error deleting review:", err);
    }
  }

  /*******************
   * Bulk Selection & Deletion for Reviews
   *******************/
  document
    .getElementById("sk-rv-select-all")
    .addEventListener("change", (e) => {
      const checked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll(".sk-rv-row-checkbox");
      rowCheckboxes.forEach((cb) => (cb.checked = checked));
    });

  document
    .getElementById("sk-rv-bulk-delete")
    ?.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete selected reviews?")) {
        const rowCheckboxes = document.querySelectorAll(".sk-rv-row-checkbox");
        rowCheckboxes.forEach((cb, index) => {
          if (cb.checked) {
            const reviewId = sk_rv_filtered[index]._id;
            deleteReview(reviewId);
          }
        });
      }
    });

  /*******************
   * Image Gallery Modal Functionality
   *******************/
  function openImageGallery(images) {
    rvImgGallery.innerHTML = "";
    images.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      rvImgGallery.appendChild(img);
    });
    rvImgModal.style.display = "flex";
  }

  rvImgModalClose.addEventListener("click", () => {
    rvImgModal.style.display = "none";
  });

  /*******************
   * Initial Fetch of Reviews
   *******************/
  fetchReviews();
});
