// Browser testing mock data
const mockCategories = [
    { label: "Main Menu", tabs: [] },
    { label: "Self Menu", tabs: [] },
    { label: "Player Exploits", tabs: [] },
    { label: "Weapon Mods", tabs: [] },
    { label: "Visuals", tabs: [] }
];

const mockElements = {
    0: [
        { label: "Self Menu", type: "button", action: "self" },
        { label: "Player Exploits", type: "button", action: "exploits" },
        { label: "Weapon Modifications", type: "button", action: "weapon" },
        { label: "Teleport Options", type: "button", action: "teleport" },
        { label: "Visual Settings", type: "button", action: "visuals" }
    ],
    1: [
        { label: "God Mode", type: "checkbox", checked: true },
        { label: "Semi God Mode", type: "checkbox", checked: false },
        { label: "Invisible", type: "checkbox", checked: false },
        { label: "Infinite Stamina", type: "checkbox", checked: true }
    ],
    2: [
        { label: "Kill Aura", type: "checkbox", checked: false },
        { label: "Crash Player", type: "button" },
        { label: "Troll Option", type: "scrollable", values: ["Freeze", "Explode", "Clown"], value: 1 }
    ],
    3: [
        { label: "Give All Weapons", type: "button" },
        { label: "No Recoil", type: "checkbox", checked: true },
        { label: "Rapid Fire", type: "slider", min: 1, max: 10, value: 5 }
    ],
    4: [
        { label: "ESP Box", type: "checkbox", checked: true },
        { label: "ESP Skeleton", type: "checkbox", checked: false },
        { label: "Chams Color", type: "scrollable", values: ["Red", "Green", "Blue", "Rainbow"], value: 0 }
    ]
};

let categories = [];
let categoryIndex = 0;
let menuItems = [];
let selectedIndex = 0;

const menuListEl = document.getElementById("menu-list");
const counterEl = document.getElementById("menu-counter");
const categoryNameEl = document.querySelector(".category-name");

// FiveM browser environment fallback detection
if (typeof GetParentResourceName === 'undefined') {
    window.GetParentResourceName = () => "my_nui_resource";
    document.body.style.display = "block";
    
    // Load mock data
    categories = mockCategories;
    categoryIndex = 0;
    menuItems = mockElements[categoryIndex];
    selectedIndex = 0;
}

// Render menu items dynamically based on their type
function renderMenu() {
    menuListEl.innerHTML = "";
    
    // Update active tab label
    if (categories && categories[categoryIndex]) {
        categoryNameEl.textContent = categories[categoryIndex].label;
    } else {
        categoryNameEl.textContent = "Main Menu";
    }

    if (!menuItems || menuItems.length === 0) {
        menuListEl.innerHTML = `<li class="menu-item" style="color: #64748b; text-align: center;">Empty Tab</li>`;
        updateCounter();
        return;
    }

    menuItems.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "menu-item" + (index === selectedIndex ? " active" : "");
        
        let controlHTML = "";
        
        // Render control based on element type
        if (item.type === "checkbox" || item.type === "scrollable-checkbox" || item.type === "slider-checkbox") {
            const statusColor = item.checked ? "#10b981" : "#ef4444";
            const statusShadow = item.checked ? "0 0 6px #10b981" : "0 0 6px #ef4444";
            controlHTML = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor}; box-shadow: ${statusShadow}; margin-right: 4px;"></span>`;
        } else if (item.type === "scrollable") {
            const val = item.values && item.values[item.value] ? item.values[item.value] : (item.value || "");
            controlHTML = `<span style="color: #64748b; font-size: 11px;">&lt; ${val} &gt;</span>`;
        } else if (item.type === "slider") {
            controlHTML = `<span style="color: #ff3e3e; font-size: 11px; font-weight: bold;">[ ${item.value || 0} ]</span>`;
        } else {
            controlHTML = `<span class="item-action-indicator">&gt;</span>`;
        }

        li.innerHTML = `
            <span>${item.label}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
                ${controlHTML}
            </div>
        `;
        
        // Mouse hover handler
        li.addEventListener("mouseenter", () => {
            setSelection(index);
        });

        // Mouse click handler
        li.addEventListener("click", () => {
            triggerAction(index);
        });

        menuListEl.appendChild(li);
    });

    updateCounter();
}

