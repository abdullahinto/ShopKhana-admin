document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables
   *******************/
  let returnsAll = []; // All return documents fetched
  let returnsFiltered = []; // Returns after filtering
  let ordersAll = []; // All orders (for calculating eligibility)
  let currentPage = 1;
  const rowsPerPage = 10;

  const tableBody = document.getElementById("sk-ret-table-body");
  const totalCountDisplay = document.getElementById("sk-ret-total-count");
  const paginationContainer = document.getElementById("sk-ret-pagination");

  // Filter elements
  const searchInput = document.getElementById("sk-ret-search");
  const refundFilter = document.getElementById("sk-ret-refund-filter"); // Options: Pending/Refunded
  const returnStatusFilter = document.getElementById("sk-ret-return-filter"); // Options: Eligible/Not Eligible

  // Modal elements for refund screenshot upload
  const refundModal = document.getElementById("sk-ret-refund-modal");
  const refundModalClose = document.querySelector(".sk-ret-refund-modal-close");
  const refundForm = document.getElementById("sk-ret-refund-form");
  const refundScreenshotInput = document.getElementById("sk-ret-screenshot");
  let currentReturnIdForRefund = null;

  // Modal for media popup (images & videos)
  const mediaModal = document.getElementById("sk-ret-media-modal");
  const mediaModalClose = document.querySelector(".sk-ret-media-modal-close");
  const mediaGallery = document.getElementById("sk-ret-media-gallery");

  // Toast notification
  const toast = document.getElementById("sk-ret-toast");

  /*******************
   * Fetch Orders & Returns
   *******************/
  async function fetchOrders() {
    try {
      const response = await fetch("/api/orders");
      ordersAll = await response.json();
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  }

  async function fetchReturns() {
    try {
      const response = await fetch("/api/returns");
      returnsAll = await response.json();
      returnsFiltered = returnsAll;
      currentPage = 1;
      applyFilters();
    } catch (err) {
      console.error("Error fetching returns:", err);
    }
  }

  async function initData() {
    await fetchOrders();
    await fetchReturns();
  }

  /*******************
   * Calculate Return Status
   *******************/
  function calculateReturnStatus(ret) {
    // Find matching order using tracking_id as order_id
    const matchingOrder = ordersAll.find(
      (order) => order.order_id === ret.tracking_id
    );
    if (matchingOrder && matchingOrder.order_arrival_date) {
      const arrivalDate = new Date(matchingOrder.order_arrival_date);
      const requestedDate = new Date(ret.requested_at);
      const diffDays = (requestedDate - arrivalDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 3 ? "Eligible" : "Not Eligible";
    }
    return "Not Eligible";
  }

  /*******************
   * Render Returns Table with Pagination
   *******************/
  function renderReturnsTable() {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const paginatedReturns = returnsFiltered.slice(start, start + rowsPerPage);

    paginatedReturns.forEach((ret) => {
      ret.return_status = calculateReturnStatus(ret);

      const tr = document.createElement("tr");

      // Checkbox
      const tdCheckbox = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("sk-ret-row-checkbox");
      tdCheckbox.appendChild(checkbox);

      // Tracking ID (order id)
      const tdTracking = document.createElement("td");
      tdTracking.textContent = ret.tracking_id;

      // User Email (clickable)
      const tdEmail = document.createElement("td");
      const emailLink = document.createElement("a");
      emailLink.href = `mailto:${ret.user_email}`;
      emailLink.textContent = ret.user_email;
      tdEmail.appendChild(emailLink);

      // Return Reason
      const tdReason = document.createElement("td");
      tdReason.textContent = ret.return_reason;

      // Requested At (formatted)
      const tdRequested = document.createElement("td");
      tdRequested.textContent = ret.requested_at;

      // Return Status (Eligible / Not Eligible)
      const tdReturnStatus = document.createElement("td");
      tdReturnStatus.textContent = ret.return_status;

      // Items: show first word with "copy" button on hover
      const tdItems = document.createElement("td");
      const itemsContainer = document.createElement("div");
      itemsContainer.classList.add("copy-container");
      const firstItem = ret.items && ret.items.length ? ret.items[0] : "";
      itemsContainer.textContent =
        firstItem + (ret.items && ret.items.length > 1 ? "..." : "");
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "Copy";
      copyBtn.classList.add("copy-button");
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(ret.items.join(", "));
      });
      itemsContainer.appendChild(copyBtn);
      tdItems.appendChild(itemsContainer);

      // Images column: "Show" button if exists; else "No Image"
      const tdImages = document.createElement("td");
      if (ret.images && ret.images.length > 0) {
        const imgBtn = document.createElement("button");
        imgBtn.textContent = "Show";
        imgBtn.classList.add("sk-ret-show-btn");
        imgBtn.addEventListener("click", () =>
          openMediaModal(ret.images, "image")
        );
        tdImages.appendChild(imgBtn);
      } else {
        tdImages.textContent = "No Image";
      }

      // Videos column: "Show" button if exists; else "No Video"
      const tdVideos = document.createElement("td");
      if (ret.videos && ret.videos.length > 0) {
        const vidBtn = document.createElement("button");
        vidBtn.textContent = "Show";
        vidBtn.classList.add("sk-ret-show-btn");
        vidBtn.addEventListener("click", () =>
          openMediaModal(ret.videos, "video")
        );
        tdVideos.appendChild(vidBtn);
      } else {
        tdVideos.textContent = "No Video";
      }

      // Refund Status column: if "Refunded", show text; if not, show button to upload screenshot
      const tdRefund = document.createElement("td");
      if (ret.refund_status && ret.refund_status.toLowerCase() === "refunded") {
        tdRefund.textContent = "Refunded";
      } else {
        const refundBtn = document.createElement("button");
        refundBtn.textContent = "Refunded?";
        refundBtn.classList.add("sk-ret-refund-btn");
        refundBtn.addEventListener("click", () => openRefundModal(ret._id));
        tdRefund.appendChild(refundBtn);
      }

      // Action column: Delete button only
      const tdActions = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("sk-ret-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this return?")) {
          deleteReturn(ret._id);
        }
      });
      tdActions.appendChild(deleteBtn);

      // Append all cells in order
      tr.appendChild(tdCheckbox);
      tr.appendChild(tdTracking);
      tr.appendChild(tdEmail);
      tr.appendChild(tdReason);
      tr.appendChild(tdRequested);
      tr.appendChild(tdReturnStatus);
      tr.appendChild(tdItems);
      tr.appendChild(tdImages);
      tr.appendChild(tdVideos);
      tr.appendChild(tdRefund);
      tr.appendChild(tdActions);

      tableBody.appendChild(tr);
    });
    totalCountDisplay.textContent = "Total Returns: " + returnsFiltered.length;
    renderPagination();
  }

  function renderPagination() {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(returnsFiltered.length / rowsPerPage);
    for (let i = 1; i <= totalPages; i++) {
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = i;
      if (i === currentPage) {
        a.classList.add("active");
      }
      a.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage = i;
        renderReturnsTable();
      });
      paginationContainer.appendChild(a);
    }
  }

  /*******************
   * Search, Filter & Sort for Returns
   *******************/
  function applyFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const refundValue = refundFilter.value; // "Pending" or "Refunded"
    const returnStatusValue = returnStatusFilter.value; // "Eligible" or "Not Eligible"

    returnsFiltered = returnsAll.filter((ret) => {
      const matchesSearch =
        !searchQuery ||
        ret.return_reason.toLowerCase().includes(searchQuery) ||
        ret.user_email.toLowerCase().includes(searchQuery) ||
        ret.tracking_id.toLowerCase().includes(searchQuery);
      const matchesRefund =
        !refundValue ||
        (ret.refund_status &&
          ret.refund_status.toLowerCase() === refundValue.toLowerCase());
      const computedStatus = calculateReturnStatus(ret);
      const matchesReturnStatus =
        !returnStatusValue ||
        computedStatus.toLowerCase() === returnStatusValue.toLowerCase();
      return matchesSearch && matchesRefund && matchesReturnStatus;
    });

    // Sort returns by requested_at descending (newest first)
    returnsFiltered.sort(
      (a, b) => new Date(b.requested_at) - new Date(a.requested_at)
    );
    currentPage = 1;
    renderReturnsTable();
  }

  searchInput.addEventListener("input", applyFilters);
  refundFilter.addEventListener("change", applyFilters);
  returnStatusFilter.addEventListener("change", applyFilters);

  /*******************
   * Open Refund Modal and Handle Upload
   *******************/
  function openRefundModal(returnId) {
    currentReturnIdForRefund = returnId;
    refundModal.style.display = "flex";
  }

  refundModalClose.addEventListener("click", () => {
    refundModal.style.display = "none";
    currentReturnIdForRefund = null;
  });

  refundForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = document.getElementById("sk-ret-screenshot").files[0];
    if (!file) {
      alert("Please select a screenshot to upload.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      const screenshotURL = uploadData.url;

      const response = await fetch(`/api/returns/${currentReturnIdForRefund}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refund_status: "Refunded",
          refund_screenshot: screenshotURL,
        }),
      });
      const updatedReturn = await response.json();
      returnsAll = returnsAll.map((ret) =>
        ret._id === currentReturnIdForRefund ? updatedReturn : ret
      );
      applyFilters();
      refundModal.style.display = "none";
      currentReturnIdForRefund = null;
      showToast("Refund status updated successfully.");
    } catch (err) {
      console.error("Error updating refund status:", err);
    }
  });

  /*******************
   * Open Media Modal for Images & Videos
   *******************/
  function openMediaModal(mediaArray, type) {
    mediaGallery.innerHTML = "";
    mediaArray.forEach((src) => {
      if (type === "image") {
        const img = document.createElement("img");
        img.src = src;
        mediaGallery.appendChild(img);
      } else if (type === "video") {
        const video = document.createElement("video");
        video.src = src;
        video.controls = true;
        mediaGallery.appendChild(video);
      }
    });
    mediaModal.style.display = "flex";
  }

  mediaModalClose.addEventListener("click", () => {
    mediaModal.style.display = "none";
  });

  /*******************
   * Bulk Selection & Deletion for Returns
   *******************/
  document
    .getElementById("sk-ret-select-all")
    .addEventListener("change", (e) => {
      const checked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll(".sk-ret-row-checkbox");
      rowCheckboxes.forEach((cb) => (cb.checked = checked));
    });

  document
    .getElementById("sk-ret-bulk-delete")
    .addEventListener("click", () => {
      if (confirm("Are you sure you want to delete selected returns?")) {
        const rowCheckboxes = document.querySelectorAll(".sk-ret-row-checkbox");
        rowCheckboxes.forEach((cb, index) => {
          if (cb.checked) {
            const returnId = returnsFiltered[index]._id;
            deleteReturn(returnId);
          }
        });
      }
    });

  async function deleteReturn(returnId) {
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      returnsAll = returnsAll.filter((ret) => ret._id !== returnId);
      applyFilters();
    } catch (err) {
      console.error("Error deleting return:", err);
    }
  }

  /*******************
   * Toast Notification
   *******************/
  function showToast(message) {
    toast.textContent = message;
    toast.style.opacity = "1";
    setTimeout(() => {
      toast.style.opacity = "0";
    }, 3000);
  }

  /*******************
   * Initial Data Fetch: Orders and Returns
   *******************/
  async function init() {
    await fetchOrders();
    await fetchReturns();
  }

  init();
});
