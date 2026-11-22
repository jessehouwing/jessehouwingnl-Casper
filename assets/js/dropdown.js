(function () {
    const mediaQuery = window.matchMedia('(max-width: 991px)');
    const head = document.querySelector('.gh-head');
    const menu = head && head.querySelector('.gh-head-menu');
    const nav = menu && menu.querySelector('.nav');
    if (!nav) return;

    const items = Array.from(nav.children);
    let toggle;
    let frame;

    items.forEach(function (item, index) {
        item.style.transitionDelay = 0.03 * (index + 1) + 's';
    });

    function closeDropdown() {
        document.body.classList.remove('is-dropdown-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    function hasWrapped() {
        const children = Array.from(nav.children);
        if (children.length < 2) return false;
        const first = children[0].getBoundingClientRect();
        const firstCenter = first.top + first.height / 2;
        return children.some(function (child) {
            const rect = child.getBoundingClientRect();
            return Math.abs(rect.top + rect.height / 2 - firstCenter) > 2;
        });
    }

    function makeDropdown() {
        closeDropdown();
        toggle = null;
        nav.replaceChildren(...items);
        document.body.classList.remove('is-dropdown-mega');

        if (!mediaQuery.matches && hasWrapped()) {
            const more = document.createElement('li');
            more.className = 'nav-more';
            toggle = document.createElement('button');
            toggle.className = 'nav-more-toggle';
            toggle.type = 'button';
            toggle.setAttribute('aria-label', 'More');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor"><path d="M21.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0zM13.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0zM5.333 16c0-1.473 1.194-2.667 2.667-2.667v0c1.473 0 2.667 1.194 2.667 2.667v0c0 1.473-1.194 2.667-2.667 2.667v0c-1.473 0-2.667-1.194-2.667-2.667v0z"></path></svg>';

            const dropdown = document.createElement('ul');
            dropdown.className = 'gh-dropdown';
            more.append(toggle, dropdown);
            nav.appendChild(more);

            while (hasWrapped() && nav.children.length > 1) {
                dropdown.prepend(more.previousElementSibling);
            }

            if (dropdown.children.length >= 10) {
                document.body.classList.add('is-dropdown-mega');
                dropdown.style.gridTemplateRows = 'repeat(' + Math.ceil(dropdown.children.length / 2) + ', 1fr)';
            }

            toggle.addEventListener('click', function () {
                const isOpen = document.body.classList.toggle('is-dropdown-open');
                toggle.setAttribute('aria-expanded', String(isOpen));
            });
        }

        document.body.classList.add('is-dropdown-loaded');
    }

    function scheduleDropdown() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(makeDropdown);
    }

    window.addEventListener('click', function (event) {
        if (toggle && !toggle.parentElement.contains(event.target)) closeDropdown();
    });
    window.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeDropdown();
    });

    const observer = new ResizeObserver(scheduleDropdown);
    observer.observe(head);
    observer.observe(menu);
    imagesLoaded(head, scheduleDropdown);
    if (document.fonts) document.fonts.ready.then(scheduleDropdown);
    scheduleDropdown();
})();
