// -------------------- SHINIGAMI ESSE - ENHANCED NUI MENU --------------------
(function () {
    // ----- STATE -----
    let currentCategories = [];        // array of { label, ... }
    let currentCategoryIndex = 0;
    let currentMenuItems = [];          // elements array { label, type, ... }
    let selectedIndex = 0;

    // DOM refs
    const container = document.getElementById("menuListContainer");
    const categoryLabelSpan = document.getElementById("categoryLabel");
    const itemCounterSpan = document.getElementById("itemCounter");
    const footerCreditSpan = document.getElementById("footerCredits");

    // Helper: get parent resource for FiveM
    const getParentResource = () => {
        return window.GetParentResourceName ? window.GetParentResourceName() : "shinigami_esse";
    };

    // send action to client (menu interaction)
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
        }).catch(err => console.warn("[Shinigami] fetch error:", err));
    }

    // close and hide menu
    function closeMenu() {
        document.body.style.display = "none";
        emitToClient("closeNUI");
        // additional direct close event
        fetch(`https://${getParentResource()}/closeNUI`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        }).catch(() => { });
    }

    // update footer counter
    function updateCounter() {
        if (!currentMenuItems.length) {
            itemCounterSpan.innerText = `0 / 0`;
            return;
        }
        itemCounterSpan.innerText = `${selectedIndex + 1} / ${currentMenuItems.length}`;
    }

    // auto-scroll active item into view (smooth)
    function scrollToActiveItem() {
        if (!container) return;
        const activeLi = container.querySelector('.menu-item.active');
        if (activeLi) {
            activeLi.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // Render full menu based on currentMenuItems & selectedIndex
    function renderMenu() {
        if (!container) return;

        // Update category label
        if (currentCategories && currentCategories[currentCategoryIndex]) {
            categoryLabelSpan.textContent = currentCategories[currentCategoryIndex].label || "Main Menu";
        } else if (currentCategories.length) {
            categoryLabelSpan.textContent = currentCategories[0]?.label || "Shinigami";
        } else {
            categoryLabelSpan.textContent = "Main Menu";
        }

        // clear container
        container.innerHTML = "";
        if (!currentMenuItems.length) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = "menu-item";
            emptyMsg.style.justifyContent = "center";
            emptyMsg.style.opacity = "0.7";
            emptyMsg.innerHTML = `<span>⚔️ no options available ⚔️</span>`;
            container.appendChild(emptyMsg);
            updateCounter();
            return;
        }

        // clamp selected index
        if (selectedIndex >= currentMenuItems.length) selectedIndex = currentMenuItems.length - 1;
        if (selectedIndex < 0 && currentMenuItems.length) selectedIndex = 0;

        // build items
        currentMenuItems.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = `menu-item ${idx === selectedIndex ? 'active' : ''}`;

            // left label
            const leftSpan = document.createElement('span');
            leftSpan.innerText = item.label;

            // right part (dynamic based on type)
            const rightDiv = document.createElement('div');
            rightDiv.className = "item-right";

            if (item.type === 'button') {
                // show arrow indicator
                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'action-arrow';
                arrowSpan.innerText = '▶';
                rightDiv.appendChild(arrowSpan);
            }
            else if (item.type === 'checkbox') {
                const isChecked = !!item.checked;
                const dotSpan = document.createElement('span');
                dotSpan.className = 'toggle-dot';
                dotSpan.style.backgroundColor = isChecked ? '#10b981' : '#ef4444';
                dotSpan.style.boxShadow = isChecked ? '0 0 6px #10b981' : '0 0 4px #ef4444';
                const statusSpan = document.createElement('span');
                statusSpan.className = 'toggle-status';
                statusSpan.style.color = isChecked ? '#86efac' : '#f87171';
                statusSpan.innerText = isChecked ? 'ON' : 'OFF';
                rightDiv.appendChild(dotSpan);
                rightDiv.appendChild(statusSpan);
            }
            else if (item.type === 'scrollable') {
                let valuesArray = item.values || ['Option A', 'Option B', 'Option C'];
                let currentValIndex = (item.value !== undefined && item.value >= 0 && item.value < valuesArray.length) ? item.value : 0;
                const displayValue = valuesArray[currentValIndex] || '???';
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'value-badge';
                badgeSpan.innerHTML = `◀ ${displayValue} ▶`;
                badgeSpan.style.cursor = 'pointer';
                rightDiv.appendChild(badgeSpan);
            }
            else if (item.type === 'slider') {
                let sliderVal = (item.value !== undefined) ? item.value : (item.min || 0);
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'value-badge';
                badgeSpan.innerText = `${sliderVal}`;
                rightDiv.appendChild(badgeSpan);
            }
            else {
                // fallback for unknown types
                const fallbackSpan = document.createElement('span');
                fallbackSpan.className = 'action-arrow';
                fallbackSpan.innerText = '▸';
                rightDiv.appendChild(fallbackSpan);
            }

            div.appendChild(leftSpan);
            div.appendChild(rightDiv);

            // mouse events: hover changes selection without breaking keyboard
            div.addEventListener('mouseenter', (e) => {
                if (selectedIndex !== idx) {
                    // update active class only
                    const prevActive = container.querySelector('.menu-item.active');
                    if (prevActive) prevActive.classList.remove('active');
                    selectedIndex = idx;
                    div.classList.add('active');
                    updateCounter();
                    scrollToActiveItem();
                }
            });

            // click triggers action
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                if (selectedIndex !== idx) {
                    const prevActive = container.querySelector('.menu-item.active');
                    if (prevActive) prevActive.classList.remove('active');
                    selectedIndex = idx;
                    div.classList.add('active');
                    updateCounter();
                    scrollToActiveItem();
                }
                executeCurrentItemAction();
            });

            container.appendChild(div);
        });

        updateCounter();
        scrollToActiveItem();
    }

    // executes action based on current selected item type (local state + client)
    function executeCurrentItemAction() {
        if (!currentMenuItems.length) return;
        const item = currentMenuItems[selectedIndex];
        if (!item) return;

        // handle local state modifications for immediate feedback
        if (item.type === 'checkbox') {
            // toggle locally
            item.checked = !item.checked;
            renderMenu();   // re-render to show fresh ON/OFF
            emitToClient("toggleCheckbox", {
                label: item.label,
                newState: item.checked
            });
        }
        else if (item.type === 'scrollable') {
            // cycle value
            const valuesArr = item.values || [];
            if (valuesArr.length > 0) {
                let newIdx = ((item.value || 0) + 1) % valuesArr.length;
                item.value = newIdx;
                renderMenu();  // update display
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
            // notify client about slider selection; client can handle increment/decrement separately if needed
            emitToClient("sliderSelect", {
                label: item.label,
                currentValue: item.value
            });
        }
        else {
            // button or generic
            emitToClient("selectItem", {});
        }
    }

    // ----- KEYBOARD NAVIGATION (full support) -----
    function navigateUp() {
        if (!currentMenuItems.length) return;
        let newIdx = selectedIndex - 1;
        if (newIdx < 0) newIdx = currentMenuItems.length - 1;
        if (newIdx !== selectedIndex) {
            selectedIndex = newIdx;
            renderMenu();
        }
    }

    function navigateDown() {
        if (!currentMenuItems.length) return;
        let newIdx = selectedIndex + 1;
        if (newIdx >= currentMenuItems.length) newIdx = 0;
        if (newIdx !== selectedIndex) {
            selectedIndex = newIdx;
            renderMenu();
        }
    }

    // switch category (prev / next) and request update from client
    function switchCategory(direction) {
        if (!currentCategories.length) return;
        let newCatIdx = currentCategoryIndex;
        if (direction === 'prev') {
            newCatIdx = currentCategoryIndex - 1;
            if (newCatIdx < 0) newCatIdx = currentCategories.length - 1;
        } else if (direction === 'next') {
            newCatIdx = (currentCategoryIndex + 1) % currentCategories.length;
        }
        if (newCatIdx !== currentCategoryIndex) {
            currentCategoryIndex = newCatIdx;
            // notify lua script that category changed, expect new elements via event
            emitToClient("changeCategory", { newCategoryIndex: currentCategoryIndex });
            // also optional: fetch new elements — client side will push 'updateElements' message.
        }
    }

    // Keyboard handler
    function onKeyDown(e) {
        if (document.body.style.display !== 'block') return;
        const key = e.key;
        const navigationKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Backspace', 'e', 'E', 'q', 'Q'];
        if (navigationKeys.includes(key)) {
            e.preventDefault();
        }
        switch (key) {
            case 'ArrowUp': navigateUp(); break;
            case 'ArrowDown': navigateDown(); break;
            case 'Enter': executeCurrentItemAction(); break;
            case 'Escape': case 'Backspace': closeMenu(); break;
            case 'e': case 'E': switchCategory('prev'); break;
            case 'q': case 'Q': switchCategory('next'); break;
            default: break;
        }
    }

    // ----- LISTEN FOR FIVEM NUI MESSAGES (dynamic updates) -----
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data) return;

        // UI visibility and full data load
        if (data.type === 'ui' || data.action === 'showUI') {
            const visible = (data.type === 'ui') ? data.status : data.visible;
            if (visible === true) {
                document.body.style.display = 'block';
                if (data.elements) currentMenuItems = data.elements;
                if (data.categories) currentCategories = data.categories;
                if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
                if (data.selectedIndex !== undefined) selectedIndex = data.selectedIndex;
                if (data.username) footerCreditSpan.innerText = `cracked for | ${data.username}`;
                // clamp selected index
                if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
                renderMenu();
            } else {
                document.body.style.display = 'none';
            }
            return;
        }

        // dynamic updateElements (after category switch, initial load, etc)
        if (data.action === 'updateElements') {
            if (data.elements) currentMenuItems = data.elements;
            if (data.categories) currentCategories = data.categories;
            if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
            if (data.selectedIndex !== undefined) selectedIndex = data.selectedIndex;
            if (data.username) footerCreditSpan.innerText = `cracked for | ${data.username}`;
            if (currentMenuItems.length && selectedIndex >= currentMenuItems.length) selectedIndex = 0;
            renderMenu();
        }

        // sync index from external (like lua wants to move selection)
        if (data.action === 'syncIndex') {
            if (data.index !== undefined && currentMenuItems.length && data.index < currentMenuItems.length) {
                selectedIndex = data.index;
                renderMenu();
            }
        }

        // set categories externally
        if (data.action === 'setCategories') {
            if (data.categories) currentCategories = data.categories;
            if (data.categoryIndex !== undefined) currentCategoryIndex = data.categoryIndex;
            renderMenu();
        }
    });

    // attach keyboard listener
    window.addEventListener('keydown', onKeyDown);

    // ----- MOCK / FALLBACK FOR STANDALONE TESTING (outside FiveM) -----
    // auto-detect if running in pure browser or local file -> show demo
    const isLocalTest = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '');
    if (isLocalTest && !window.GetParentResourceName) {
        window.GetParentResourceName = () => "shinigami_mock";
        // demo categories and items for preview
        currentCategories = [
            { label: "MAIN MENU" },
            { label: "PLAYER MODS" },
            { label: "WEAPON MODS" },
            { label: "VISUALS" }
        ];
        currentCategoryIndex = 0;
        currentMenuItems = [
            { label: "Self Options", type: "button" },
            { label: "God Mode", type: "checkbox", checked: true },
            { label: "Infinite Stamina", type: "checkbox", checked: false },
            { label: "Super Speed", type: "slider", min: 0, max: 100, value: 42 },
            { label: "Kill Aura", type: "scrollable", values: ["Players Only", "All NPCs", "Off"], value: 0 },
            { label: "Give All Weapons", type: "button" },
            { label: "Teleport to Marker", type: "button" }
        ];
        selectedIndex = 0;
        footerCreditSpan.innerText = "Made By | Frncs";
        renderMenu();
        document.body.style.display = "block";
    } else {
        // default hidden until NUI activation
        document.body.style.display = "none";
    }
})();