// Toggle the main dropdown menu
document
  .querySelector(".dropdown-button")
  .addEventListener("click", function () {
    const dropdownContent = document.querySelector(".dropdown-content");
    dropdownContent.style.display =
      dropdownContent.style.display === "block" ? "none" : "block";
  });

// Toggle sub-dropdown menus
document.querySelectorAll(".sub-dropdown-button").forEach((button) => {
  button.addEventListener("click", function () {
    const subDropdownContent = this.nextElementSibling;
    subDropdownContent.style.display =
      subDropdownContent.style.display === "block" ? "none" : "block";
  });
});

// Close dropdowns when clicking outside
document.addEventListener("click", function (event) {
  const dropdownContainer = document.querySelector(".dropdown-container");
  if (!dropdownContainer.contains(event.target)) {
    document.querySelector(".dropdown-content").style.display = "none";
    document.querySelectorAll(".sub-dropdown-content").forEach((sub) => {
      sub.style.display = "none";
    });
  }
});
