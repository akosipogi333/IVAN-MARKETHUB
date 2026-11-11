
"use strict";

/* =========================================
   MARKETHUB - BUY & SELL MARKETPLACE
   No default products
   Products saved using LocalStorage
========================================= */

const $ = (selector) => document.querySelector(selector);

const STORAGE_PRODUCTS = "markethub_products_v3";
const STORAGE_FAVORITES = "markethub_favorites_v1";

const CATEGORIES = [
  { name: "All", icon: "✦" },
  { name: "Electronics", icon: "🎧" },
  { name: "Fashion", icon: "👕" },
  { name: "Home & Living", icon: "🛋️" },
  { name: "Vehicles", icon: "🚗" },
  { name: "Sports", icon: "⚽" },
  { name: "Books", icon: "📚" },
  { name: "Other", icon: "📦" }
];

// EMPTY DEFAULT PRODUCTS
const DEFAULT_PRODUCTS = [];

let products = loadProducts();
let favorites = loadFavorites();
let selectedCategory = "All";
let favoritesOnly = false;
let selectedImage = "";
let toastTimer = null;

/* ---------- STORAGE ---------- */

function loadProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_PRODUCTS);

    if (saved === null) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load products:", error);
    return [];
  }
}

function saveProducts() {
  try {
    localStorage.setItem(
      STORAGE_PRODUCTS,
      JSON.stringify(products)
    );

    return true;
  } catch (error) {
    console.error("Could not save products:", error);
    showToast("Storage is full. Try using a smaller image.");
    return false;
  }
}

function loadFavorites() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_FAVORITES) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem(
    STORAGE_FAVORITES,
    JSON.stringify(favorites)
  );
}

/* ---------- HELPERS ---------- */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function fallbackImage() {
  return "https://placehold.co/900x650/172238/b7f36b?text=MARKETHUB";
}

function safeImage(image) {
  if (typeof image !== "string") {
    return fallbackImage();
  }

  if (image.startsWith("data:image/")) {
    return image;
  }

  try {
    const url = new URL(image);

    if (
      url.protocol === "https:" ||
      url.protocol === "http:"
    ) {
      return url.href;
    }
  } catch {
    return fallbackImage();
  }

  return fallbackImage();
}

function showToast(message) {
  const toast = $("#toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function getProduct(id) {
  return products.find((product) => product.id === id);
}

function createId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return "item-" + Date.now() + "-" +
    Math.random().toString(16).slice(2);
}