function setSelection(index) {
    if (!menuItems || menuItems.length === 0) return;
    if (index < 0 || index >= menuItems.length) return;
    
    const items = menuListEl.querySelectorAll(".menu-item");
    if (items[selectedIndex]) items[selectedIndex].classList.remove("active");
    
    selectedIndex = index;
    
    if (items[selectedIndex]) {
        items[selectedIndex].classList.add("active");
        items[selectedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    
    updateCounter();
}

function updateCounter() {
    if (!menuItems || menuItems.length === 0) {
        counterEl.textContent = "0 / 0";
    } else {
        counterEl.textContent = `${selectedIndex + 1} / ${menuItems.length}`;
    }
}

function triggerAction(index) {
    const item = menuItems[index];
    if (!item) return;

    if (item.action === "close") {
        closeNUI();
    } else {
        // Post selection to FiveM client Lua
        fetch(`https://${GetParentResourceName()}/menuAction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({ 
                action: item.action || "select", 
                index: index,
                label: item.label
            })
        }).catch(err => console.log('Error triggering action:', err));
    }
}

function closeNUI() {
    fetch(`https://${GetParentResourceName()}/closeNUI`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({})
    }).catch(err => console.log('Error closing NUI:', err));
}

// Category switching handler (E = Left / Prev, Q = Right / Next)
function changeTab(direction) {
    if (direction === "left") {
        // Prev Category
        fetch(`https://${GetParentResourceName()}/prevCategory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({})
        }).catch(() => {});
        
        // Browser fallback navigation
        if (typeof GetParentResourceName === 'undefined' || window.location.hostname === 'itsfrncsa.github.io') {
            categoryIndex = (categoryIndex - 1 + categories.length) % categories.length;
            menuItems = mockElements[categoryIndex] || [];
            selectedIndex = 0;
            renderMenu();
        }
    } else if (direction === "right") {
        // Next Category
        fetch(`https://${GetParentResourceName()}/nextCategory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({})
        }).catch(() => {});

        // Browser fallback navigation
        if (typeof GetParentResourceName === 'undefined' || window.location.hostname === 'itsfrncsa.github.io') {
            categoryIndex = (categoryIndex + 1) % categories.length;
            menuItems = mockElements[categoryIndex] || [];
            selectedIndex = 0;
            renderMenu();
        }
    }
}

// Keyboard Navigation Listener
window.addEventListener("keydown", function(event) {
    if (document.body.style.display !== "block") return;

    switch (event.key) {
        case "ArrowUp":
            event.preventDefault();
            let prevIndex = selectedIndex - 1;
            if (prevIndex < 0) prevIndex = menuItems.length - 1;
            setSelection(prevIndex);
            break;
        case "ArrowDown":
            event.preventDefault();
            let nextIndex = selectedIndex + 1;
            if (nextIndex >= menuItems.length) nextIndex = 0;
            setSelection(nextIndex);
            break;
        case "Enter":
            event.preventDefault();
            triggerAction(selectedIndex);
            break;
        case "Escape":
        case "Backspace":
            event.preventDefault();
            closeNUI();
            break;
        // User requested E for Left/Prev tab, Q for Right/Next tab
        case "e":
        case "E":
            event.preventDefault();
            changeTab("left");
            break;
        case "q":
        case "Q":
            event.preventDefault();
            changeTab("right");
            break;
    }
});

// Listen for dynamic messages from Lua
window.addEventListener('message', function(event) {
    let item = event.data;

    // Handle local NUI resource toggle command (/opennui)
    if (item.type === "ui") {
        if (item.status === true) {
            document.body.style.display = "block";
            // Ensure we render the current options/mock data
            renderMenu();
            setSelection(selectedIndex);
        } else {
            document.body.style.display = "none";
        }
        return;
    }

    if (item.action === "showUI") {
        if (item.visible === true) {
            document.body.style.display = "block";
            if (item.elements) menuItems = item.elements;
            if (item.categories) categories = item.categories;
            if (item.categoryIndex !== undefined) categoryIndex = item.categoryIndex;
            selectedIndex = item.index !== undefined ? item.index : 0;
            renderMenu();
            setSelection(selectedIndex);
        } else {
            document.body.style.display = "none";
        }
    } else if (item.action === "updateElements") {
        if (item.elements) menuItems = item.elements;
        if (item.categories) categories = item.categories;
        if (item.categoryIndex !== undefined) categoryIndex = item.categoryIndex;
        selectedIndex = item.index !== undefined ? item.index : selectedIndex;
        renderMenu();
        setSelection(selectedIndex);
    } else if (item.action === "keydown") {
        selectedIndex = item.index !== undefined ? item.index : selectedIndex;
        setSelection(selectedIndex);
    } else if (item.action === "updateAuthFooter") {
        const statusEl = document.querySelector(".footer-status");
        if (statusEl && item.username) {
            statusEl.textContent = `./cracked for | ${item.username}`;
        }
    }
});

// Initial Render
renderMenu();
