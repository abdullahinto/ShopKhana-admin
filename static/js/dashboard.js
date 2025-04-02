document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables
   *******************/
  let orders = [];
  let products = [];
  let categories = [];
  let coupons = [];
  let returnsData = [];
  let reviews = [];

  // Metrics elements
  const totalOrdersEl = document
    .getElementById("total-orders")
    .querySelector(".metric-value");
  const deliveredOrdersEl = document
    .getElementById("delivered-orders")
    .querySelector(".metric-value");
  const pendingOrdersEl = document
    .getElementById("pending-orders")
    .querySelector(".metric-value");
  const totalSalesEl = document
    .getElementById("total-sales")
    .querySelector(".metric-value");
  const avgOrderValueEl = document
    .getElementById("avg-order-value")
    .querySelector(".metric-value");
  const refundPercentageEl = document
    .getElementById("refund-percentage")
    .querySelector(".metric-value");
  const totalProductsEl = document
    .getElementById("total-products")
    .querySelector(".metric-value");
  const totalCategoriesEl = document
    .getElementById("total-categories")
    .querySelector(".metric-value");
  const totalCouponsEl = document
    .getElementById("total-coupons")
    .querySelector(".metric-value");
  const totalReturnsEl = document
    .getElementById("total-returns")
    .querySelector(".metric-value");
  const totalReviewsEl = document
    .getElementById("total-reviews")
    .querySelector(".metric-value");

  // Chart element
  const salesChartCanvas = document.getElementById("salesChart");
  let salesChart;

  // Auto-refresh interval (milliseconds)
  const refreshInterval = 60000; // 60 seconds

  /*******************
   * Fetch Data Functions
   *******************/
  async function fetchData(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (err) {
      console.error(`Error fetching ${url}:`, err);
      return [];
    }
  }

  async function initDashboard() {
    orders = await fetchData("/api/orders");
    products = await fetchData("/api/products");
    categories = await fetchData("/api/categories");
    coupons = await fetchData("/api/coupons");
    returnsData = await fetchData("/api/returns");
    reviews = await fetchData("/api/reviews");
    updateMetrics();
    renderSalesChart();
  }

  /*******************
   * Update Metrics Calculations
   *******************/
  function updateMetrics() {
    // Total orders
    const totalOrders = orders.length;
    totalOrdersEl.textContent = totalOrders;

    // Delivered and pending orders (based on order_status, case-insensitive)
    const deliveredOrders = orders.filter(
      (o) => o.order_status.toLowerCase() === "delivered"
    );
    const pendingOrders = orders.filter(
      (o) => o.order_status.toLowerCase() !== "delivered"
    );
    deliveredOrdersEl.textContent = deliveredOrders.length;
    pendingOrdersEl.textContent = pendingOrders.length;

    // Total sales/revenue: sum payment_amount for delivered orders that are not refunded
    // For each delivered order, check if there's a corresponding return with refund_status "Refunded"
    const refundedOrderIds = new Set(
      returnsData
        .filter(
          (r) => r.refund_status && r.refund_status.toLowerCase() === "refunded"
        )
        .map((r) => r.tracking_id)
    );
    const deliveredNotRefunded = deliveredOrders.filter(
      (o) => !refundedOrderIds.has(o.order_id)
    );
    const totalSales = deliveredNotRefunded.reduce(
      (sum, order) => sum + parseFloat(order.payment_amount || 0),
      0
    );
    totalSalesEl.textContent = totalSales.toFixed(2);

    // Average order value: total sales divided by total delivered orders (all delivered orders)
    const avgOrderValue = deliveredOrders.length
      ? totalSales / deliveredOrders.length
      : 0;
    avgOrderValueEl.textContent = avgOrderValue.toFixed(2);

    // Refund percentage: (number of delivered orders that are refunded / total delivered orders) * 100
    const refundedCount = deliveredOrders.filter((o) =>
      refundedOrderIds.has(o.order_id)
    ).length;
    const refundPercentage = deliveredOrders.length
      ? (refundedCount / deliveredOrders.length) * 100
      : 0;
    refundPercentageEl.textContent = refundPercentage.toFixed(2);

    // Total products, categories, coupons, returns, reviews counts
    totalProductsEl.textContent = products.length;
    totalCategoriesEl.textContent = categories.length;
    totalCouponsEl.textContent = coupons.length;
    totalReturnsEl.textContent = returnsData.length;
    totalReviewsEl.textContent = reviews.length;
  }

  /*******************
   * Render Sales Chart (Last 7 Days)
   *******************/
  function renderSalesChart() {
    // Prepare daily revenue for delivered (and not refunded) orders for last 7 days
    const today = new Date();
    const days = [];
    const revenueData = [];

    // Create date labels for last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toISOString().slice(0, 10);
      days.push(label);
      revenueData.push(0);
    }

    // Get order revenue for delivered and not refunded orders
    const refundedOrderIds = new Set(
      returnsData
        .filter(
          (r) => r.refund_status && r.refund_status.toLowerCase() === "refunded"
        )
        .map((r) => r.tracking_id)
    );
    const relevantOrders = orders.filter(
      (o) =>
        o.order_status.toLowerCase() === "delivered" &&
        !refundedOrderIds.has(o.order_id)
    );

    relevantOrders.forEach((order) => {
      if (order.transaction_date) {
        const transDate = new Date(order.transaction_date)
          .toISOString()
          .slice(0, 10);
        const index = days.indexOf(transDate);
        if (index !== -1) {
          revenueData[index] += parseFloat(order.payment_amount || 0);
        }
      }
    });

    // If chart exists, update; else create new chart
    if (salesChart) {
      salesChart.data.labels = days;
      salesChart.data.datasets[0].data = revenueData;
      salesChart.update();
    } else {
      salesChart = new Chart(salesChartCanvas, {
        type: "line",
        data: {
          labels: days,
          datasets: [
            {
              label: "Daily Revenue (Rs.)",
              data: revenueData,
              fill: false,
              borderColor: "orange",
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  /*******************
   * Auto-Refresh Dashboard
   *******************/
  setInterval(() => {
    initDashboard();
  }, 60000); // Refresh every 60 seconds

  /*******************
   * Card Click Handlers - Open respective pages in new tab
   *******************/
  const cards = document.querySelectorAll(".db-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const link = card.getAttribute("data-link");
      if (link) {
        window.open(link, "_blank");
      }
    });
  });

  /*******************
   * Initialize Dashboard
   *******************/
  initDashboard();
});
