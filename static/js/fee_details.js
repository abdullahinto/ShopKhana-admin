document.addEventListener("DOMContentLoaded", () => {
    // Global variable to store fee details
    let feeDetails = {};
  
    const tableBody = document.getElementById("fd-table-body");
    const fdModal = document.getElementById("fd-modal");
    const fdModalClose = document.querySelector(".fd-modal-close");
    const fdForm = document.getElementById("fd-form");
    const fdDeliveryFeeInput = document.getElementById("fd-delivery-fee");
    const fdCodFeeInput = document.getElementById("fd-cod-fee");
  
    // Fetch fee details from backend
    async function fetchFeeDetails() {
      try {
        const response = await fetch("/api/fee_details");
        feeDetails = await response.json();
        renderFeeDetailsTable();
      } catch (err) {
        console.error("Error fetching fee details:", err);
      }
    }
  
    // Render the single row in the table with fee details
    function renderFeeDetailsTable() {
      tableBody.innerHTML = "";
      const tr = document.createElement("tr");
  
      // Delivery Fee
      const tdDeliveryFee = document.createElement("td");
      tdDeliveryFee.textContent = feeDetails.deliveryFee;
      tr.appendChild(tdDeliveryFee);
  
      // COD Fee
      const tdCodFee = document.createElement("td");
      tdCodFee.textContent = feeDetails.codfee;
      tr.appendChild(tdCodFee);
  
      // Action (Edit button)
      const tdActions = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.classList.add("fd-edit-btn");
      editBtn.addEventListener("click", openFeeModal);
      tdActions.appendChild(editBtn);
      tr.appendChild(tdActions);
  
      tableBody.appendChild(tr);
    }
  
    // Open the modal and pre-fill with current fee details
    function openFeeModal() {
      fdModal.style.display = "flex";
      fdDeliveryFeeInput.value = feeDetails.deliveryFee;
      fdCodFeeInput.value = feeDetails.codfee;
    }
  
    // Close the modal
    function closeFeeModal() {
      fdModal.style.display = "none";
    }
  
    fdModalClose.addEventListener("click", closeFeeModal);
  
    // Handle form submission to update fee details
    fdForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const updatedFees = {
        deliveryFee: parseFloat(fdDeliveryFeeInput.value),
        codfee: parseFloat(fdCodFeeInput.value)
      };
      try {
        const response = await fetch("/api/fee_details", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedFees)
        });
        feeDetails = await response.json();
        renderFeeDetailsTable();
        closeFeeModal();
      } catch (err) {
        console.error("Error updating fee details:", err);
      }
    });
  
    // Initial fetch
    fetchFeeDetails();
  });
  