function validateFacebookLink(value) {
  try {
    const url = new URL(value);

    const allowedHosts = [
      "facebook.com",
      "www.facebook.com",
      "m.facebook.com",
      "fb.com",
      "www.fb.com"
    ];

    return (
      url.protocol === "https:" &&
      allowedHosts.includes(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

/* ---------- CATEGORIES ---------- */

function renderCategories() {
  const categoryGrid = $("#categoryGrid");
  const filterChips = $("#filterChips");

  categoryGrid.innerHTML = CATEGORIES
    .filter((category) => category.name !== "All")
    .map((category) => {
      const count = products.filter((product) =>
        product.category === category.name
      ).length;

      return `
        <button
          class="category-card ${
            selectedCategory === category.name ? "active" : ""
          }"
          data-category="${escapeHTML(category.name)}">

          <span class="category-emoji">${category.icon}</span>
          <strong>${escapeHTML(category.name)}</strong>

          <small>
            ${count} ${count === 1 ? "item" : "items"}
          </small>
        </button>
      `;
    })
    .join("");

  filterChips.innerHTML = CATEGORIES.map((category) => `
    <button
      class="filter-chip ${
        selectedCategory === category.name ? "active" : ""
      }"
      data-filter="${escapeHTML(category.name)}">

      ${category.icon} ${escapeHTML(category.name)}
    </button>
  `).join("");

  $("#productCategory").innerHTML = CATEGORIES
    .filter((category) => category.name !== "All")
    .map((category) => `
      <option value="${escapeHTML(category.name)}">
        ${escapeHTML(category.name)}
      </option>
    `)
    .join("");
}

/* ---------- PRODUCT FILTERING ---------- */

function getFilteredProducts() {
  const search = $("#searchInput").value
    .trim()
    .toLowerCase();

  const sort = $("#sortSelect").value;

  let result = [...products];

  if (selectedCategory !== "All") {
    result = result.filter((product) =>
      product.category === selectedCategory
    );
  }

  if (favoritesOnly) {
    result = result.filter((product) =>
      favorites.includes(product.id)
    );
  }

  if (search) {
    result = result.filter((product) => {
      const searchable = [
        product.name,
        product.category,
        product.seller,
        product.location,
        product.description
      ].join(" ").toLowerCase();

      return searchable.includes(search);
    });
  }

  if (sort === "price-low") {
    result.sort((a, b) =>
      Number(a.price) - Number(b.price)
    );
  } else if (sort === "price-high") {
    result.sort((a, b) =>
      Number(b.price) - Number(a.price)
    );
  } else if (sort === "name") {
    result.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } else {
    result.sort((a, b) =>
      Number(b.createdAt) - Number(a.createdAt)
    );
  }

  return result;
}

/* ---------- DISPLAY PRODUCTS ---------- */

function renderProducts() {
  const grid = $("#productGrid");
  const emptyState = $("#emptyState");

  const result = getFilteredProducts();

  $("#resultsCount").textContent =
    `${result.length} ${result.length === 1 ? "item" : "items"}`;

  $("#activeFilterLabel").textContent = favoritesOnly
    ? "Your favorites"
    : selectedCategory === "All"
      ? "All listings"
      : selectedCategory;

  $("#heroProductCount").textContent = products.length;

  if (!result.length) {
    grid.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  grid.innerHTML = result.map((product) => {
    const isFavorite = favorites.includes(product.id);

    return `
      <article class="product-card">

        <div
          class="product-image-wrap"
          data-details="${escapeHTML(product.id)}">

          <img
            class="product-image"
            src="${escapeHTML(safeImage(product.image))}"
            alt="${escapeHTML(product.name)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='${fallbackImage()}';">

          <span class="product-badge">
            ${escapeHTML(product.category)}
          </span>

          <button
            class="favorite-btn ${isFavorite ? "active" : ""}"
            data-favorite="${escapeHTML(product.id)}"
            aria-label="Toggle favorite"
            title="Save favorite">

            ${isFavorite ? "♥" : "♡"}
          </button>
        </div>

        <div class="product-info">

          <div class="product-category">
            ${escapeHTML(product.category)}
          </div>

          <h3 class="product-title">
            ${escapeHTML(product.name)}
          </h3>

          <p class="product-description">
            ${escapeHTML(product.description)}
          </p>

          <div class="product-price">
            ${formatPrice(product.price)}
          </div>

          <div class="product-meta">
            <span>⌖ ${escapeHTML(product.location)}</span>
            <span>${formatDate(product.createdAt)}</span>
          </div>

          <div class="product-actions">

            <button
              class="contact-btn"
              data-contact="${escapeHTML(product.id)}">
              f Contact seller
            </button>

            <button
              class="details-btn"
              data-details="${escapeHTML(product.id)}">
              Details
            </button>

          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* ---------- FACEBOOK CONTACT ---------- */

function contactSeller(id) {
  const product = getProduct(id);

  if (!product) {
    showToast("This listing could not be found.");
    return;
  }

  if (!validateFacebookLink(product.facebook || "")) {
    showToast("This seller has not added a valid Facebook link.");
    return;
  }

  const opened = window.open(
    product.facebook,
    "_blank",
    "noopener,noreferrer"
  );

  if (!opened) {
    showToast(
      "Your browser blocked the new tab. Allow pop-ups and try again."
    );
  }
}

/* ---------- FAVORITES ---------- */

function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(
      (favoriteId) => favoriteId !== id
    );

    showToast("Removed from favorites.");
  } else {
    favorites.push(id);
    showToast("Added to favorites.");
  }

  saveFavorites();
  renderProducts();
  renderDashboard();
}

function showFavorites() {
  favoritesOnly = !favoritesOnly;
  selectedCategory = "All";

  $("#favoritesNav").innerHTML = favoritesOnly
    ? "♥ <span>Show all</span>"
    : "♡ <span>Favorites</span>";

  renderCategories();
  renderProducts();

  $("#market").scrollIntoView({
    behavior: "smooth"
  });
}

/* ---------- PRODUCT DETAILS ---------- */

function showDetails(id) {
  const product = getProduct(id);

  if (!product) return;

  $("#detailsContent").innerHTML = `
    <img
      class="detail-image"
      src="${escapeHTML(safeImage(product.image))}"
      alt="${escapeHTML(product.name)}"
      onerror="this.onerror=null;this.src='${fallbackImage()}';">

    <div class="product-category" style="margin-top:16px">
      ${escapeHTML(product.category)}
    </div>

    <h2
      id="detailsTitle"
      class="product-title"
      style="font-size:24px">

      ${escapeHTML(product.name)}
    </h2>

    <div class="detail-price">
      ${formatPrice(product.price)}
    </div>

    <div class="detail-meta">
      <span>⌖ ${escapeHTML(product.location)}</span>
      <span>Posted ${formatDate(product.createdAt)}</span>
    </div>

    <p class="detail-description">
      ${escapeHTML(product.description)}
    </p>

    <div class="detail-seller">
      Seller: <strong>${escapeHTML(product.seller)}</strong><br>
      <span>
        Contact this seller through their Facebook profile or page.
      </span>
    </div>

    <button
      class="btn btn-primary detail-contact"
      data-contact="${escapeHTML(product.id)}">

      f Contact seller on Facebook
    </button>
  `;

  openModal("detailsModal");
}

/* ---------- MODALS ---------- */

function openModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal-backdrop.open")) {
    document.body.style.overflow = "";
  }
}

function openListingModal(product = null) {
  $("#listingForm").reset();
  $("#editingId").value = "";
  $("#formError").textContent = "";

  selectedImage = "";

  $("#imagePreviewWrap").classList.add("hidden");
  $("#listingModalTitle").textContent = "Create a listing";
  $("#saveListingBtn").textContent = "Publish listing";

  if (product) {
    $("#editingId").value = product.id;
    $("#productName").value = product.name;
    $("#productPrice").value = product.price;
    $("#productCategory").value = product.category;
    $("#sellerName").value = product.seller;
    $("#sellerLocation").value = product.location;
    $("#sellerFacebook").value = product.facebook;
    $("#productDescription").value = product.description;

    $("#productImageUrl").value =
      product.image.startsWith("data:") ? "" : product.image;

    selectedImage = product.image;

    if (selectedImage) {
      $("#imagePreview").src = safeImage(selectedImage);
      $("#imagePreviewWrap").classList.remove("hidden");
    }

    $("#listingModalTitle").textContent = "Edit your listing";
    $("#saveListingBtn").textContent = "Save changes";
  }

  openModal("listingModal");
}

/* ---------- IMAGE UPLOAD ---------- */

$("#productImageFile").addEventListener("change", (event) => {
  const file = event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please select a valid image file.");
    event.target.value = "";
    return;
  }

  if (file.size > 1.5 * 1024 * 1024) {
    showToast("Please choose an image smaller than 1.5 MB.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    selectedImage = String(reader.result || "");

    $("#imagePreview").src = selectedImage;
    $("#imagePreviewWrap").classList.remove("hidden");
    $("#productImageUrl").value = "";
  };

  reader.onerror = () => {
    showToast("Could not read this image.");
  };

  reader.readAsDataURL(file);
});

$("#removeImageBtn").addEventListener("click", () => {
  selectedImage = "";

  $("#productImageFile").value = "";
  $("#productImageUrl").value = "";

  $("#imagePreviewWrap").classList.add("hidden");
});

/* ---------- CREATE / UPDATE LISTING ---------- */

$("#listingForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const editingId = $("#editingId").value;
  const name = $("#productName").value.trim();
  const price = Number($("#productPrice").value);
  const category = $("#productCategory").value;
  const seller = $("#sellerName").value.trim();
  const location = $("#sellerLocation").value.trim();
  const facebook = $("#sellerFacebook").value.trim();
  const description = $("#productDescription").value.trim();
  const imageUrl = $("#productImageUrl").value.trim();

  $("#formError").textContent = "";

  if (!name || !seller || !location || !description) {
    $("#formError").textContent =
      "Please complete all required fields.";
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    $("#formError").textContent =
      "Please enter a valid price.";
    return;
  }

  if (!validateFacebookLink(facebook)) {
    $("#formError").textContent =
      "Enter a valid HTTPS Facebook profile or page link.";
    return;
  }

  let image = selectedImage || imageUrl;

  if (imageUrl && !selectedImage) {
    try {
      const parsedImageUrl = new URL(imageUrl);

      if (!["https:", "http:"].includes(parsedImageUrl.protocol)) {
        throw new Error("Invalid image URL");
      }

      image = parsedImageUrl.href;
    } catch {
      $("#formError").textContent =
        "Please enter a valid image URL.";
      return;
    }
  }

  if (!image && editingId) {
    image = getProduct(editingId)?.image || "";
  }

  if (!image) {
    image = fallbackImage();
  }

  const existingProduct = editingId
    ? getProduct(editingId)
    : null;

  const product = {
    id: editingId || createId(),
    name,
    price,
    category,
    seller,
    location,
    facebook,
    description,
    image,
    createdAt: existingProduct?.createdAt || Date.now(),
    demo: false
  };

  if (existingProduct) {
    products = products.map((item) =>
      item.id === editingId ? product : item
    );
  } else {
    products.unshift(product);
  }

  if (!saveProducts()) return;

  closeModal("listingModal");
  renderAll();

  showToast(
    existingProduct
      ? "Listing updated successfully!"
      : "Your listing is now published!"
  );

  $("#seller-dashboard").scrollIntoView({
    behavior: "smooth"
  });
});

/* ---------- SELLER DASHBOARD ---------- */

function renderDashboard() {
  const userProducts = products.filter(
    (product) => !product.demo
  );

  $("#dashTotal").textContent = userProducts.length;
  $("#dashActive").textContent = userProducts.length;
  $("#dashFavorites").textContent = favorites.length;

  const dashboard = $("#dashboardList");

  if (!userProducts.length) {
    dashboard.innerHTML = `
      <div class="dashboard-empty">
        You haven't posted any products yet.
        Select "Add listing" to publish your first item.
      </div>
    `;

    return;
  }

  dashboard.innerHTML = userProducts.map((product) => `
    <div class="dashboard-item">

      <img
        src="${escapeHTML(safeImage(product.image))}"
        alt="${escapeHTML(product.name)}"
        onerror="this.onerror=null;this.src='${fallbackImage()}';">

      <div class="dashboard-item-info">
        <strong>${escapeHTML(product.name)}</strong>

        <span>
          ${formatPrice(product.price)}
          · ${escapeHTML(product.category)}
          · ${escapeHTML(product.location)}
        </span>
      </div>

      <div class="dashboard-item-actions">

        <button
          class="small-btn"
          data-edit="${escapeHTML(product.id)}">
          Edit
        </button>

        <button
          class="small-btn"
          data-view="${escapeHTML(product.id)}">
          View
        </button>

        <button
          class="small-btn delete"
          data-delete="${escapeHTML(product.id)}">
          Delete
        </button>

      </div>
    </div>
  `).join("");
}

/* ---------- DELETE LISTING ---------- */

function deleteListing(id) {
  const product = getProduct(id);

  if (!product) return;

  const confirmed = window.confirm(
    `Delete "${product.name}" from your listings?`
  );

  if (!confirmed) return;

  products = products.filter(
    (item) => item.id !== id
  );

  favorites = favorites.filter(
    (favoriteId) => favoriteId !== id
  );

  saveProducts();
  saveFavorites();

  renderAll();

  showToast("Listing deleted.");
}

/* ---------- EVENT LISTENERS ---------- */

// Open listing form from all sell buttons.

[
  "#openSellBtn",
  "#heroSellBtn",
  "#marketSellBtn",
  "#bannerSellBtn",
  "#dashboardSellBtn",
  "#mobileSellBtn"
].forEach((selector) => {
  const button = $(selector);

  if (button) {
    button.addEventListener("click", () => {
      openListingModal();
    });
  }
});

// Close modal buttons.

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    closeModal(button.dataset.close);
  });
});

// Close modal by clicking outside.

document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      closeModal(backdrop.id);
    }
  });
});

// Close modal with Escape key.

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-backdrop.open").forEach((modal) => {
      closeModal(modal.id);
    });
  }

  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(
      document.activeElement.tagName
    )
  ) {
    event.preventDefault();

    $("#searchInput").focus();

    $("#market").scrollIntoView({
      behavior: "smooth"
    });
  }
});

// Search and sort.

$("#searchInput").addEventListener("input", renderProducts);
$("#sortSelect").addEventListener("change", renderProducts);

// Category selection.

$("#categoryGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");

  if (!button) return;

  selectedCategory = button.dataset.category;
  favoritesOnly = false;

  $("#favoritesNav").innerHTML = "♡ <span>Favorites</span>";

  renderCategories();
  renderProducts();

  $("#market").scrollIntoView({
    behavior: "smooth"
  });
});

$("#filterChips").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");

  if (!button) return;

  selectedCategory = button.dataset.filter;
  favoritesOnly = false;

  $("#favoritesNav").innerHTML = "♡ <span>Favorites</span>";

  renderCategories();
  renderProducts();
});

$("#allCategoriesBtn").addEventListener("click", () => {
  selectedCategory = "All";
  favoritesOnly = false;

  $("#favoritesNav").innerHTML = "♡ <span>Favorites</span>";

  renderCategories();
  renderProducts();

  $("#market").scrollIntoView({
    behavior: "smooth"
  });
});

// Clear filters.

function clearFilters() {
  selectedCategory = "All";
  favoritesOnly = false;

  $("#searchInput").value = "";
  $("#sortSelect").value = "newest";

  $("#favoritesNav").innerHTML = "♡ <span>Favorites</span>";

  renderCategories();
  renderProducts();
}

$("#clearFiltersBtn").addEventListener("click", clearFilters);
$("#emptyClearBtn").addEventListener("click", clearFilters);

// Favorites navigation.

$("#favoritesNav").addEventListener("click", showFavorites);

// Product card actions.

$("#productGrid").addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite]");

  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.favorite);
    return;
  }

  const contactButton = event.target.closest("[data-contact]");

  if (contactButton) {
    contactSeller(contactButton.dataset.contact);
    return;
  }

  const detailsButton = event.target.closest("[data-details]");

  if (detailsButton) {
    showDetails(detailsButton.dataset.details);
  }
});

// Product details modal contact button.

$("#detailsContent").addEventListener("click", (event) => {
  const contactButton = event.target.closest("[data-contact]");

  if (contactButton) {
    contactSeller(contactButton.dataset.contact);
  }
});

// Dashboard actions.

$("#dashboardList").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");

  if (editButton) {
    const product = getProduct(editButton.dataset.edit);

    if (product) {
      openListingModal(product);
    }

    return;
  }

  const viewButton = event.target.closest("[data-view]");

  if (viewButton) {
    showDetails(viewButton.dataset.view);
    return;
  }

  const deleteButton = event.target.closest("[data-delete]");

  if (deleteButton) {
    deleteListing(deleteButton.dataset.delete);
  }
});

// Mobile menu.

$("#mobileMenuBtn").addEventListener("click", () => {
  $("#mobileNav").classList.toggle("open");
});

$("#mobileNav").addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    $("#mobileNav").classList.remove("open");
  }
});

/* ---------- INITIALIZE ---------- */

function renderAll() {
  renderCategories();
  renderProducts();
  renderDashboard();
}

$("#currentYear").textContent = new Date().getFullYear();

renderAll();

console.log("MARKETHUB ready — no default products loaded.");
