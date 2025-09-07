// ===== Utilities & Storage =====
const CART_KEY = 'ccc_cart';
const SUBS_KEY = 'ccc_subscribers';
const FEED_KEY = 'ccc_feedback';
const CONTACT_KEY = 'ccc_contacts';
const CUSTOM_KEY = 'ccc_custom_orders';

// session storage example: last visited page
try { sessionStorage.setItem('ccc_last_page', location.pathname); } catch (e) {}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ===== Cart Logic =====
function getCart() { return readJSON(CART_KEY, []); }
function setCart(items) { writeJSON(CART_KEY, items); updateCartUI(); }

function addToCart(name, price, qty = 1) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.name === name);
  if (idx >= 0) cart[idx].qty += qty;
  else cart.push({ name, price: Number(price), qty });
  setCart(cart);
  toast(`Added: ${name}`);
}

function removeFromCart(name) {
  const cart = getCart().filter(i => i.name !== name);
  setCart(cart);
}

function changeQty(name, delta) {
  const cart = getCart().map(i => i.name === name ? { ...i, qty: Math.max(1, i.qty + delta) } : i);
  setCart(cart);
}

function cartTotal(items = getCart()) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function updateCartUI() {
  const cart = getCart();
  const countEl = document.getElementById('cartCount');
  if (countEl) countEl.textContent = cart.reduce((n, i) => n + i.qty, 0);

  const itemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!itemsEl || !totalEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="text-muted">Your cart is empty.</p>';
    totalEl.textContent = '$0.00';
    return;
  }

  itemsEl.innerHTML = cart.map(i => `
    <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
      <div>
        <div class="fw-semibold">${i.name}</div>
        <div class="small text-muted">$${i.price.toFixed(2)} × ${i.qty}</div>
      </div>
      <div class="btn-group" role="group" aria-label="Change quantity">
        <button class="btn btn-outline-secondary btn-sm" data-qty="-1" data-name="${i.name}">−</button>
        <button class="btn btn-outline-secondary btn-sm" data-qty="+1" data-name="${i.name}">+</button>
        <button class="btn btn-outline-danger btn-sm" data-remove="${i.name}">Remove</button>
      </div>
    </div>
  `).join('');

  totalEl.textContent = `$${cartTotal(cart).toFixed(2)}`;
}

// Handle cart button clicks inside offcanvas
document.addEventListener('click', (e) => {
  const minus = e.target.closest('[data-qty="-1"]');
  const plus = e.target.closest('[data-qty="+1"]');
  const remove = e.target.closest('[data-remove]');
  const addBtn = e.target.closest('.add-to-cart');

  if (addBtn) {
    const { name, price } = addBtn.dataset;
    addToCart(name, parseFloat(price));
  }
  if (minus) changeQty(minus.dataset.name, -1);
  if (plus) changeQty(plus.dataset.name, +1);
  if (remove) removeFromCart(remove.dataset.remove);
});

