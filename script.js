// ==========================================
// 1. الثوابت والإعدادات الرئيسية
// ==========================================
// استبدلي هذا الرابط برابط الـ Apps Script الخاص بملف الشيت تبعك
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyuy_ysXbnnbsAanEyNtccX0iiwKd6FGZIHy9YAC0zvejsvz1Bj_EZ-G3Rn5J9zPxsN/exec";

const DEFAULT_PRICE = 2.50;
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80";

let menuItems = [];
let cart = [];

// ==========================================
// 2. جلب البيانات من Google Sheets
// ==========================================
async function fetchMenuItems() {
    const container = document.getElementById("menuContainer");

    // جلب البيانات المخزنة محلياً لفتح المنيو بشكل فوري وسريع
    const cachedData = localStorage.getItem("menuData");
    if (cachedData) {
        try {
            menuItems = JSON.parse(cachedData);
            displayMenuItems(menuItems);
        } catch (e) {
            console.error("خطأ في قراءة الكاش", e);
        }
    } else if (container) {
        container.innerHTML = "<p style='text-align:center; grid-column: 1/-1; padding: 20px;'>جاري تحميل المنيو...</p>";
    }

    try {
        const response = await fetch(GOOGLE_SHEET_URL, { redirect: "follow" });
        const data = await response.json();

        const newMenuItems = data.map((item, index) => {
            const findKey = (keyName) => {
                const found = Object.keys(item).find(k => k.toLowerCase().trim() === keyName.toLowerCase().trim());
                return found ? item[found] : null;
            };

            const name = findKey("ItemName") || findKey("Name") || "صنف بدون اسم";
            const category = findKey("Category") || "all";
            const price = findKey("Price") || DEFAULT_PRICE;
            const image = findKey("ImageUrl") || findKey("Image") || DEFAULT_IMAGE;

            return {
                id: index + 1,
                name: String(name),
                category: String(category).trim().toLowerCase(),
                price: parseFloat(price) || DEFAULT_PRICE,
                image: (image && String(image).trim() !== "") ? String(image).trim() : DEFAULT_IMAGE
            };
        });

        menuItems = newMenuItems;
        localStorage.setItem("menuData", JSON.stringify(menuItems));
        displayMenuItems(menuItems);

    } catch (error) {
        console.error("خطأ في تحميل المنيو من الشيت:", error);
    }
}

// ==========================================
// 3. عرض المنيو والفلترة
// ==========================================
function displayMenuItems(items) {
    const container = document.getElementById("menuContainer");
    if (!container) return;
    
    container.innerHTML = "";

    if (items.length === 0) {
        container.innerHTML = "<p style='text-align:center; grid-column: 1/-1; padding: 20px;'>لا توجد عناصر متاحة حالياً.</p>";
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card";
        card.innerHTML = `
            <div class="card-image-container">
                <img src="${item.image}" alt="${item.name}" class="item-img" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_IMAGE}';">
            </div>
            <div class="card-body">
                <h3>${item.name}</h3>
                <span class="item-price">${item.price.toFixed(2)} د.أ</span>
                <button class="add-to-cart-btn" onclick="addToCart(${item.id})">إضافة للسلة +</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterCategory(category, event) {
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    }

    const selectedCategory = String(category).toLowerCase().trim();

    if (selectedCategory === 'all') {
        displayMenuItems(menuItems);
    } else {
        const filtered = menuItems.filter(item => item.category === selectedCategory);
        displayMenuItems(filtered);
    }
}

// ==========================================
// 4. إدارة السلة
// ==========================================
function addToCart(id) {
    const item = menuItems.find(prod => prod.id === id);
    if (!item) return;

    const cartItem = cart.find(prod => prod.id === id);

    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    updateCartUI();
}

function changeQuantity(id, change) {
    const cartItem = cart.find(prod => prod.id === id);
    if (cartItem) {
        cartItem.quantity += change;
        if (cartItem.quantity <= 0) {
            cart = cart.filter(prod => prod.id !== id);
        }
    }
    updateCartUI();
}

function updateCartUI() {
    const cartContainer = document.getElementById("cartItemsContainer");
    const cartCount = document.getElementById("cartCount");
    const totalAmount = document.getElementById("totalAmount");

    if (!cartContainer) return;

    cartContainer.innerHTML = "";
    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        cartContainer.innerHTML = `<p class="empty-msg">السلة فارغة حالياً</p>`;
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            count += item.quantity;

            const cartRow = document.createElement("div");
            cartRow.className = "cart-item";
            cartRow.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <span class="cart-item-price">${item.quantity}x (${item.price.toFixed(2)} د.أ) = <b>${itemTotal.toFixed(2)} د.أ</b></span>
                </div>
                <div class="quantity-controls">
                    <button onclick="changeQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQuantity(${item.id}, 1)">+</button>
                </div>
            `;
            cartContainer.appendChild(cartRow);
        });
    }

    if (cartCount) cartCount.textContent = count;
    if (totalAmount) totalAmount.textContent = `${total.toFixed(2)} د.أ`;
}

function toggleCart() {
    const modal = document.getElementById("cartModal");
    if (modal) modal.classList.toggle("active");
}

// ==========================================
// 5. تهيئة البحث والتشغيل عند التحميل
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const filtered = menuItems.filter(item => item.name.toLowerCase().includes(searchTerm));
            displayMenuItems(filtered);
        });
    }

    fetchMenuItems();
});