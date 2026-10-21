(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileQuery = window.matchMedia("(max-width: 767px)");
  const focusableSelector = "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

  const overlay = {
    menu: false,
    lightbox: false,
  };

  const regions = () => ({
    header: document.querySelector("[data-header]"),
    main: document.getElementById("icerik"),
    footer: document.querySelector(".footer"),
  });

  const syncOverlay = () => {
    const { header, main, footer } = regions();
    const locked = overlay.menu || overlay.lightbox;
    document.body.classList.toggle("has-overlay", locked);
    document.documentElement.classList.toggle("menu-open", overlay.menu);
    main?.toggleAttribute("inert", locked);
    footer?.toggleAttribute("inert", locked);
    header?.toggleAttribute("inert", overlay.lightbox);
  };

  const trapFocus = (container, event) => {
    const nodes = [...container.querySelectorAll(focusableSelector)].filter(
      (element) => !element.closest("[inert], [hidden]")
    );
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const initNavigation = () => {
    const header = document.querySelector("[data-header]");
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    if (!header || !toggle || !nav) return;

    const label = toggle.querySelector(".sr-only");
    const links = [...nav.querySelectorAll(".nav__link")];
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    const setActive = (id) => {
      links.forEach((link) => {
        const active = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };

    const syncNavInert = () => {
      nav.toggleAttribute("inert", mobileQuery.matches && !overlay.menu);
    };

    const closeMenu = (restoreFocus) => {
      if (!overlay.menu) {
        syncNavInert();
        return;
      }
      overlay.menu = false;
      toggle.setAttribute("aria-expanded", "false");
      if (label) label.textContent = "Menüyü aç";
      syncOverlay();
      syncNavInert();
      if (restoreFocus) toggle.focus();
    };

    const openMenu = () => {
      overlay.menu = true;
      toggle.setAttribute("aria-expanded", "true");
      if (label) label.textContent = "Menüyü kapat";
      syncOverlay();
      syncNavInert();
      nav.querySelector("a")?.focus();
    };

    const updateHeader = () => {
      document.documentElement.classList.toggle("at-top", window.scrollY < 24);
    };

    toggle.addEventListener("click", () => {
      if (overlay.menu) closeMenu(false);
      else openMenu();
    });

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const id = link.getAttribute("href")?.slice(1);
      if (id) setActive(id);
      closeMenu(false);
    });

    document.addEventListener("keydown", (event) => {
      if (!overlay.menu || overlay.lightbox) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      } else if (event.key === "Tab") {
        trapFocus(header, event);
      }
    });

    mobileQuery.addEventListener("change", () => {
      if (!mobileQuery.matches) closeMenu(false);
      else syncNavInert();
    });

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((section) => spy.observe(section));

    updateHeader();
    syncNavInert();
    window.addEventListener("scroll", updateHeader, { passive: true });
  };

  const initReveal = () => {
    const items = document.querySelectorAll(".reveal");
    if (!items.length || reducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach((item) => observer.observe(item));
  };

  const initGallery = () => {
    const buttons = [...document.querySelectorAll("[data-filter]")];
    const items = [...document.querySelectorAll(".gallery__item")];
    const status = document.querySelector("[data-filter-status]");
    const lightbox = document.querySelector("[data-lightbox]");
    const dialog = lightbox?.querySelector(".lightbox__dialog");
    const lightboxImage = lightbox?.querySelector("[data-lightbox-image]");
    const caption = lightbox?.querySelector("[data-lightbox-caption]");
    const count = lightbox?.querySelector("[data-lightbox-count]");
    const closeButton = lightbox?.querySelector(".lightbox__close");
    if (!buttons.length || !items.length || !lightbox || !dialog || !lightboxImage || !caption || !count || !closeButton) return;

    const labels = {
      tumu: "Tümü",
      oturma: "Oturma Odası",
      yatak: "Yatak Odası",
      mutfak: "Mutfak",
      banyo: "Banyo",
      balkon: "Balkon",
    };

    let current = 0;
    let lastTrigger = null;

    const visibleItems = () => items.filter((item) => !item.hidden);

    const applyFilter = (category, announce) => {
      items.forEach((item) => {
        item.hidden = category !== "tumu" && item.dataset.category !== category;
      });
      buttons.forEach((button) => {
        const active = button.dataset.filter === category;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      if (announce && status) {
        const shown = visibleItems().length;
        status.textContent = `${labels[category] || "Seçilen kategori"}: ${shown} ürün gösteriliyor.`;
      }
      if (!lightbox.hidden) closeLightbox();
    };

    const showImage = (index) => {
      const visible = visibleItems();
      if (!visible.length) return;
      current = (index + visible.length) % visible.length;
      const image = visible[current].querySelector("img");
      lightboxImage.src = image.dataset.full || image.currentSrc || image.src;
      lightboxImage.alt = image.alt;
      caption.textContent = image.alt;
      count.textContent = `${current + 1} / ${visible.length}`;
    };

    const openLightbox = (index, trigger) => {
      lastTrigger = trigger;
      showImage(index);
      overlay.lightbox = true;
      lightbox.hidden = false;
      syncOverlay();
      closeButton.focus();
    };

    const closeLightbox = () => {
      if (lightbox.hidden) return;
      lightbox.hidden = true;
      overlay.lightbox = false;
      syncOverlay();
      lastTrigger?.focus();
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.dataset.filter, true));
    });

    document.querySelector(".gallery__grid")?.addEventListener("click", (event) => {
      const trigger = event.target.closest(".gallery__trigger");
      if (!trigger) return;
      const item = trigger.closest(".gallery__item");
      const index = visibleItems().indexOf(item);
      if (index >= 0) openLightbox(index, trigger);
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target.closest("[data-lightbox-close]")) closeLightbox();
    });
    lightbox.querySelector("[data-lightbox-prev]")?.addEventListener("click", () => showImage(current - 1));
    lightbox.querySelector("[data-lightbox-next]")?.addEventListener("click", () => showImage(current + 1));

    document.addEventListener("keydown", (event) => {
      if (!overlay.lightbox) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showImage(current + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        showImage(current - 1);
      } else if (event.key === "Tab") {
        trapFocus(dialog, event);
      }
    });
  };

  const initReviews = () => {
    const root = document.querySelector("[data-carousel]");
    if (!root) return;
    const viewport = root.querySelector("[data-carousel-viewport]");
    const track = root.querySelector("[data-carousel-track]");
    const dots = root.querySelector("[data-carousel-dots]");
    const prev = root.querySelector("[data-carousel-prev]");
    const next = root.querySelector("[data-carousel-next]");
    const autoplayButton = root.querySelector("[data-autoplay-toggle]");
    const autoplayLabel = root.querySelector("[data-autoplay-label]");
    const slides = track ? [...track.children] : [];
    if (!viewport || !track || !dots || !prev || !next || !autoplayButton || !autoplayLabel || !slides.length) return;

    let index = 0;
    let perView = 1;
    let timer = 0;
    let userPaused = reducedMotion;
    let held = false;
    let inView = true;
    let dotCount = -1;
    let pointerStart = null;
    let pointerId = null;

    const getPerView = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) return 3;
      if (window.matchMedia("(min-width: 768px)").matches) return 2;
      return 1;
    };

    const pageCount = () => Math.max(1, slides.length - perView + 1);

    const shouldRun = () => !userPaused && !held && !document.hidden && inView && pageCount() > 1;

    const renderDots = (pages) => {
      if (dotCount !== pages) {
        dots.replaceChildren();
        for (let page = 0; page < pages; page += 1) {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "reviews__dot";
          dot.setAttribute("role", "tab");
          dot.setAttribute("aria-label", `${page + 1}. yorum sayfası`);
          dot.addEventListener("click", () => {
            index = page;
            render();
            schedule();
          });
          dots.append(dot);
        }
        dotCount = pages;
      }
      [...dots.children].forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", String(active));
      });
    };

    const render = () => {
      perView = getPerView();
      const pages = pageCount();
      if (index >= pages) index = pages - 1;
      const styles = getComputedStyle(track);
      const gap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 0;
      const width = slides[0].getBoundingClientRect().width;
      if (width) track.style.transform = `translate3d(${-(width + gap) * index}px, 0, 0)`;
      root.classList.toggle("is-single", pages === 1);
      renderDots(pages);
    };

    const goTo = (nextIndex) => {
      perView = getPerView();
      const pages = pageCount();
      index = ((nextIndex % pages) + pages) % pages;
      render();
    };

    const schedule = () => {
      window.clearTimeout(timer);
      if (!shouldRun()) return;
      timer = window.setTimeout(() => {
        goTo(index + 1);
        schedule();
      }, 5000);
    };

    const updateAutoplayButton = () => {
      autoplayButton.setAttribute("aria-pressed", String(!userPaused));
      autoplayLabel.textContent = userPaused ? "Otomatik geçişi başlat" : "Otomatik geçişi durdur";
    };

    prev.addEventListener("click", () => {
      goTo(index - 1);
      schedule();
    });
    next.addEventListener("click", () => {
      goTo(index + 1);
      schedule();
    });
    autoplayButton.addEventListener("click", () => {
      userPaused = !userPaused;
      updateAutoplayButton();
      schedule();
    });

    root.addEventListener("mouseenter", () => {
      held = true;
      schedule();
    });
    root.addEventListener("mouseleave", () => {
      held = false;
      schedule();
    });
    root.addEventListener("focusin", () => {
      held = true;
      schedule();
    });
    root.addEventListener("focusout", (event) => {
      if (!root.contains(event.relatedTarget)) {
        held = false;
        schedule();
      }
    });
    root.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      goTo(event.key === "ArrowLeft" ? index - 1 : index + 1);
      schedule();
    });

    viewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || pointerId !== null) return;
      pointerId = event.pointerId;
      pointerStart = event.clientX;
    });
    window.addEventListener("pointerup", (event) => {
      if (event.pointerId !== pointerId || pointerStart === null) return;
      const delta = event.clientX - pointerStart;
      pointerId = null;
      pointerStart = null;
      if (Math.abs(delta) < 48) return;
      goTo(delta < 0 ? index + 1 : index - 1);
      schedule();
    });
    viewport.addEventListener("pointercancel", () => {
      pointerId = null;
      pointerStart = null;
    });

    document.addEventListener("visibilitychange", schedule);
    const viewObserver = new IntersectionObserver(
      (entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        schedule();
      },
      { threshold: 0.25 }
    );
    viewObserver.observe(root);
    const resizeObserver = new ResizeObserver(() => render());
    resizeObserver.observe(viewport);

    if (reducedMotion) track.style.transition = "none";
    updateAutoplayButton();
    render();
    schedule();
  };

  const initWhatsApp = () => {
    const root = document.querySelector("[data-wa]");
    if (!root) return;

    const toggle = root.querySelector("[data-wa-toggle]");
    const panel = root.querySelector("[data-wa-panel]");
    const closeBtn = root.querySelector("[data-wa-close]");
    const form = root.querySelector("[data-wa-form]");
    const field = root.querySelector("[data-wa-message]");
    const phone = "905309013351";

    const isOpen = () => !panel.hasAttribute("hidden");

    const setOpen = (open) => {
      panel.toggleAttribute("hidden", !open);
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        window.setTimeout(() => field.focus(), 30);
      } else if (document.activeElement && root.contains(document.activeElement)) {
        toggle.focus();
      }
    };

    toggle.addEventListener("click", () => setOpen(!isOpen()));
    closeBtn.addEventListener("click", () => setOpen(false));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        event.preventDefault();
        setOpen(false);
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (isOpen() && !root.contains(event.target)) setOpen(false);
    });

    field.addEventListener("input", () => field.setCustomValidity(""));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = field.value.trim();
      if (!message) {
        field.setCustomValidity("Lütfen bir mesaj yazın.");
        field.reportValidity();
        return;
      }

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      panel.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    });
  };

  initNavigation();
  initReveal();
  initGallery();
  initReviews();
  initWhatsApp();
})();