// Checkout (demo)
document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const cart = getCart();
      if (cart.length === 0) return;
      writeJSON('ccc_last_checkout', { when: new Date().toISOString(), cart });
      setCart([]); // clears and updates UI
      toast('Thanks! Your order was received.');
      const offcanvasEl = document.getElementById('cartDrawer');
      if (offcanvasEl) bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl).hide();
    });
  }

  // Subscribe
  const subForm = document.getElementById('subscribeForm');
  if (subForm) {
    subForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!subForm.checkValidity()) { subForm.classList.add('was-validated'); return; }
      const email = document.getElementById('subEmail').value.trim();
      const subs = readJSON(SUBS_KEY, []);
      if (!subs.includes(email)) subs.push(email);
      writeJSON(SUBS_KEY, subs);
      toast('Subscribed!');

      // Close modal
      const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('subscribeModal'));
      modal.hide();
      subForm.reset();
      subForm.classList.remove('was-validated');
    });
  }

  // Contact form (stored to localStorage)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!contactForm.checkValidity()) { contactForm.classList.add('was-validated'); return; }
      const entry = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        message: document.getElementById('message').value.trim(),
        ts: new Date().toISOString()
      };
      const arr = readJSON(CONTACT_KEY, []);
      arr.push(entry);
      writeJSON(CONTACT_KEY, arr);
      toast('Message sent!');
      contactForm.reset();
      contactForm.classList.remove('was-validated');
    });
  }

  // Feedback (list + store)
  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackList = document.getElementById('feedbackList');
  if (feedbackForm && feedbackList) {
    function renderFeedback() {
      const items = readJSON(FEED_KEY, []);
      feedbackList.innerHTML = items.length
        ? items.slice().reverse().map(f => `<li class="list-group-item"><strong>${f.rating}</strong> — ${f.text}</li>`).join('')
        : '<li class="list-group-item text-muted">No feedback yet.</li>';
    }
    renderFeedback();

    feedbackForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!feedbackForm.checkValidity()) { feedbackForm.classList.add('was-validated'); return; }
      const entry = {
        rating: document.getElementById('rating').value,
        text: document.getElementById('feedback').value.trim(),
        ts: new Date().toISOString()
      };
      const arr = readJSON(FEED_KEY, []);
      arr.push(entry);
      writeJSON(FEED_KEY, arr);
      renderFeedback();
      feedbackForm.reset();
      feedbackForm.classList.remove('was-validated');
      toast('Thanks for your feedback!');
    });
  }

  // Custom orders
  const coForm = document.getElementById('customOrderForm');
  const coTable = document.getElementById('customOrdersTable');
  if (coForm && coTable) {
    function renderCustomOrders() {
      const rows = readJSON(CUSTOM_KEY, []).map((o, idx) => `
        <tr>
          <td>${o.name}</td>
          <td>${o.phone}</td>
          <td>${o.drink}</td>
          <td>${o.qty}</td>
          <td>${o.notes || ''}</td>
          <td class="text-nowrap">
            <button class="btn btn-sm btn-outline-primary" data-co-add="${idx}">Add to Cart</button>
            <button class="btn btn-sm btn-outline-danger" data-co-del="${idx}">Delete</button>
          </td>
        </tr>
      `).join('');
      coTable.querySelector('tbody').innerHTML = rows || `<tr><td colspan="6" class="text-muted">No custom orders saved.</td></tr>`;
    }
    renderCustomOrders();

    coForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!coForm.checkValidity()) { coForm.classList.add('was-validated'); return; }
      const entry = {
        name: document.getElementById('coName').value.trim(),
        phone: document.getElementById('coPhone').value.trim(),
        drink: document.getElementById('coDrink').value,
        qty: Math.max(1, parseInt(document.getElementById('coQuantity').value || '1', 10)),
        notes: document.getElementById('coNotes').value.trim()
      };
      const arr = readJSON(CUSTOM_KEY, []);
      arr.push(entry);
      writeJSON(CUSTOM_KEY, arr);
      renderCustomOrders();
      coForm.reset();
      coForm.classList.remove('was-validated');
      toast('Custom order saved.');
    });

    // Quick add current form to cart
    const quickAdd = document.getElementById('addCustomToCart');
    if (quickAdd) {
      quickAdd.addEventListener('click', () => {
        if (!coForm.checkValidity()) { coForm.classList.add('was-validated'); return; }
        const drink = document.getElementById('coDrink').value;
        const qty = Math.max(1, parseInt(document.getElementById('coQuantity').value || '1', 10));
        // Demo price map
        const prices = { 'Americano': 3, 'Cappuccino': 4, 'Earl Grey': 3.25, 'Mocha Frappe': 4.75, 'Vanilla Latte': 4.5, 'Cold Brew': 3.75 };
        addToCart(`${drink} (Custom)`, prices[drink] ?? 4, qty);
      });
    }

    // Table actions
    coTable.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-co-add]');
      const delBtn = e.target.closest('[data-co-del]');
      const arr = readJSON(CUSTOM_KEY, []);
      if (addBtn) {
        const i = parseInt(addBtn.dataset.coAdd, 10);
        const item = arr[i];
        if (item) {
          const prices = { 'Americano': 3, 'Cappuccino': 4, 'Earl Grey': 3.25, 'Mocha Frappe': 4.75, 'Vanilla Latte': 4.5, 'Cold Brew': 3.75 };
          addToCart(`${item.drink} (Custom)`, prices[item.drink] ?? 4, item.qty);
        }
      }
      if (delBtn) {
        const i = parseInt(delBtn.dataset.coDel, 10);
        arr.splice(i, 1);
        writeJSON(CUSTOM_KEY, arr);
        renderCustomOrders();
      }
    });
  }

});

// ===== Add-to-cart buttons on Menu page =====
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      addToCart(name, price, 1);
    });
  });
});

// ===== Bootstrap form validation helper =====
(function () {
  'use strict';
  document.addEventListener('submit', function (event) {
    const form = event.target;
    if (form.classList.contains('needs-validation')) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }
  }, true);
})();

// ===== Simple Toast using Bootstrap =====
function toast(message) {
  // Create a toast container if not present
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = 1080;
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'toast align-items-center text-bg-dark border-0';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  container.appendChild(el);
  const t = new bootstrap.Toast(el, { delay: 2000 });
  t.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}
