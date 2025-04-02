document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables for Orders
   *******************/
  let sk_ord_all_orders = [];
  let sk_ord_filtered = [];
  let currentPage = 1;
  const rowsPerPage = 10;

  const tableBody = document.getElementById("sk-ord-table-body");
  const totalCountDisplay = document.getElementById("sk-ord-total-count");
  const paginationContainer = document.getElementById("sk-ord-pagination");

  // Filter Elements
  const searchInput = document.getElementById("sk-ord-search");
  const statusFilter = document.getElementById("sk-ord-status-filter");
  const paymentFilter = document.getElementById("sk-ord-payment-filter");
  const provinceFilter = document.getElementById("sk-ord-province-filter");
  const sortSelect = document.getElementById("sk-ord-sort");

  // Toast Notification
  const toast = document.getElementById("sk-ord-toast");

  /*******************
   * Fetch Orders from Backend
   *******************/
  async function fetchOrders() {
    try {
      const response = await fetch("/api/orders");
      const data = await response.json();
      sk_ord_all_orders = data;
      sk_ord_filtered = data;
      currentPage = 1;
      applyFilters();
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  }

  /*******************
   * Render Orders Table with Pagination
   *******************/
  function renderOrdersTable() {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const paginatedOrders = sk_ord_filtered.slice(start, start + rowsPerPage);

    paginatedOrders.forEach((order) => {
      const tr = document.createElement("tr");

      // Bulk selection checkbox
      const tdCheckbox = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("sk-ord-row-checkbox");
      tdCheckbox.appendChild(checkbox);

      // Order ID
      const tdOrderId = document.createElement("td");
      tdOrderId.textContent = order.order_id;

      // User Email (clickable mailto)
      const tdEmail = document.createElement("td");
      const emailLink = document.createElement("a");
      emailLink.href = `mailto:${order.user_email}`;
      emailLink.textContent = order.user_email;
      tdEmail.appendChild(emailLink);

      // Customer Name with copy button on hover
      const tdCustomerName = document.createElement("td");
      const customerContainer = document.createElement("div");
      customerContainer.classList.add("copy-container");
      customerContainer.textContent = order.customer_name;
      const copyCustomerBtn = document.createElement("button");
      copyCustomerBtn.textContent = "Copy";
      copyCustomerBtn.classList.add("copy-button");
      copyCustomerBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(order.customer_name);
      });
      customerContainer.appendChild(copyCustomerBtn);
      tdCustomerName.appendChild(customerContainer);

      // Address: show only the first word and truncate the rest
      const tdAddress = document.createElement("td");
      const firstWord = order.address.split(" ")[0];
      tdAddress.textContent =
        firstWord + (order.address.split(" ").length > 1 ? "..." : "");
      tdAddress.classList.add("sk-ord-address");

      // Province
      const tdProvince = document.createElement("td");
      tdProvince.textContent = order.province;

      // Payment Method
      const tdPaymentMethod = document.createElement("td");
      tdPaymentMethod.textContent = order.payment_method;

      // Payment Amount
      const tdPaymentAmount = document.createElement("td");
      tdPaymentAmount.textContent = order.payment_amount;

      // Order Status
      const tdStatus = document.createElement("td");
      tdStatus.textContent = order.order_status;

      // Transaction Date (formatted)
      const tdTransDate = document.createElement("td");
      tdTransDate.textContent = order.transaction_date;

      // Phone Number with copy button on hover
      const tdPhone = document.createElement("td");
      const phoneContainer = document.createElement("div");
      phoneContainer.classList.add("copy-container");
      phoneContainer.textContent = order.phone_number;
      const copyPhoneBtn = document.createElement("button");
      copyPhoneBtn.textContent = "Copy";
      copyPhoneBtn.classList.add("copy-button");
      copyPhoneBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(order.phone_number);
      });
      phoneContainer.appendChild(copyPhoneBtn);
      tdPhone.appendChild(phoneContainer);

      // Action column: If order_status is Delivered, show "N/A", else "Delivered" button.
      const tdActions = document.createElement("td");
      if (order.order_status.toLowerCase() === "delivered") {
        tdActions.textContent = "N/A";
      } else {
        const deliveredBtn = document.createElement("button");
        deliveredBtn.textContent = "Delivered";
        deliveredBtn.classList.add("sk-ord-delivered-btn");
        deliveredBtn.addEventListener("click", () => {
          if (confirm("Mark this order as Delivered?")) {
            markOrderAsDelivered(order._id);
          }
        });
        tdActions.appendChild(deliveredBtn);
      }

      tr.appendChild(tdCheckbox);
      tr.appendChild(tdOrderId);
      tr.appendChild(tdEmail);
      tr.appendChild(tdCustomerName);
      tr.appendChild(tdAddress);
      tr.appendChild(tdProvince);
      tr.appendChild(tdPaymentMethod);
      tr.appendChild(tdPaymentAmount);
      tr.appendChild(tdStatus);
      tr.appendChild(tdTransDate);
      tr.appendChild(tdPhone);
      tr.appendChild(tdActions);

      tableBody.appendChild(tr);
    });
    totalCountDisplay.textContent = "Total Orders: " + sk_ord_filtered.length;
    renderPagination();
  }

  /*******************
   * Render Pagination
   *******************/
  function renderPagination() {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(sk_ord_filtered.length / rowsPerPage);
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
        renderOrdersTable();
      });
      paginationContainer.appendChild(a);
    }
  }

  /*******************
   * Search, Filter & Sort Functionality for Orders
   *******************/
  function applyFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const statusValue = statusFilter.value.toLowerCase();
    const paymentValue = paymentFilter.value.toLowerCase();
    const provinceValue = provinceFilter.value.toLowerCase();
    const sortValue = sortSelect.value; // "newest" or "oldest"

    sk_ord_filtered = sk_ord_all_orders.filter((order) => {
      const matchesSearch =
        !searchQuery ||
        order.order_id.toLowerCase().includes(searchQuery) ||
        order.user_email.toLowerCase().includes(searchQuery) ||
        order.customer_name.toLowerCase().includes(searchQuery);
      const matchesStatus =
        !statusValue || order.order_status.toLowerCase() === statusValue;
      const matchesPayment =
        !paymentValue || order.payment_method.toLowerCase() === paymentValue;
      const matchesProvince =
        !provinceValue || order.province.toLowerCase() === provinceValue;
      return (
        matchesSearch && matchesStatus && matchesPayment && matchesProvince
      );
    });

    // Sorting based on transaction_date
    sk_ord_filtered.sort((a, b) => {
      const dateA = new Date(a.transaction_date);
      const dateB = new Date(b.transaction_date);
      return sortValue === "newest" ? dateB - dateA : dateA - dateB;
    });
    currentPage = 1;
    renderOrdersTable();
  }

  searchInput.addEventListener("input", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  paymentFilter.addEventListener("change", applyFilters);
  provinceFilter.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);

  /*******************
   * Mark Order as Delivered
   *******************/
  async function markOrderAsDelivered(orderId) {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_status: "Delivered" }),
      });
      const updatedOrder = await response.json();
      sk_ord_all_orders = sk_ord_all_orders.map((order) =>
        order._id === orderId ? updatedOrder : order
      );
      applyFilters();
      showToast(
        "Order status changed successfully and order arrival date has been added"
      );
    } catch (err) {
      console.error("Error updating order:", err);
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
   * Bulk Selection & Deletion for Orders
   *******************/
  document
    .getElementById("sk-ord-select-all")
    .addEventListener("change", (e) => {
      const checked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll(".sk-ord-row-checkbox");
      rowCheckboxes.forEach((cb) => (cb.checked = checked));
    });

  document
    .getElementById("sk-ord-bulk-delete")
    .addEventListener("click", () => {
      if (confirm("Are you sure you want to delete selected orders?")) {
        const rowCheckboxes = document.querySelectorAll(".sk-ord-row-checkbox");
        rowCheckboxes.forEach((cb, index) => {
          if (cb.checked) {
            const orderId = sk_ord_filtered[index]._id;
            deleteOrder(orderId);
          }
        });
      }
    });

  async function deleteOrder(orderId) {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      sk_ord_all_orders = sk_ord_all_orders.filter(
        (order) => order._id !== orderId
      );
      applyFilters();
    } catch (err) {
      console.error("Error deleting order:", err);
    }
  }

  /*******************
   * Initial Fetch of Orders
   *******************/
  fetchOrders();
});
