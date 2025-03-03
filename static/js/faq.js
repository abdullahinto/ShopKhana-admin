document.addEventListener("DOMContentLoaded", () => {
  /*******************
   * Global Variables for FAQs
   *******************/
  let sk_faq_all = [];
  let sk_faq_filtered = [];

  const tableBody = document.getElementById("sk-faq-table-body");
  const searchInput = document.getElementById("sk-faq-search");
  const statusFilter = document.getElementById("sk-faq-status-filter");

  // Modal elements
  const faqModal = document.getElementById("sk-faq-modal");
  const faqModalClose = document.querySelector(".sk-faq-modal-close");
  const faqForm = document.getElementById("sk-faq-form");
  const faqProductLink = document.getElementById("sk-faq-product-link");
  const faqQuestionField = document.getElementById("sk-faq-question");
  const faqAnswerField = document.getElementById("sk-faq-answer");

  let currentFAQId = null;

  /*******************
   * Fetch FAQs from Backend
   *******************/
  async function fetchFAQs() {
    try {
      const response = await fetch("/api/faqs");
      const data = await response.json();
      sk_faq_all = data;
      sk_faq_filtered = data;
      renderFAQsTable();
    } catch (err) {
      console.error("Error fetching FAQs:", err);
    }
  }

  /*******************
   * Render FAQs Table
   *******************/
  function renderFAQsTable() {
    tableBody.innerHTML = "";
    sk_faq_filtered.forEach((faq) => {
      const tr = document.createElement("tr");

      // Product Link column
      const tdLink = document.createElement("td");
      const aLink = document.createElement("a");
      aLink.href = faq.ProductLink;
      aLink.textContent = faq.ProductLink;
      aLink.target = "_blank";
      tdLink.appendChild(aLink);

      // Question column
      const tdQuestion = document.createElement("td");
      tdQuestion.textContent = faq.Question;

      // Answer column
      const tdAnswer = document.createElement("td");
      tdAnswer.textContent = faq.Answer;

      // Status column
      const tdStatus = document.createElement("td");
      tdStatus.textContent = faq.Status;

      // Action column
      const tdActions = document.createElement("td");

      // Answer button: only if status is "Unanswered"
      if (faq.Status === "Unanswered") {
        const answerBtn = document.createElement("button");
        answerBtn.textContent = "Answer";
        answerBtn.classList.add("sk-faq-answer-btn");
        answerBtn.addEventListener("click", () => {
          openFAQModal(faq);
        });
        tdActions.appendChild(answerBtn);
      }

      // Edit button (for editing both question and answer)
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.classList.add("sk-faq-edit-btn");
      editBtn.addEventListener("click", () => {
        openFAQModal(faq, true); // true means edit mode
      });
      tdActions.appendChild(editBtn);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("sk-faq-delete-btn");
      deleteBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this FAQ?")) {
          deleteFAQ(faq._id);
        }
      });
      tdActions.appendChild(deleteBtn);

      tr.appendChild(tdLink);
      tr.appendChild(tdQuestion);
      tr.appendChild(tdAnswer);
      tr.appendChild(tdStatus);
      tr.appendChild(tdActions);

      tableBody.appendChild(tr);
    });
  }

  /*******************
   * Search & Filter Functionality for FAQs
   *******************/
  function applyFAQFilters() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const statusValue = statusFilter.value;
    sk_faq_filtered = sk_faq_all.filter((faq) => {
      const matchesSearch =
        !searchQuery ||
        faq.Question.toLowerCase().includes(searchQuery) ||
        faq.ProductLink.toLowerCase().includes(searchQuery);
      const matchesStatus = !statusValue || faq.Status === statusValue;
      return matchesSearch && matchesStatus;
    });
    renderFAQsTable();
  }

  searchInput.addEventListener("input", applyFAQFilters);
  statusFilter.addEventListener("change", applyFAQFilters);

  /*******************
   * Modal for Answering/Editing FAQs
   *******************/
  function openFAQModal(faq, editMode = false) {
    faqModal.style.display = "flex";
    currentFAQId = faq._id;
    // Set the product link and question fields (read-only)
    faqProductLink.href = faq.ProductLink;
    faqProductLink.textContent = faq.ProductLink;
    faqQuestionField.value = faq.Question;
    // Pre-fill the answer field if editing
    faqAnswerField.value = faq.Answer !== "N/A" ? faq.Answer : "";
  }

  faqModalClose.addEventListener("click", () => {
    faqModal.style.display = "none";
    currentFAQId = null;
  });

  faqForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updatedFAQ = {
      Answer: faqAnswerField.value,
      Status: "Answered",
    };
    try {
      const response = await fetch(`/api/faqs/${currentFAQId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFAQ),
      });
      const result = await response.json();
      // Update local FAQs array
      sk_faq_all = sk_faq_all.map((faq) =>
        faq._id === currentFAQId ? result : faq
      );
      applyFAQFilters();
      faqModal.style.display = "none";
      currentFAQId = null;
    } catch (err) {
      console.error("Error updating FAQ:", err);
    }
  });

  async function deleteFAQ(faqId) {
    try {
      const response = await fetch(`/api/faqs/${faqId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      sk_faq_all = sk_faq_all.filter((faq) => faq._id !== faqId);
      applyFAQFilters();
    } catch (err) {
      console.error("Error deleting FAQ:", err);
    }
  }

  /*******************
   * Initial Fetch of FAQs
   *******************/
  async function fetchFAQs() {
    try {
      const response = await fetch("/api/faqs");
      const data = await response.json();
      sk_faq_all = data;
      sk_faq_filtered = data;
      renderFAQsTable();
    } catch (err) {
      console.error("Error fetching FAQs:", err);
    }
  }

  fetchFAQs();
});
