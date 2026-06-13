// ==================== SHINIGAMI ESSE - PARANOIA MENU ====================
(function () {
    // Demo Data - Matches your screenshot
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
    const categoryTabsContainer = document.getElementById("categoryTabs");
    const menuListEl = document.getElementById("menuList");
    const footerCreditSpan = document.getElementById("footerCredit");
    const itemCounterSpan = document.getElementById("itemCounter");
    const keySelectorOverlay = document.getElementById("keySelectorOverlay");
    const keyDisplay = document.getElementById("keyDisplay");

    // Key name mapping for display
    const keyNames = {
        'Escape': 'ESC', 'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
        'Enter': 'ENTER', 'Backspace': 'BACKSPACE', 'Shift': 'SHIFT', 'Control': 'CTRL', 'Alt': 'ALT',
        'Tab': 'TAB', 'CapsLock': 'CAPS', 'Delete': 'DEL', 'Home': 'HOME', 'End': 'END',
        'PageUp': 'PGUP', 'PageDown': 'PGDN', 'Insert': 'INS', ' ': 'SPACE',
        'Meta': 'WIN', 'ContextMenu': 'MENU', 'NumLock': 'NUMLOCK'
    };

    function getKeyDisplayName(key) {
        if (keyNames[key]) return keyNames[key];
        if (key.length === 1) return key.toUpperCase();
        return key;
    }

    // Get parent resource for FiveM (if in FiveM environment)
    const getParentResource = () => {
        return window.GetParentResourceName ? window.GetParentResourceName() : "shinigami_esse";
    };

    // Send to client (for FiveM)
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

        // Only send if in FiveM environment
        if (window.GetParentResourceName) {
            fetch(`https://${getParentResource()}/menuAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify(payload)
            }).catch(() => { });
        } else {
            console.log("[FiveM Mock]", actionType, payload);
        }
    }

    // Show key selector
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

    // Update counter
    function updateCounter() {
        if (!currentMenuItems.length) {
            itemCounterSpan.innerText = "0/0";
            return;
        }
        const visibleItems = currentMenuItems.filter(item => item.type !== 'divider').length;
        const currentVisibleIndex = currentMenuItems.filter((item, idx) => item.type !== 'divider' && idx <= selectedIndex).length;
        itemCounterSpan.innerText = `${currentVisibleIndex}/${visibleItems}`;
    }

    // Scroll to active item
    function scrollToActiveItem() {
        if (!menuListEl) return;
        const activeItem = menuListEl.querySelector('.menu-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // Render category tabs
    function renderCategoryTabs() {
        if (!categoryTabsContainer) return;
        categoryTabsContainer.innerHTML = "";

        if (!currentCategories.length) {
            const defaultTab = document.createElement('div');
            defaultTab.className = "category-tab active";
            defaultTab.innerText = "Main Menu";
            categoryTabsContainer.appendChild(defaultTab);
            return;
        }

        currentCategories.forEach((cat, idx) => {
            const tab = document.createElement('div');
            tab.className = `category-tab ${idx === currentCategoryIndex ? 'active' : ''}`;
            tab.innerText = cat.label || "Menu";
            tab.addEventListener('click', () => {
                if (idx !== currentCategoryIndex) {
                    currentCategoryIndex = idx;
                    emitToClient("changeCategory", { newCategoryIndex: currentCategoryIndex });
                    renderCategoryTabs();
                    // In demo, we could load different items per category
                    console.log(`Switched to category: ${cat.label}`);
                }
            });
            categoryTabsContainer.appendChild(tab);
        });
    }

    // Render right side based on item type
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

    // Render menu items
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

    // Execute action for an item
    function executeAction(item) {
        if (item.type === 'checkbox') {
            item.checked = !item.checked;
            renderMenuItems();
            emitToClient("toggleCheckbox", {
                label: item.label,
                newState: item.checked
            });
            console.log(`%c[${item.label}] ${item.checked ? 'ENABLED' : 'DISABLED'}`, `color: ${item.checked ? '#10b981' : '#ef4444'}; font-weight: bold;`);

            // Show temporary notification for demo
            showNotification(`${item.label}: ${item.checked ? 'ON' : 'OFF'}`);
        }
        else if (item.type === 'scrollable') {
            const valuesArr = item.values || [];
            if (valuesArr.length > 0) {
                let newIdx = ((item.value || 0) + 1) % valuesArr.length;
                item.value = newIdx;
                renderMenuItems();
                emitToClient("scrollableChange", {
                    label: item.label,
                    selectedValue: valuesArr[newIdx],
                    index: newIdx
                });
                console.log(`%c[${item.label}] Changed to: ${valuesArr[newIdx]}`, `color: #ffaa8a; font-weight: bold;`);
                showNotification(`${item.label}: ${valuesArr[newIdx]}`);
            }
        }
        else if (item.type === 'slider') {
            emitToClient("sliderSelect", {
                label: item.label,
                currentValue: item.value
            });
            console.log(`%c[${item.label}] Value: ${item.value}`, `color: #ffaa8a; font-weight: bold;`);
            showNotification(`${item.label}: ${item.value}`);
        }
        else {
            emitToClient("selectItem", {});
            console.log(`%c[${item.label}] EXECUTED`, `color: #ff3e3e; font-weight: bold;`);
            showNotification(`Executed: ${item.label}`);
        }
    }

    // Show temporary notification (for demo)
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.background = '#ff3e3e';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '8px';
        notification.style.fontFamily = 'Orbitron, monospace';
        notification.style.fontSize = '12px';
        notification.style.zIndex = '9999';
        notification.style.animation = 'fadeOut 2s ease forwards';
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Add fadeOut animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            0% { opacity: 1; transform: translateX(0); }
            70% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(20px); }
        }
    `;
    document.head.appendChild(style);

    // Navigation
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
        if (!currentCategories.length) return;
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

    // Keyboard handler
    function onKeyDown(e) {
        // Handle key selector first
        if (isSelectingKey) {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape') {
                hideKeySelector();
                return;
            }

            const displayName = getKeyDisplayName(e.key);
            keyDisplay.innerHTML = `<span class="key-placeholder">${displayName}</span>`;
            keyDisplay.classList.add('has-key');

            setTimeout(() => {
                onKeySelected(e.key);
            }, 150);
            return;
        }

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
                if (window.GetParentResourceName) {
                    fetch(`https://${getParentResource()}/closeNUI`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                        body: JSON.stringify({})
                    }).catch(() => {});
                } else {
                    console.log("[FiveM Mock] Close NUI");
                    document.getElementById("mainMenu").style.display = "none";
                }
                break;
            case 'e': case 'E': switchCategory('prev'); break;
            case 'q': case 'Q': switchCategory('next'); break;
            default: break;
        }
    }

    // Listen for FiveM NUI messages
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data) return;

        const mainMenu = document.getElementById("mainMenu");

        // Handle showUI action
        if (data.action === 'showUI') {
            if (data.visible === true) {
                mainMenu.style.display = "flex";
                if (data.elements) currentMenuItems = data.elements;
                if (data.categories) currentCategories = data.categories;
                if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
                
                const targetIndex = data.index !== undefined ? data.index : data.selectedIndex;
                if (targetIndex !== undefined) selectedIndex = targetIndex;
                
                if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
                if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
                renderCategoryTabs();
                renderMenuItems();
            } else {
                mainMenu.style.display = "none";
            }
            return;
        }

        // Handle legacy type === ui message
        if (data.type === 'ui') {
            if (data.status === true) {
                mainMenu.style.display = "flex";
                if (data.elements) currentMenuItems = data.elements;
                if (data.categories) currentCategories = data.categories;
                if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
                
                const targetIndex = data.index !== undefined ? data.index : data.selectedIndex;
                if (targetIndex !== undefined) selectedIndex = targetIndex;
                
                if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
                if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
                renderCategoryTabs();
                renderMenuItems();
            } else {
                mainMenu.style.display = "none";
            }
            return;
        }

        if (data.action === 'updateElements') {
            if (data.elements) currentMenuItems = data.elements;
            if (data.categories) currentCategories = data.categories;
            if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
            
            const targetIndex = data.index !== undefined ? data.index : data.selectedIndex;
            if (targetIndex !== undefined) selectedIndex = targetIndex;
            
            if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
            if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
            renderCategoryTabs();
            renderMenuItems();
            return;
        }

        if (data.action === 'syncIndex' || data.action === 'keydown') {
            const targetIndex = data.index !== undefined ? data.index : data.selectedIndex;
            if (targetIndex !== undefined && currentMenuItems.length && targetIndex < currentMenuItems.length) {
                selectedIndex = targetIndex;
                renderMenuItems();
            }
            return;
        }

        if (data.action === 'updateAuthFooter') {
            if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
            return;
        }

        if (data.action === 'showKeySelector') {
            showKeySelector(function (selectedKey) {
                emitToClient("keySelected", { key: selectedKey });
            });
            return;
        }
    });

    // Attach keyboard listener
    window.addEventListener('keydown', onKeyDown);

    // Initial render
    renderCategoryTabs();
    renderMenuItems();

    // Browser Mock Mode - only activate when opened as a local file for testing
    // (DUI loads from https://, standard NUI loads from nui://, only local testing uses file://)
    if (window.location.protocol === 'file:') {
        document.body.style.background = "radial-gradient(circle at 30% 20%, #0a0a0f 0%, #050508 100%)";
        document.getElementById("mainMenu").style.display = "flex";
    }

    console.log("%c SHINIGAMI ESSE MENU LOADED ", "color: #ff3e3e; font-size: 16px; font-weight: bold;");
    console.log("%cUse Arrow Keys to navigate | Enter to select | Q/E for categories", "color: #ffaa8a; font-size: 12px;");
})();