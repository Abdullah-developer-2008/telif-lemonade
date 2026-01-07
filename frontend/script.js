
let currentProduct = {
    name: "Banana Shake",
    price: 12.00,
    img: "images/banana-shake.png",
    flavor: "Banana",
    description: "Pure organic milk blended with fresh sun-ripened bananas."
};

let extraToppings = [];
let cart = [];
const API_BASE = "/api";

// 1. Navigation
function goToSection(index) {
    gsap.to("#main-slider", { x: -index * 100 + "vw", duration: 1.2, ease: "power4.inOut" });
}

// 2. Animation Trigger

function triggerAnim(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('animate-in');
    void el.offsetWidth; // Reflow
    el.classList.add('animate-in');
}

// 3. Shake Data & Logic
const shakeData = {
    banana: { title: "CREAMY <br> BANANA", bg: "#fcf5e5", img: "images/banana-shake.png" },
    mango: { title: "TROPICAL <br> MANGO", bg: "#fff3cc", img: "images/mango-shake.png" },
    berry: { title: "WILD <br> BERRY", bg: "#ffe4e1", img: "images/berry-shake.png" }
};

function changeShake(type) {
    const data = shakeData[type];
    document.getElementById('shake-title').innerHTML = data.title;
    document.getElementById('shake-img').src = data.img;
    triggerAnim('shake-img');

    currentProduct = {
        name: data.title.replace('<br>', ' '),
        price: 12.00,
        img: data.img,
        flavor: type.charAt(0).toUpperCase() + type.slice(1),
        description: document.getElementById('shake-desc').innerText
    };
}

// 4. Juice Data & Logic
const juiceData = {
    orange: { title: "FRESH <br> ORANGE", bg: "#ff9800", img: "images/orange-juice.png", price: "$8.00" },
    apple: { title: "CRISP <br> APPLE", bg: "#8bc34a", img: "images/apple-juice.png", price: "$9.00" },
    watermelon: { title: "SWEET <br> MELON", bg: "#e91e63", img: "images/Melon-juice.png", price: "$10.50" }
};

function changeJuice(type) {
    const data = juiceData[type];
    document.getElementById('juice-title').innerHTML = data.title;
    document.getElementById('juice-price').innerText = data.price;
    document.getElementById('juice-img').src = data.img;

    currentProduct = {
        name: data.title.replace('<br>', ' '),
        price: data.price.replace('$', ''), // Fixed: removes $ so math works
        img: data.img,
        flavor: type,
        description: data.title
    };
    triggerAnim('juice-img');
}

// 5. Cold Drink Logic
const drinkData = {
    sprite: { title: "FRESH <br> SPRITE", desc: "Lemon-lime refreshment.", base: 2.50, img: "images/sprite.png" },
    coke: { title: "CLASSIC <br> COKE", desc: "The original cola taste.", base: 2.50, img: "images/cola.png" },
    fanta: { title: "ORANGE <br> FANTA", desc: "Bright and bubbly orange.", base: 2.50, img: "images/fanta.png" }
};

let currentFlavor = 'sprite';

function changeFlavor(f) {
    currentFlavor = f;
    const data = drinkData[f];
    document.getElementById('drink-title').innerHTML = data.title;
    document.getElementById('drink-desc').innerText = data.desc;
    document.getElementById('drink-img').src = data.img;

    currentProduct = {
        name: data.title.replace('<br>', ' '),
        price: data.base,
        img: data.img,
        flavor: f,
        description: data.desc
    };
    triggerAnim('drink-img');
}

function changeSize(size, btn) {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updatePrice(size);
}

function updatePrice(size) {
    let mult = size === '500ml' ? 1.8 : (size === '1L' ? 2.5 : 1);
    const final = (drinkData[currentFlavor].base * mult).toFixed(2);
    document.getElementById('drink-price').innerText = `$${final}`;
    currentProduct.price = final; // Ensure the size price updates in the cart object
}

