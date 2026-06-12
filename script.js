// ==================== SHINIGAMI ESSE - PARANOIA MENU ====================
(function () {
    // State
    let currentCategories = [];
    let currentCategoryIndex = 0;
    let currentMenuItems = [];
    let selectedIndex = 0;

    // DOM Elements
    const categoryTabsContainer = document.getElementById("categoryTabs");
    const menuListEl = document.getElementById("menuList");
    const footerCreditSpan = document.getElementById("footerCredit");
    const itemCounterSpan = document.getElementById("itemCounter");

    // Get parent resource for FiveM
    const getParentResource = () => {
        return window.GetParentResourceName ? window.GetParentResourceName() : "shinigami_esse";
    };

    // Send to client
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
        fetch(`https://${getParentResource()}/menuAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(payload)
        }).catch(() => { });
    }

    // Close menu
    function closeMenu() {
        document.body.style.display = "none";
        emitToClient("closeNUI");
        fetch(`https://${getParentResource()}/closeNUI`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        }).catch(() => { });
    }

    // Update counter
    function updateCounter() {
        if (!currentMenuItems.length) {
            itemCounterSpan.innerText = "0/0";
            return;
        }
        itemCounterSpan.innerText = `${selectedIndex + 1}/${currentMenuItems.length}`;
    }

    // Scroll to active
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
                }
            });
            categoryTabsContainer.appendChild(tab);
        });
    }

    // Render a single item's right side based on type
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
            dotSpan.style.boxShadow = isChecked ? '0 0 6px #10b981' : '0 0 3px #ef4444';
            const textSpan = document.createElement('span');
            textSpan.className = 'toggle-text';
            textSpan.style.color = isChecked ? '#86efac' : '#f87171';
            textSpan.innerText = isChecked ? 'ON' : 'OFF';
            rightDiv.appendChild(dotSpan);
            rightDiv.appendChild(textSpan);
        }
        else if (item.type === 'scrollable') {
            const valuesArr = item.values || ['Value 1', 'Value 2', 'Value 3'];
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
            // Dividers have no right indicator
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

        currentMenuItems.forEach((item, idx) => {
            // Handle dividers specially
            if (item.type === 'divider') {
                const divider = document.createElement('li');
                divider.className = "menu-divider";
                divider.innerText = item.label || "──────────";
                menuListEl.appendChild(divider);
                return;
            }

            const li = document.createElement('li');
            li.className = `menu-item ${idx === selectedIndex ? 'active' : ''}`;

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
                if (selectedIndex !== idx) {
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
                if (selectedIndex !== idx) {
                    const prevActive = menuListEl.querySelector('.menu-item.active');
                    if (prevActive) prevActive.classList.remove('active');
                    selectedIndex = idx;
                    li.classList.add('active');
                    updateCounter();
                    scrollToActiveItem();
                }
                executeCurrentAction();
            });

            menuListEl.appendChild(li);
        });

        updateCounter();
        scrollToActiveItem();
    }

    // Execute action for current selected item
    function executeCurrentAction() {
        if (!currentMenuItems.length) return;
        const item = currentMenuItems[selectedIndex];
        if (!item || item.type === 'divider') return;

        if (item.type === 'checkbox') {
            item.checked = !item.checked;
            renderMenuItems();
            emitToClient("toggleCheckbox", {
                label: item.label,
                newState: item.checked
            });
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
            } else {
                emitToClient("selectItem", {});
            }
        }
        else if (item.type === 'slider') {
            emitToClient("sliderSelect", {
                label: item.label,
                currentValue: item.value
            });
        }
        else {
            emitToClient("selectItem", {});
        }
    }

    // Full render
    function fullRender() {
        renderCategoryTabs();
        renderMenuItems();
    }

    // Navigation
    function navigateUp() {
        if (!currentMenuItems.length) return;
        let newIdx = selectedIndex - 1;
        if (newIdx < 0) newIdx = currentMenuItems.length - 1;
        // Skip dividers if possible
        while (newIdx >= 0 && newIdx < currentMenuItems.length && currentMenuItems[newIdx] && currentMenuItems[newIdx].type === 'divider') {
            newIdx = newIdx - 1;
            if (newIdx < 0) newIdx = currentMenuItems.length - 1;
        }
        if (newIdx !== selectedIndex) {
            selectedIndex = newIdx;
            renderMenuItems();
        }
    }

    function navigateDown() {
        if (!currentMenuItems.length) return;
        let newIdx = selectedIndex + 1;
        if (newIdx >= currentMenuItems.length) newIdx = 0;
        // Skip dividers if possible
        while (newIdx >= 0 && newIdx < currentMenuItems.length && currentMenuItems[newIdx] && currentMenuItems[newIdx].type === 'divider') {
            newIdx = newIdx + 1;
            if (newIdx >= currentMenuItems.length) newIdx = 0;
        }
        if (newIdx !== selectedIndex) {
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
        if (document.body.style.display !== 'block') return;
        const key = e.key;
        const navKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Backspace', 'e', 'E', 'q', 'Q'];
        if (navKeys.includes(key)) e.preventDefault();

        switch (key) {
            case 'ArrowUp': navigateUp(); break;
            case 'ArrowDown': navigateDown(); break;
            case 'Enter': executeCurrentAction(); break;
            case 'Escape': case 'Backspace': closeMenu(); break;
            case 'e': case 'E': switchCategory('prev'); break;
            case 'q': case 'Q': switchCategory('next'); break;
            default: break;
        }
    }

    // Listen for FiveM NUI messages
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data) return;

        // Show/Hide UI (compatible with your Lua's showUI action)
        if (data.type === 'ui' || data.action === 'showUI') {
            const visible = (data.type === 'ui') ? data.status : data.visible;
            if (visible === true) {
                document.body.style.display = 'block';
                if (data.elements) currentMenuItems = data.elements;
                if (data.categories) currentCategories = data.categories;
                if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
                if (data.selectedIndex !== undefined) selectedIndex = data.selectedIndex;
                if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
                if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
                fullRender();
            } else {
                document.body.style.display = 'none';
            }
            return;
        }

        // Update Elements
        if (data.action === 'updateElements') {
            if (data.elements) currentMenuItems = data.elements;
            if (data.categories) currentCategories = data.categories;
            if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
            if (data.selectedIndex !== undefined) selectedIndex = data.selectedIndex;
            if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
            if (data.path) console.log("Menu path:", data.path);
            if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
            fullRender();
        }

        // Sync Index
        if (data.action === 'syncIndex') {
            if (data.index !== undefined && currentMenuItems.length && data.index < currentMenuItems.length) {
                selectedIndex = data.index;
                renderMenuItems();
            }
        }

        // Keydown (for initial selection sync)
        if (data.action === 'keydown') {
            if (data.index !== undefined && currentMenuItems.length && data.index < currentMenuItems.length) {
                selectedIndex = data.index;
                renderMenuItems();
            }
        }

        // Update Auth Footer
        if (data.action === 'updateAuthFooter') {
            if (data.username) footerCreditSpan.innerText = `/cracked by | ${data.username}`;
        }

        // Execute JavaScript (for menu positioning, etc.)
        if (data.action === 'executeJS' && data.code) {
            try {
                eval(data.code);
            } catch (e) { console.log("ExecuteJS error:", e); }
        }
    });

    // Attach keyboard listener
    window.addEventListener('keydown', onKeyDown);

    // Hidden by default until NUI activation
    document.body.style.display = "none";
})();