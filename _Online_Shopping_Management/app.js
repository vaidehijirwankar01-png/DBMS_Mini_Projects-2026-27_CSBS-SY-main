// State Management
let cart = [];
let allProducts = [];
let customerId = localStorage.getItem('customer_id') || 1;
let customerName = localStorage.getItem('customer_name') || 'Test User';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupUserBadge();
  loadCategories();
  loadAddresses();
  loadProducts();

  // Attach search and filter listeners
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(loadProducts, 250));
  }

  const categorySelect = document.getElementById('categorySelect');
  if (categorySelect) {
    categorySelect.addEventListener('change', loadProducts);
  }
});

function setupUserBadge() {
  const userNameEl = document.getElementById('userName');
  if (userNameEl) {
    userNameEl.textContent = `${customerName} (ID: ${customerId})`;
  }
}

// Debounce helper
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Toast helper
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = isError ? '#ef4444' : '#1e293b';
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}

// 1. Load Categories
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    
    const catSelect = document.getElementById('categorySelect');
    const newProdCatSelect = document.getElementById('newProductCategory');

    if (catSelect) {
      catSelect.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('');
    }

    if (newProdCatSelect) {
      newProdCatSelect.innerHTML = categories.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

// 2. Load Customer Addresses
async function loadAddresses() {
  const addressSelect = document.getElementById('addressSelect');
  if (!addressSelect) return;

  try {
    const res = await fetch(`/api/addresses/${customerId}`);
    const addresses = await res.json();

    if (addresses.length > 0) {
      addressSelect.innerHTML = addresses.map(a => `
        <option value="${a.address_id}">
          #${a.address_id}: ${a.street}, ${a.city}, ${a.state} (${a.pincode})
        </option>
      `).join('');
    } else {
      addressSelect.innerHTML = '<option value="1">Default Address (ID: 1)</option>';
    }
  } catch (err) {
    console.error('Failed to load addresses', err);
    addressSelect.innerHTML = '<option value="1">Default Address (ID: 1)</option>';
  }
}

// 3. Load Products
async function loadProducts() {
  const container = document.getElementById('productsContainer');
  if (!container) return;

  const searchInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categorySelect');

  const q = searchInput ? encodeURIComponent(searchInput.value.trim()) : '';
  const cat = categorySelect ? encodeURIComponent(categorySelect.value) : '';

  try {
    const res = await fetch(`/api/products?q=${q}&category=${cat}`);
    const products = await res.json();
    allProducts = products;

    // Populate review product dropdown
    const reviewProdSelect = document.getElementById('reviewProductSelect');
    if (reviewProdSelect) {
      reviewProdSelect.innerHTML = products.map(p => `<option value="${p.product_id}">${p.product_name}</option>`).join('');
    }

    if (!Array.isArray(products) || products.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">No products found matching your search.</div>';
      return;
    }

    container.innerHTML = products.map(p => {
      const isOutOfStock = p.stock_qty <= 0;
      const isLowStock = p.stock_qty > 0 && p.stock_qty < 10;
      const stockBadge = isOutOfStock
        ? '<span class="stock-tag out">⚠️ Out of Stock</span>'
        : isLowStock
        ? `<span class="stock-tag low">⚡ Only ${p.stock_qty} left!</span>`
        : `<span class="stock-tag">✓ In Stock (${p.stock_qty})</span>`;

      return `
        <div class="product-card">
          <span class="product-badge">${escapeHtml(p.category_name)}</span>
          <h4 class="product-title">${escapeHtml(p.product_name)}</h4>
          <p class="product-desc">${escapeHtml(p.description || 'No description provided')}</p>
          
          <div style="margin-bottom: 10px;">
            ${stockBadge}
          </div>

          <div class="product-footer">
            <span class="product-price">₹${Number(p.price).toFixed(2)}</span>
            <button 
              class="btn" 
              ${isOutOfStock ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} 
              onclick="addToCart(${p.product_id}, '${escapeQuote(p.product_name)}', ${p.price}, ${p.stock_qty})">
              Add +
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load products', err);
    container.innerHTML = '<div style="color: var(--danger); padding: 20px;">Failed to load products. Check MySQL server connection.</div>';
  }
}

// 4. Cart Logic
function addToCart(productId, name, price, stockQty) {
  const existing = cart.find(item => item.product_id === productId);

  if (existing) {
    if (existing.quantity >= stockQty) {
      showToast(`Cannot add more. Only ${stockQty} items available in stock.`, true);
      return;
    }
    existing.quantity++;
  } else {
    if (stockQty <= 0) {
      showToast('Item is out of stock!', true);
      return;
    }
    cart.push({
      product_id: productId,
      name: name,
      price: Number(price),
      maxStock: stockQty,
      quantity: 1
    });
  }

  renderCart();
  showToast(`Added "${name}" to cart`);
}

function updateQuantity(productId, delta) {
  const item = cart.find(i => i.product_id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity > item.maxStock) {
    item.quantity = item.maxStock;
    showToast(`Reached maximum available stock (${item.maxStock})`, true);
  }

  if (item.quantity <= 0) {
    cart = cart.filter(i => i.product_id !== productId);
  }

  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.product_id !== productId);
  renderCart();
}

function renderCart() {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartBadge = document.getElementById('cartCountBadge');

  if (!cartItemsContainer || !cartTotalEl) return;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartBadge) cartBadge.textContent = `${totalItems} items`;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px 0;">Your cart is empty.</p>';
    cartTotalEl.textContent = '₹0.00';
    return;
  }

  let totalAmount = 0;
  cartItemsContainer.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    totalAmount += itemTotal;
    return `
      <div class="cart-item">
        <div style="flex: 1; padding-right: 8px;">
          <strong>${escapeHtml(item.name)}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            ₹${item.price.toFixed(2)} × ${item.quantity} = ₹${itemTotal.toFixed(2)}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem;" onclick="updateQuantity(${item.product_id}, -1)">-</button>
          <span style="font-weight: 600; min-width: 18px; text-align: center;">${item.quantity}</span>
          <button class="btn btn-secondary" style="padding: 2px 8px; font-size: 0.8rem;" onclick="updateQuantity(${item.product_id}, 1)">+</button>
          <button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.8rem; margin-left: 4px;" onclick="removeFromCart(${item.product_id})">✕</button>
        </div>
      </div>
    `;
  }).join('');

  cartTotalEl.textContent = `₹${totalAmount.toFixed(2)}`;
}

// 5. Checkout Transaction (ACID Route)
async function checkoutOrder() {
  if (cart.length === 0) {
    showToast('Your shopping cart is empty!', true);
    return;
  }

  const addressSelect = document.getElementById('addressSelect');
  const paymentMethodSelect = document.getElementById('paymentMethod');
  const checkoutBtn = document.getElementById('checkoutBtn');

  const addressId = addressSelect ? addressSelect.value : 1;
  const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : 'UPI';

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Processing Transaction (ACID)...';

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: Number(customerId),
        address_id: Number(addressId),
        method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      })
    });

    const result = await response.json();

    if (response.ok) {
      showToast(`🎉 Order #${result.order_id} placed successfully! Tracking: ${result.tracking_no}`);
      cart = [];
      renderCart();
      loadProducts(); // Refresh stock numbers live
    } else {
      showToast(`❌ Error: ${result.error}`, true);
    }
  } catch (err) {
    console.error('Checkout error:', err);
    showToast('Network error while placing order.', true);
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = '⚡ Place Order (ACID Transaction)';
  }
}

// 6. Review Modal
function openReviewModal() {
  document.getElementById('reviewModal').classList.add('active');
}

function openAddProductModal() {
  document.getElementById('addProductModal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function submitReview(e) {
  e.preventDefault();
  const productId = document.getElementById('reviewProductSelect').value;
  const rating = document.getElementById('reviewRating').value;
  const comment = document.getElementById('reviewComment').value;

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: Number(customerId),
        product_id: Number(productId),
        rating: Number(rating),
        comment
      })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('⭐ Review submitted successfully!');
      closeModal('reviewModal');
      document.getElementById('reviewForm').reset();
    } else {
      showToast(data.error, true);
    }
  } catch (err) {
    showToast('Failed to submit review', true);
  }
}

async function submitNewProduct(e) {
  e.preventDefault();
  const category_id = document.getElementById('newProductCategory').value;
  const product_name = document.getElementById('newProductName').value;
  const price = document.getElementById('newProductPrice').value;
  const stock_qty = document.getElementById('newProductStock').value;
  const description = document.getElementById('newProductDesc').value;

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id, product_name, price, stock_qty, description })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('✅ Product added successfully!');
      closeModal('addProductModal');
      document.getElementById('addProductForm').reset();
      loadProducts();
    } else {
      showToast(data.error, true);
    }
  } catch (err) {
    showToast('Failed to add product', true);
  }
}

// Sanitization helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function escapeQuote(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'");
}