// 6. Authentication Logic
function toggleAuth() {
    const modal = document.getElementById('auth-modal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

function showStep(stepId) {
    document.querySelectorAll('.auth-step').forEach(s => s.style.display = 'none');
    document.getElementById(stepId).style.display = 'block';
    
    // Set reset mode based on which path we took
    if (stepId === 'forgot-password-form') isResetMode = true;
    if (stepId === 'signup-form') isResetMode = false;
}
let currentAuthType = 'signup';

async function sendOTP(inputId, type) {
    // Fix for the null error: if inputId is missing (like in Resend), use localStorage
    const emailInput = document.getElementById(inputId);
    const email = emailInput ? emailInput.value : localStorage.getItem('userEmail');
    
    if (!email) return alert("Email not found. Please try again.");

    // Select the correct button to show the spinner
    const btn = type === 'signup' ? document.getElementById('signup-btn') : document.getElementById('forgot-btn');

    // Start Loading State
    if (btn) btn.classList.add('loading');

    try {
        const payload = { email, type };
        if (type === 'signup') {
            const userField = document.getElementById('reg-username');
            payload.username = userField ? userField.value : "";
        }

        const response = await fetch(`${API_BASE}/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('userEmail', email);
            currentAuthType = type;
            showStep('otp-form');
            startResendTimer();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Server error. Check if backend is running.");
    } finally {
        // Stop Loading State
        if (btn) btn.classList.remove('loading');
    }
}

async function resendOTPAction() {
    const timerLink = document.getElementById('timer-link');
    
    // Don't allow resend if timer is still counting
    if (timerLink.classList.contains('disabled')) return;

    // Call sendOTP with null for the ID, and the stored currentAuthType
    await sendOTP(null, currentAuthType);
}


let isResetMode = false;

async function verifyAccount() {
    const email = localStorage.getItem('userEmail');
    const otp = Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');
    const btn = document.getElementById('verify-btn');

    btn.classList.add('loading');

    try {
        // If Reset Mode, we only verify OTP. If Signup, we verify and create user.
        const endpoint = isResetMode ? '/verify-otp-only' : '/verify-otp';
        const payload = isResetMode ? { email, otp } : { 
            email, 
            otp, 
            username: document.getElementById('reg-username').value,
            password: document.getElementById('reg-password').value 
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            if (isResetMode) {
                showStep('reset-final-form');
            } else {
                // AUTO-LOGIN AFTER SIGNUP
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', data.username || document.getElementById('reg-username').value);
                alert("Welcome, " + localStorage.getItem('username'));
                location.reload(); // Refresh to update Nav Bar
            }
        } else {
            alert(data.message);
        }
    } catch (err) { alert("Error connecting to server."); }
    finally { btn.classList.remove('loading'); }
}

// 7. Cart & UI Management
window.addEventListener('DOMContentLoaded', () => {
    updateNavUI();
});

function updateNavUI() {
    const authArea = document.getElementById('auth-nav-area');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn) {
        authArea.innerHTML = `
            <button onclick="toggleCart()">CART <span class="cart-count-badge">${cart.length}</span></button>
            <button onclick="logout()" style="color: #ff4444;">LOGOUT</button>
        `;
    } else {
        authArea.innerHTML = `<button onclick="toggleAuth()">LOGIN</button>`;
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    location.reload();
}

function toggleCart() {
    const cartModal = document.getElementById('cart-modal');
    cartModal.style.display = (cartModal.style.display === 'flex') ? 'none' : 'flex';
    renderCart();
}

function toggleTopping(checkbox) {
    if (checkbox.checked) {
        extraToppings.push(checkbox.value);
    } else {
        extraToppings = extraToppings.filter(t => t !== checkbox.value);
    }
}

// --- FIXED: ADD TO CART FUNCTION ---
function addToCart() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        alert("Login required to add to cart.");
        return toggleAuth();
    }

    const toppingPrice = extraToppings.length * 1.50;
    const basePrice = parseFloat(currentProduct.price);

    // Find if exact item already exists
    const existingItem = cart.find(item =>
        item.flavor === currentProduct.flavor &&
        JSON.stringify(item.toppings) === JSON.stringify(extraToppings)
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...currentProduct,
            toppings: [...extraToppings],
            quantity: 1,
            unitPrice: basePrice + toppingPrice
        });
    }

    // Reset toppings checkboxes
    extraToppings = [];
    document.querySelectorAll('.toppings-grid input').forEach(el => el.checked = false);

    updateNavUI();
    renderCart();
    alert("Added to cart!");
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    list.innerHTML = "";

    let grandTotal = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.unitPrice * item.quantity;
        grandTotal += itemTotal;

        list.innerHTML += `
            <div class="cart-item-detailed" style="display:flex; align-items:center; gap:10px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <img src="${item.img}" style="width:50px; height:50px; object-fit:contain;">
                <div style="flex:1; text-align:left;">
                    <h4 style="margin:0; font-size:14px;">${item.name}</h4>
                    <p style="font-size:10px; color:gray; margin:0;">${item.toppings.join(', ') || 'No toppings'}</p>
                    <div style="font-weight:bold; font-size:13px; color:#008037;">$${itemTotal.toFixed(2)}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button onclick="updateQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <button onclick="removeFromCart(${index})" style="color:red; background:none; border:none; cursor:pointer;">×</button>
            </div>
        `;
    });

    totalEl.innerText = `$${grandTotal.toFixed(2)}`;
    if (cart.length === 0) list.innerHTML = "<p style='text-align:center;'>Empty.</p>";
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateNavUI();
    renderCart();
}

function updateQuantity(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) removeFromCart(index);
    else renderCart();
}

// 8. OTP Helper Logic
function moveFocus(current, nextIndex) {
    if (current.value.length === 1) {
        const inputs = document.querySelectorAll('.otp-input');
        if (inputs[nextIndex]) inputs[nextIndex].focus();
    }
}

let countdownInterval;
let timeLeft = 60;

function startResendTimer() {
    const timerLink = document.getElementById('timer-link');
    timeLeft = 60; // Reset to 60 seconds

    // Clear any existing timer to avoid overlaps
    clearInterval(countdownInterval);

    timerLink.style.cursor = "default";
    timerLink.style.color = "#999";
    timerLink.onclick = null; // Disable clicking

    countdownInterval = setInterval(() => {
        timeLeft--;
        timerLink.innerText = `Wait ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            timerLink.innerText = "Resend Code";
            timerLink.style.color = "#008037"; // Your theme green
            timerLink.style.cursor = "pointer";
            timerLink.onclick = resendOTPAction; // Attach the resend function
        }
    }, 1000);
}

// Function to handle the actual resend click
async function resendOTPAction() {
    // Reset inputs
    document.querySelectorAll('.otp-input').forEach(input => input.value = "");
    // Trigger the original sendOTP logic
    await sendOTP();
}

// 1. Modified Verify: Sends password to backend to be saved
async function verifyAccount() {
    const email = localStorage.getItem('userEmail');
    const password = document.getElementById('reg-password').value; // Get the password
    const otp = Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');

    try {
        const response = await fetch(`${API_BASE}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, password }) // Send password
        });

        if (response.ok) {
            alert("Signup Successful!");
            localStorage.setItem('isLoggedIn', 'true');
            location.reload();
        } else {
            alert("Verification failed.");
        }
    } catch (err) { alert("Server error."); }
}

// 2. New Login Function (No OTP)
async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            alert("Login Successful!");
            location.reload();
        } else {
            alert(data.message);
        }
    } catch (err) { alert("Server not responding."); }
}

// 1. Show/Hide Password Toggle
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

// 2. Updated Login Logic
async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) return alert("Please fill all fields");

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
            alert("Login successful!");
            location.reload();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Server connection error.");
    }
}


// Update your forgot password button to trigger this
async function handleForgotRequest() {
    const email = document.getElementById('forgot-email').value;
    if (!email) return alert("Please enter email");

    try {
        const response = await fetch(`${API_BASE}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            isResetMode = true; // Tell the UI we are resetting, not signing up
            localStorage.setItem('userEmail', email);
            showStep('otp-form');
            alert("Reset code sent!");
        }
    } catch (err) { alert("Error."); }
    body: JSON.stringify({ email, type: 'reset' })
}

// Modify your existing verifyAccount to handle both Signup and Reset

async function verifyAccount() {
    const email = localStorage.getItem('userEmail');
    const otp = Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');
    
    // Determine the type based on which form we came from
    const endpoint = isResetMode ? '/verify-otp-only' : '/verify-otp';
    const password = document.getElementById('reg-password').value;
    const username = document.getElementById('reg-username').value;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, password, username })
        });

        const data = await response.json();

        if (response.ok) {
            if (isResetMode) {
                showStep('reset-final-form'); // Move to the new password form
            } else {
                // SIGNUP SUCCESS: Auto-Login
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', username);
                alert("Account created! Welcome " + username);
                location.reload(); 
            }
        } else {
            alert(data.message);
        }
    } catch (err) { alert("Verification failed"); }
}

