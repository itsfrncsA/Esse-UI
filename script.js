const menuItems = [
    { label: "Self Menu", action: "self" },
    { label: "Player Exploits", action: "exploits" },
    { label: "Weapon Modifications", action: "weapon" },
    { label: "Teleport Options", action: "teleport" },
    { label: "Visual Settings", action: "visuals" },
    { label: "Miscellaneous Settings", action: "misc" },
    { label: "Close Menu", action: "close" }
];

let selectedIndex = 0;
const menuListEl = document.getElementById("menu-list");
const counterEl = document.getElementById("menu-counter");

// Initialize menu items dynamically
function renderMenu() {
    menuListEl.innerHTML = "";
    menuItems.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "menu-item" + (index === selectedIndex ? " active" : "");
        li.innerHTML = `
            <span>${item.label}</span>
            <span class="item-action-indicator">&gt;</span>
        `;
        
        // Mouse hover handler
        li.addEventListener("mouseenter", () => {
            setSelection(index);
        });

        // Mouse click handler
        li.addEventListener("click", () => {
            triggerAction(item.action);
        });

        menuListEl.appendChild(li);
    });

    updateCounter();
}

function setSelection(index) {
    if (index < 0 || index >= menuItems.length) return;
    
    // Update active class on elements
    const items = menuListEl.querySelectorAll(".menu-item");
    if (items[selectedIndex]) items[selectedIndex].classList.remove("active");
    
    selectedIndex = index;
    
    if (items[selectedIndex]) {
        items[selectedIndex].classList.add("active");
        // Scroll item into view smoothly if not fully visible
        items[selectedIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    
    updateCounter();
}

function updateCounter() {
    counterEl.textContent = `${selectedIndex + 1} / ${menuItems.length}`;
}

function triggerAction(action) {
    if (action === "close") {
        closeNUI();
    } else {
        // Send selected action to FiveM client
        fetch(`https://${GetParentResourceName()}/menuAction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({ action: action })
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

// Keyboard Navigation Listener
window.addEventListener("keydown", function(event) {
    // Only process inputs if body is visible
    if (document.body.style.display !== "block") return;

    switch (event.key) {
        case "ArrowUp":
            event.preventDefault();
            let prevIndex = selectedIndex - 1;
            if (prevIndex < 0) prevIndex = menuItems.length - 1; // Loop back
            setSelection(prevIndex);
            break;
        case "ArrowDown":
            event.preventDefault();
            let nextIndex = selectedIndex + 1;
            if (nextIndex >= menuItems.length) nextIndex = 0; // Loop forward
            setSelection(nextIndex);
            break;
        case "Enter":
            event.preventDefault();
            triggerAction(menuItems[selectedIndex].action);
            break;
        case "Escape":
        case "Backspace":
            event.preventDefault();
            closeNUI();
            break;
    }
});

// Listen for message from client.lua
window.addEventListener('message', function(event) {
    let item = event.data;

    if (item.type === "ui") {
        if (item.status === true) {
            document.body.style.display = "block";
            // Reset selection to first option on open
            setSelection(0);
        } else {
            document.body.style.display = "none";
        }
    }
});

// Initial Render
renderMenu();
