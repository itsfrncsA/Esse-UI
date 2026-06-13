// ==================== SHINIGAMI ESSE - PARANOIA MENU ====================
(function () {
    // Demo Data (only used when testing in browser)
    const demoCategories = [
        { label: "List" },
        { label: "Safe" },
        { label: "Trolling" },
        { label: "Risky" },
        { label: "Vehicle" },
        { label: "ALL" }
    ];

    const demoMenuItems = [
        { label: "Teleport to Player", type: "button" },
        { label: "Spectate Player", type: "checkbox", checked: true },
        { label: "Copy Appearance", type: "button" },
        { label: "Kill Player", type: "button" },
        { label: "Launch Player (V1)", type: "button" },
        { label: "Bug Player", type: "scrollable", values: ["Bug Player I", "Bug Player II", "Bug Player III", "Bug Player IV", "Bug Player V"], value: 1 },
        { type: "divider", label: "Navigation" },
        { label: "Waypoint to Player", type: "button" },
        { label: "Track Player (Blip)", type: "checkbox", checked: false }
    ];

    // State
    let currentCategories = demoCategories;
    let currentCategoryIndex = 0;
    let currentMenuItems = demoMenuItems;
    let selectedIndex = 0;
    let isSelectingKey = false;
    let pendingKeyCallback = null;

    // DOM Elements
    const mainMenu = document.getElementById("mainMenu");
    const categoryTabsContainer = document.getElementById("categoryTabs");
    const menuListEl = document.getElementById("menuList");
    const footerCreditSpan = document.getElementById("footerCredit");
    const itemCounterSpan = document.getElementById("itemCounter");
    const keySelectorOverlay = document.getElementById("keySelectorOverlay");
    const keyDisplay = document.getElementById("keyDisplay");
    const keyboardOverlay = document.getElementById("keyboardOverlay");
    const keyboardTitle = document.getElementById("keyboardTitle");
    const keyboardValue = document.getElementById("keyboardValue");
    const menuBanner = document.getElementById("menuBanner");
    const bannerImage = document.getElementById("bannerImage");
    const notificationContainer = document.getElementById("notificationContainer");

    // ==================== HELPER FUNCTIONS ====================

    // Get parent resource for FiveM NUI callbacks
    const getParentResource = () => {
        return window.GetParentResourceName ? window.GetParentResourceName() : "shinigami_esse";
    };

    // Check if running inside FiveM (NUI or DUI)
    const isInFiveM = () => {
        return window.location.protocol !== 'file:';
    };

    // Send NUI callback to Lua (only works in standard NUI, not DUI)
    function emitToClient(actionType, extraData = {}) {
        const currentItem = currentMenuItems[selectedIndex] || null;
        const payload = {
            action: actionType,
            categoryIndex: currentCategoryIndex,
            selectedIndex: selectedIndex,
            ...extraData
        };
        if (currentItem) {
            payload.itemLabel = currentItem.label;
            payload.itemType = currentItem.type;
            if (currentItem.type === 'checkbox') payload.checked = currentItem.checked;
            if (currentItem.type === 'scrollable') payload.scrollValue = currentItem.value;
            if (currentItem.type === 'slider') payload.sliderValue = currentItem.value;
        }

        if (window.GetParentResourceName) {
            fetch(`https://${getParentResource()}/menuAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify(payload)
            }).catch(() => { });
        } else {
            console.log("[Menu Action]", actionType, payload);
        }
    }

    // ==================== NOTIFICATIONS ====================
    function showNotification(type, title, desc, duration) {
        const notif = document.createElement('div');
        notif.className = `notification ${type || 'info'}`;

        let html = '';
        if (title) html += `<div class="notification-title">${title}</div>`;
        if (desc) html += `<div class="notification-desc">${desc}</div>`;
        if (!title && !desc) html = `<div class="notification-desc">${type}</div>`;
        notif.innerHTML = html;

        notificationContainer.appendChild(notif);

        const timeout = duration || 3000;
        setTimeout(() => {
            notif.style.animation = 'notifFadeOut 0.3s ease forwards';
            setTimeout(() => notif.remove(), 300);
        }, timeout);
    }

    // ==================== KEYBOARD INPUT ====================
    function showKeyboard(title, value) {
        keyboardTitle.textContent = title || "INPUT";
        keyboardValue.textContent = value || "";
        keyboardOverlay.style.display = "flex";
    }

    function hideKeyboard() {
        keyboardOverlay.style.display = "none";
    }

    function updateKeyboardValue(value) {
        keyboardValue.textContent = value || "";
    }

    // ==================== KEY SELECTOR ====================
    function showKeySelector(callback) {
        isSelectingKey = true;
        pendingKeyCallback = callback;
        keySelectorOverlay.style.display = "flex";
        keyDisplay.innerHTML = `<span class="key-placeholder">⌨️</span>`;
        keyDisplay.classList.remove('has-key');
    }

    function hideKeySelector() {
        isSelectingKey = false;
        keySelectorOverlay.style.display = "none";
        pendingKeyCallback = null;
    }

    function onKeySelected(key) {
        if (pendingKeyCallback) {
            pendingKeyCallback(key);
        }
        hideKeySelector();
    }

    // ==================== COUNTER ====================
    function updateCounter() {
        if (!currentMenuItems.length) {
            itemCounterSpan.innerText = "0/0";
            return;
        }
        const visibleItems = currentMenuItems.filter(item => item.type !== 'divider').length;
        const currentVisibleIndex = currentMenuItems.filter((item, idx) => item.type !== 'divider' && idx <= selectedIndex).length;
        itemCounterSpan.innerText = `${currentVisibleIndex}/${visibleItems}`;
    }

    // ==================== SCROLL TO ACTIVE ====================
    function scrollToActiveItem() {
        if (!menuListEl) return;
        const activeItem = menuListEl.querySelector('.menu-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // ==================== RENDER CATEGORY TABS ====================
    function renderCategoryTabs() {
        if (!categoryTabsContainer) return;
        categoryTabsContainer.innerHTML = "";

        if (!currentCategories || !currentCategories.length) {
            categoryTabsContainer.style.display = "none";
            return;
        }

        categoryTabsContainer.style.display = "flex";

        currentCategories.forEach((cat, idx) => {
            const tab = document.createElement('div');
            tab.className = `category-tab ${idx === currentCategoryIndex ? 'active' : ''}`;
            tab.innerText = cat.label || "Menu";
            tab.addEventListener('click', () => {
                if (idx !== currentCategoryIndex) {
                    currentCategoryIndex = idx;
                    emitToClient("changeCategory", { newCategoryIndex: currentCategoryIndex });
                    renderCategoryTabs();
                }
            });
            categoryTabsContainer.appendChild(tab);
        });
    }

    // ==================== RENDER ITEM RIGHT SIDE ====================
    function renderItemRight(item) {
        const rightDiv = document.createElement('div');
        rightDiv.className = "item-right";

        if (item.type === 'button') {
            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'indicator-arrow';
            arrowSpan.innerText = '▶';
            rightDiv.appendChild(arrowSpan);
        }
        else if (item.type === 'checkbox') {
            const isChecked = !!item.checked;
            const dotSpan = document.createElement('span');
            dotSpan.className = 'toggle-dot';
            dotSpan.style.backgroundColor = isChecked ? '#10b981' : '#ef4444';
            dotSpan.style.boxShadow = isChecked ? '0 0 5px #10b981' : '0 0 3px #ef4444';
            const textSpan = document.createElement('span');
            textSpan.className = 'toggle-text';
            textSpan.style.color = isChecked ? '#86efac' : '#f87171';
            textSpan.innerText = isChecked ? 'ON' : 'OFF';
            rightDiv.appendChild(dotSpan);
            rightDiv.appendChild(textSpan);
        }
        else if (item.type === 'scrollable') {
            const valuesArr = item.values || ['Option 1', 'Option 2', 'Option 3'];
            let currentValIdx = (item.value !== undefined && item.value >= 0 && item.value < valuesArr.length) ? item.value : 0;
            const displayVal = valuesArr[currentValIdx] || '???';
            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'scrollable-badge';
            badgeSpan.innerHTML = `◀ ${displayVal} ▶`;
            rightDiv.appendChild(badgeSpan);
        }
        else if (item.type === 'slider') {
            let sliderVal = (item.value !== undefined) ? item.value : (item.min || 0);
            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'slider-badge';
            badgeSpan.innerText = `${sliderVal}`;
            rightDiv.appendChild(badgeSpan);
        }
        else if (item.type === 'divider') {
            return null;
        }
        else {
            const fallbackSpan = document.createElement('span');
            fallbackSpan.className = 'indicator-arrow';
            fallbackSpan.innerText = '›';
            rightDiv.appendChild(fallbackSpan);
        }

        return rightDiv;
    }

    // ==================== RENDER MENU ITEMS ====================
    function renderMenuItems() {
        if (!menuListEl) return;
        menuListEl.innerHTML = "";

        if (!currentMenuItems.length) {
            const emptyLi = document.createElement('li');
            emptyLi.className = "menu-item";
            emptyLi.style.justifyContent = "center";
            emptyLi.style.opacity = "0.6";
            emptyLi.innerHTML = `<span>No options available</span>`;
            menuListEl.appendChild(emptyLi);
            updateCounter();
            return;
        }

        // Clamp selected index
        if (selectedIndex >= currentMenuItems.length) selectedIndex = currentMenuItems.length - 1;
        if (selectedIndex < 0 && currentMenuItems.length) selectedIndex = 0;

        // Skip dividers for selection
        while (currentMenuItems[selectedIndex] && currentMenuItems[selectedIndex].type === 'divider') {
            selectedIndex = (selectedIndex + 1) % currentMenuItems.length;
        }

        currentMenuItems.forEach((item, idx) => {
            // Handle dividers
            if (item.type === 'divider') {
                const divider = document.createElement('li');
                divider.className = "menu-divider";
                divider.innerText = item.label || "──────────";
                menuListEl.appendChild(divider);
                return;
            }

            const li = document.createElement('li');
            const isActive = (idx === selectedIndex);
            li.className = `menu-item ${isActive ? 'active' : ''}`;

            // Left label
            const leftSpan = document.createElement('span');
            leftSpan.innerText = item.label;

            // Right side
            const rightDiv = renderItemRight(item);
            if (rightDiv) {
                li.appendChild(leftSpan);
                li.appendChild(rightDiv);
            } else {
                li.appendChild(leftSpan);
            }

            // Hover selection
            li.addEventListener('mouseenter', () => {
                if (selectedIndex !== idx && item.type !== 'divider') {
                    const prevActive = menuListEl.querySelector('.menu-item.active');
                    if (prevActive) prevActive.classList.remove('active');
                    selectedIndex = idx;
                    li.classList.add('active');
                    updateCounter();
                    scrollToActiveItem();
                }
            });

            // Click action
            li.addEventListener('click', () => {
                if (selectedIndex !== idx && item.type !== 'divider') {
                    const prevActive = menuListEl.querySelector('.menu-item.active');
                    if (prevActive) prevActive.classList.remove('active');
                    selectedIndex = idx;
                    li.classList.add('active');
                    updateCounter();
                    scrollToActiveItem();
                }
                if (item.type !== 'divider') {
                    executeAction(item);
                }
            });

            menuListEl.appendChild(li);
        });

        updateCounter();
        scrollToActiveItem();
    }

    // ==================== EXECUTE ACTION ====================
    function executeAction(item) {
        if (item.type === 'checkbox') {
            item.checked = !item.checked;
            renderMenuItems();
            emitToClient("toggleCheckbox", { label: item.label, newState: item.checked });
        }
        else if (item.type === 'scrollable') {
            const valuesArr = item.values || [];
            if (valuesArr.length > 0) {
                let newIdx = ((item.value || 0) + 1) % valuesArr.length;
                item.value = newIdx;
                renderMenuItems();
                emitToClient("scrollableChange", { label: item.label, selectedValue: valuesArr[newIdx], index: newIdx });
            }
        }
        else if (item.type === 'slider') {
            emitToClient("sliderSelect", { label: item.label, currentValue: item.value });
        }
        else {
            emitToClient("selectItem", {});
        }
    }

    // ==================== NAVIGATION ====================
    function navigateUp() {
        if (!currentMenuItems.length) return;
        let newIdx = selectedIndex - 1;
        if (newIdx < 0) newIdx = currentMenuItems.length - 1;
        let attempts = 0;
        while (currentMenuItems[newIdx] && currentMenuItems[newIdx].type === 'divider' && attempts < 50) {
            newIdx = newIdx - 1;
            if (newIdx < 0) newIdx = currentMenuItems.length - 1;
            attempts++;
        }
        if (newIdx !== selectedIndex && currentMenuItems[newIdx] && currentMenuItems[newIdx].type !== 'divider') {
            selectedIndex = newIdx;
            renderMenuItems();
        }
    }

    function navigateDown() {
        if (!currentMenuItems.length) return;
        let newIdx = selectedIndex + 1;
        if (newIdx >= currentMenuItems.length) newIdx = 0;
        let attempts = 0;
        while (currentMenuItems[newIdx] && currentMenuItems[newIdx].type === 'divider' && attempts < 50) {
            newIdx = newIdx + 1;
            if (newIdx >= currentMenuItems.length) newIdx = 0;
            attempts++;
        }
        if (newIdx !== selectedIndex && currentMenuItems[newIdx] && currentMenuItems[newIdx].type !== 'divider') {
            selectedIndex = newIdx;
            renderMenuItems();
        }
    }

    function switchCategory(direction) {
        if (!currentCategories || !currentCategories.length) return;
        let newIdx = currentCategoryIndex;
        if (direction === 'prev') {
            newIdx = currentCategoryIndex - 1;
            if (newIdx < 0) newIdx = currentCategories.length - 1;
        } else if (direction === 'next') {
            newIdx = (currentCategoryIndex + 1) % currentCategories.length;
        }
        if (newIdx !== currentCategoryIndex) {
            currentCategoryIndex = newIdx;
            emitToClient("changeCategory", { newCategoryIndex: currentCategoryIndex });
            renderCategoryTabs();
        }
    }

    // ==================== KEYBOARD HANDLER (browser testing only) ====================
    function onKeyDown(e) {
        // Key selector mode
        if (isSelectingKey) {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') {
                hideKeySelector();
                return;
            }
            const keyNames = {
                'Escape': 'ESC', 'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
                'Enter': 'ENTER', 'Backspace': 'BACKSPACE', 'Shift': 'SHIFT', 'Control': 'CTRL', 'Alt': 'ALT',
                'Tab': 'TAB', 'CapsLock': 'CAPS', 'Delete': 'DEL', 'Home': 'HOME', 'End': 'END',
                'PageUp': 'PGUP', 'PageDown': 'PGDN', 'Insert': 'INS', ' ': 'SPACE',
                'Meta': 'WIN', 'ContextMenu': 'MENU', 'NumLock': 'NUMLOCK'
            };
            const displayName = keyNames[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key);
            keyDisplay.innerHTML = `<span class="key-placeholder">${displayName}</span>`;
            keyDisplay.classList.add('has-key');
            setTimeout(() => onKeySelected(e.key), 150);
            return;
        }

        // Navigation keys
        const navKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Backspace', 'e', 'E', 'q', 'Q'];
        if (navKeys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
        }

        switch (e.key) {
            case 'ArrowUp': navigateUp(); break;
            case 'ArrowDown': navigateDown(); break;
            case 'Enter':
                if (currentMenuItems[selectedIndex]) {
                    executeAction(currentMenuItems[selectedIndex]);
                }
                break;
            case 'Escape': case 'Backspace':
                // In DUI mode, Lua handles close via MachoOnKeyDown
                // In NUI mode, send closeNUI callback
                if (window.GetParentResourceName) {
                    fetch(`https://${getParentResource()}/closeNUI`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                        body: JSON.stringify({})
                    }).catch(() => {});
                }
                // For browser testing, just hide
                if (!isInFiveM()) {
                    mainMenu.style.display = "none";
                }
                break;
            case 'e': case 'E': switchCategory('prev'); break;
            case 'q': case 'Q': switchCategory('next'); break;
            default: break;
        }
    }

    // ==================== MESSAGE HANDLER (DUI + NUI) ====================
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data) return;

        // ---- showUI: Show/Hide the menu ----
        if (data.action === 'showUI') {
            if (data.visible === true) {
                mainMenu.style.display = "flex";
                if (data.elements) currentMenuItems = data.elements;
                if (data.categories) currentCategories = data.categories;
                if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
                const idx = data.index !== undefined ? data.index : data.selectedIndex;
                if (idx !== undefined) selectedIndex = idx;
                if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
                if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
                renderCategoryTabs();
                renderMenuItems();
            } else {
                mainMenu.style.display = "none";
            }
            return;
        }

        // ---- Legacy type=ui (from client.lua SendNUIMessage) ----
        if (data.type === 'ui') {
            if (data.status === true) {
                mainMenu.style.display = "flex";
                if (data.elements) currentMenuItems = data.elements;
                if (data.categories) currentCategories = data.categories;
                if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
                const idx = data.index !== undefined ? data.index : data.selectedIndex;
                if (idx !== undefined) selectedIndex = idx;
                if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
                if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
                renderCategoryTabs();
                renderMenuItems();
            } else {
                mainMenu.style.display = "none";
            }
            return;
        }

        // ---- updateElements: Refresh items/categories ----
        if (data.action === 'updateElements') {
            if (data.elements) currentMenuItems = data.elements;
            if (data.categories) currentCategories = data.categories;
            if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
            const idx = data.index !== undefined ? data.index : data.selectedIndex;
            if (idx !== undefined) selectedIndex = idx;
            if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
            if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
            renderCategoryTabs();
            renderMenuItems();
            return;
        }

        // ---- syncIndex / keydown: Sync selected index from Lua ----
        if (data.action === 'syncIndex' || data.action === 'keydown') {
            const idx = data.index !== undefined ? data.index : data.selectedIndex;
            if (idx !== undefined && currentMenuItems.length && idx < currentMenuItems.length) {
                selectedIndex = idx;
                renderMenuItems();
            }
            return;
        }

        // ---- updateKeyboard: Show/hide keyboard input overlay ----
        if (data.action === 'updateKeyboard') {
            if (data.visible === true) {
                showKeyboard(data.title, data.value);
            } else {
                hideKeyboard();
            }
            // Update value if keyboard already visible
            if (data.visible === true && data.value !== undefined) {
                updateKeyboardValue(data.value);
            }
            return;
        }

        // ---- updateBanner: Show banner image ----
        if (data.action === 'updateBanner') {
            if (data.bannerLink) {
                bannerImage.src = data.bannerLink;
                menuBanner.style.display = "block";
                if (data.bannerColor) {
                    menuBanner.style.backgroundColor = `rgb(${data.bannerColor})`;
                }
            } else if (data.bannerColor) {
                menuBanner.style.display = "block";
                menuBanner.style.backgroundColor = `rgb(${data.bannerColor})`;
                bannerImage.style.display = "none";
            } else {
                menuBanner.style.display = "none";
            }
            return;
        }

        // ---- updateAuthFooter: Update footer username ----
        if (data.action === 'updateAuthFooter') {
            if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
            return;
        }

        // ---- showNotification: Display notification ----
        if (data.action === 'showNotification') {
            showNotification(data.type, data.title, data.desc, data.duration);
            return;
        }

        // ---- showKeySelector: Key binding selector ----
        if (data.action === 'showKeySelector') {
            showKeySelector(function (selectedKey) {
                emitToClient("keySelected", { key: selectedKey });
            });
            return;
        }

        // ---- executeJS: Execute arbitrary JS (used by SetMenuPosition) ----
        if (data.action === 'executeJS') {
            if (data.code) {
                try { eval(data.code); } catch (e) { console.error("[executeJS]", e); }
            }
            return;
        }
    });

    // ==================== INIT ====================
    window.addEventListener('keydown', onKeyDown);

    // Initial render
    renderCategoryTabs();
    renderMenuItems();

    // Browser testing mode: show dark bg and menu when opening file locally
    if (!isInFiveM()) {
        document.body.style.background = "radial-gradient(circle at 30% 20%, #0a0a0f 0%, #050508 100%)";
        mainMenu.style.display = "flex";
    }

    console.log("%c SHINIGAMI ESSE MENU LOADED ", "color: #ff3e3e; font-size: 16px; font-weight: bold;");
    console.log("%cKeyboard nav works in browser. In FiveM DUI, Lua handles all input.", "color: #ffaa8a; font-size: 12px;");
})();