async function submitNewPassword() {
    const email = localStorage.getItem('userEmail');
    const newPassword = document.getElementById('new-password-input').value;

    try {
        const response = await fetch(`${API_BASE}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword })
        });

        if (response.ok) {
            alert("Password updated! Logging you in...");
            localStorage.setItem('isLoggedIn', 'true');
            location.reload();
        }
    } catch (err) { alert("Failed to reset password"); }
}

function updateUIForLoggedInUser() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');

    if (isLoggedIn === 'true') {
        document.getElementById('login-nav-btn').style.display = 'none';
        document.getElementById('user-profile').style.display = 'flex';
        document.getElementById('display-username').innerText = `Hi, ${username}`;
    }
}

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');
    if (isLoggedIn === 'true') {
        document.getElementById('nav-login-btn').style.display = 'none';
        document.getElementById('user-profile-nav').style.display = 'flex';
        document.getElementById('nav-username').innerText = username;
    }
}
window.onload = checkLoginStatus;

async function saveNewPassword() {
    const email = localStorage.getItem('userEmail');
    const newPassword = document.getElementById('reset-new-password').value;

    try {
        const response = await fetch(`${API_BASE}/reset-password-final`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword })
        });

        if (response.ok) {
            localStorage.setItem('isLoggedIn', 'true');
            // We need to fetch the username from the server or store it during reset
            alert("Password updated! Logged in successfully.");
            location.reload();
        }
    } catch (err) { alert("Error updating password"); }
}

function logout() {
    localStorage.clear();
    location.reload();
}
function updateNavBar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');
    const authArea = document.getElementById('auth-nav-area');

    if (isLoggedIn === 'true' && authArea) {
        authArea.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; color:white;">
                <span style="color:var(--yellow); font-weight:bold;">Hi, ${username}</span>
                <button onclick="logout()" style="background:#000000; border-radius:20px; padding:5px 10px; font-size:12px;">LOGOUT</button>
            </div>
        `;
    }
}
window.onload = updateNavBar;

let orderMap; // Global variable for the map
let selectedCoords = null;

function proceedToCheckout() {
    // 1. Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
        alert("Please login first to place an order!");
        toggleCart(); // Close cart modal
        toggleAuth(); // Open login modal
        return;
    }

    // 2. Hide Cart items and Total
    document.getElementById('cart-items-list').style.display = 'none';
    document.querySelector('.cart-total').style.display = 'none';
    document.querySelector('.order-btn').style.display = 'none';

    // 3. Show Checkout Section
    document.getElementById('checkout-section').style.display = 'block';

    // 4. Initialize Map (Leaflet)
    // We use a timeout to ensure the div is visible before Leaflet tries to load
    setTimeout(initOrderMap, 300);
}

function initOrderMap() {
    if (orderMap) return; // Don't re-initialize if it exists

    // Set view to your city [Latitude, Longitude]
    orderMap = L.map('map').setView([33.6844, 73.0479], 13); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(orderMap);

    let marker;
    orderMap.on('click', function(e) {
        selectedCoords = e.latlng;
        if (marker) {
            marker.setLatLng(e.latlng);
        } else {
            marker = L.marker(e.latlng).addTo(orderMap);
        }
    });
}

// 2. Finalize Order & Send Email
async function processOrder() {
    const btn = document.getElementById('confirm-order-btn');
    const address1 = document.getElementById('order-address-1').value;
    const phone = document.getElementById('order-phone').value;
    
    const totalElement = document.getElementById('cart-total-price');
    const totalPrice = totalElement ? totalElement.innerText : "$0.00";

    if (!address1 || !phone || !selectedCoords) {
        return alert("Please provide address, phone, and select location on map!");
    }

    btn.classList.add('loading');

    const orderData = {
        email: localStorage.getItem('userEmail'),
        items: cart, 
        total: totalPrice,
        address: `${address1}, ${document.getElementById('order-address-2').value}`,
        phone: phone,
        location: selectedCoords, 
        payment: document.getElementById('payment-method').value
    };

    try {
        const response = await fetch(`${API_BASE}/place-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (response.ok) {
            alert("Order Placed Successfully! Receipt sent to email.");
            // Reset everything
            cart = []; 
            if (typeof updateCartUI === "function") updateCartUI();
            toggleCart();
            location.reload(); 
        } else {
            // This shows the specific error message from the backend
            alert("Order failed: " + (data.message || "Unknown error"));
        }
    } catch (err) {
        console.error("Order process error:", err);
        // This only triggers if the internet is down or the server is off
        alert("Connection error. Please check if your backend is running.");
    } finally {
        btn.classList.remove('loading');
    }
}
function backToCart() {
    document.getElementById('cart-items-list').style.display = 'block';
    document.querySelector('.cart-total').style.display = 'block';
    document.querySelector('.order-btn').style.display = 'block';
    document.getElementById('checkout-section').style.display = 'none';
}

async function showOrderHistory() {
    const email = localStorage.getItem('userEmail');
    const response = await fetch(`${API_BASE}/my-orders/${email}`);
    const orders = await response.json();
    
    console.log("Your past orders:", orders);
    // You can now loop through 'orders' and show them in a list
}

// Function to switch view to Kitchen
function openKitchen() {
    // Hide the main slider and nav (optional)
    const main = document.getElementById('main-slider');
    const kitchen = document.getElementById('kitchen-dashboard');
    
    if(main && kitchen) {
        main.style.display = 'none';
        kitchen.style.display = 'block';
        refreshKitchenDashboard(); // Load the data
        
        // Auto-refresh every 30 seconds to see new orders
        setInterval(refreshKitchenDashboard, 30000);
    }
}

async function refreshKitchenDashboard() {
    try {
        const response = await fetch(`${API_BASE}/all-orders`);
        const orders = await response.json();
        const tableBody = document.getElementById('orders-table-body');
        
        if (orders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:50px;">No orders found in database.</td></tr>`;
            return;
        }

        tableBody.innerHTML = orders.map(order => `
            <tr style="border-bottom: 1px solid #444;">
                <td style="padding: 15px;">${new Date(order.createdAt).toLocaleTimeString()}</td>
                <td>${order.username}</td>
                <td>${order.items.map(i => i.name).join(', ')}</td>
                <td>${order.total}</td>
                <td style="color: orange;">${order.status}</td>
                <td><button onclick="updateOrderStatus('${order._id}', 'Delivered')">Done</button></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Frontend Fetch Error:", err);
    }
}
// Function to update status in Database
async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}/update-order/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            refreshKitchenDashboard(); // Reload table
        }
    } catch (err) {
        alert("Update failed");
    }
}

const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    // Toggle the menu visibility
    navLinks.classList.toggle('active');
    
    // Toggle the hamburger animation
    hamburger.classList.toggle('active');
});

// Close menu when a link is clicked
document.querySelectorAll('.nav-links li').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('active');
    });
});