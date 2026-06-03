/* ==========================================================================
   CAE - PREMIUM LANDING PAGE & STATE MANAGER
   ========================================================================== */

// Mock Database Initializer (for Courses, Modules, Lessons, Users, and Metrics)
const DEFAULT_COURSES = {
    electronica: {
        title: "Electrónica",
        description: "Desde los fundamentos hasta el diseño avanzado de circuitos electrónicos. Ideal para estudiantes, técnicos e ingenieros.",
        modules: [
            {
                id: "elec-m1",
                title: "Módulo 1: Fundamentos de Circuitos",
                lessons: [
                    { id: "elec-l1", title: "Introducción a la Electrónica", videoId: "bI9sLgAom70", duration: "12:30" },
                    { id: "elec-l2", title: "Ley de Ohm y Leyes de Kirchhoff", videoId: "N5WbZ4W3fR4", duration: "18:45" },
                    { id: "elec-l3", title: "Componentes Pasivos: Resistencias y Condensadores", videoId: "9gNcoq_zGzY", duration: "15:20" }
                ]
            },
            {
                id: "elec-m2",
                title: "Módulo 2: Semiconductores y Amplificadores",
                lessons: [
                    { id: "elec-l4", title: "El Diodo Semiconductor y Aplicaciones", videoId: "k-WmdW58r5E", duration: "22:10" },
                    { id: "elec-l5", title: "Transistores BJT y MOSFET", videoId: "h-g8r9A5bJk", duration: "25:40" },
                    { id: "elec-l6", title: "Amplificadores Operacionales", videoId: "u2p9A34tMlk", duration: "19:15" }
                ]
            },
            {
                id: "elec-m3",
                title: "Módulo 3: Diseño de PCB e Instrumentación",
                lessons: [
                    { id: "elec-l7", title: "Fundamentos de Diseño de Circuitos Impresos", videoId: "p5bA68tRk54", duration: "30:00" },
                    { id: "elec-l8", title: "Uso del Osciloscopio y Multímetro Profesional", videoId: "m2p7Y23lJm8", duration: "24:50" }
                ]
            }
        ]
    },
    mecatronica: {
        title: "Mecatrónica",
        description: "Integra mecánica, electrónica y programación para crear sistemas inteligentes y automatizados.",
        modules: [
            {
                id: "meca-m1",
                title: "Módulo 1: Introducción a la Automatización y Arduino",
                lessons: [
                    { id: "meca-l1", title: "Fundamentos de la Mecatrónica", videoId: "bO2t34tLm9k", duration: "14:20" },
                    { id: "meca-l2", title: "Primeros Pasos con Arduino y C++", videoId: "N5WbZ4W3fR4", duration: "21:10" },
                    { id: "meca-l3", title: "Sensores y Actuadores Básicos", videoId: "9gNcoq_zGzY", duration: "17:50" }
                ]
            },
            {
                id: "meca-m2",
                title: "Módulo 2: Robótica y Control de Motores",
                lessons: [
                    { id: "meca-l4", title: "Motores DC, Servomotores y Motores paso a paso", videoId: "k-WmdW58r5E", duration: "24:30" },
                    { id: "meca-l5", title: "Cinemática de Brazos Robóticos", videoId: "h-g8r9A5bJk", duration: "28:15" },
                    { id: "meca-l6", title: "Programación de Trayectorias y Control PID", videoId: "u2p9A34tMlk", duration: "26:40" }
                ]
            },
            {
                id: "meca-m3",
                title: "Módulo 3: Sistemas de Control Industrial",
                lessons: [
                    { id: "meca-l7", title: "Introducción a los PLCs y Lenguaje Ladder", videoId: "p5bA68tRk54", duration: "32:10" },
                    { id: "meca-l8", title: "Integración de Sistemas IoT en Robótica", videoId: "m2p7Y23lJm8", duration: "25:30" }
                ]
            }
        ]
    }
};

const DEFAULT_STUDENTS = [
    { email: "alumno@cae.com", firstName: "Carlos", lastName: "García", career: "Electrónica", plan: "Profesional", status: "Activo" },
    { email: "maria.lopez@gmail.com", firstName: "María", lastName: "López", career: "Mecatrónica", plan: "Premium", status: "Activo" },
    { email: "jorge.m@yahoo.com", firstName: "Jorge", lastName: "Mendoza", career: "Electrónica", plan: "Básico", status: "Bloqueado" }
];

document.addEventListener('DOMContentLoaded', () => {
    // Database initialization in LocalStorage
    if (!localStorage.getItem('cae_courses')) {
        localStorage.setItem('cae_courses', JSON.stringify(DEFAULT_COURSES));
    }
    if (!localStorage.getItem('cae_students')) {
        localStorage.setItem('cae_students', JSON.stringify(DEFAULT_STUDENTS));
    }

    // Initialize all standard components
    initHeaderScroll();
    initMobileNav();
    initScrollReveal();
    initParticlesCanvas();
    initNewsletterForm();
    initPricingActions();
    initActiveNavOnScroll();
    
    // Auth UI manager
    initAuthUI();
    checkUserSession();
});

/* ==========================================================================
   HEADER SCROLL DETECT
   ========================================================================== */
function initHeaderScroll() {
    const header = document.getElementById('header');
    
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
}

/* ==========================================================================
   MOBILE NAVIGATION MENU
   ========================================================================== */
function initMobileNav() {
    const mobileToggle = document.getElementById('mobile-toggle');
    const primaryNavigation = document.getElementById('primary-navigation');
    const navLinks = primaryNavigation.querySelectorAll('.nav-link');
    
    const toggleMenu = () => {
        const isOpened = mobileToggle.getAttribute('aria-expanded') === 'true';
        
        mobileToggle.setAttribute('aria-expanded', !isOpened);
        mobileToggle.classList.toggle('open');
        primaryNavigation.classList.toggle('open');
        
        document.body.style.overflow = !isOpened ? 'hidden' : '';
    };
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMenu);
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (primaryNavigation.classList.contains('open')) {
                toggleMenu();
            }
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && primaryNavigation.classList.contains('open')) {
            toggleMenu();
        }
    });
}

/* ==========================================================================
   SCROLL REVEAL ANIMATIONS
   ========================================================================== */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    revealElements.forEach(element => {
        observer.observe(element);
    });
}

/* ==========================================================================
   HTML5 CANVAS PARTICLE SYSTEM
   ========================================================================== */
function initParticlesCanvas() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    let animationFrameId;
    
    class Particle {
        constructor(w, h) {
            this.w = w;
            this.h = h;
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * this.w;
            this.y = Math.random() * this.h;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedX = Math.random() * 0.3 - 0.15;
            this.speedY = Math.random() * 0.3 - 0.15;
            this.color = Math.random() > 0.5 ? 'rgba(124, 77, 255, 0.4)' : 'rgba(157, 108, 255, 0.2)';
            this.alpha = Math.random() * 0.5 + 0.2;
            this.fadeSpeed = Math.random() * 0.005 + 0.002;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            this.alpha -= this.fadeSpeed;
            if (this.alpha <= 0 || this.x < 0 || this.x > this.w || this.y < 0 || this.y > this.h) {
                this.reset();
            }
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    const setCanvasSize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const count = Math.min(Math.floor(window.innerWidth / 15), 100);
        particlesArray = [];
        for (let i = 0; i < count; i++) {
            particlesArray.push(new Particle(canvas.width, canvas.height));
        }
    };
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesArray.forEach(p => {
            p.update();
            p.draw();
        });
        animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationFrameId);
        } else {
            animate();
        }
    });
}

/* ==========================================================================
   ACTIVE NAV LINK ON SCROLL
   ========================================================================== */
function initActiveNavOnScroll() {
    const sections = document.querySelectorAll('section[id], footer[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    const handleActiveLink = () => {
        let scrollPosition = window.scrollY + 200;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };
    
    window.addEventListener('scroll', handleActiveLink, { passive: true });
}

/* ==========================================================================
   ADAPTIVE HEADER MENU
   ========================================================================== */
(function initAdaptiveNav() {
    const navList    = document.getElementById('nav-list');
    const moreMenu   = document.getElementById('more-menu');
    const moreBtn    = moreMenu?.querySelector('.more-btn');
    const dropdown   = document.getElementById('more-dropdown');
    const navActions = document.querySelector('.nav-actions');

    if (!navList || !moreMenu || !dropdown) return;

    // ----- Toggle del dropdown -----
    // Usamos mousedown en lugar de click para que se ejecute ANTES
    // del document click que lo cierra
    moreBtn?.addEventListener('mousedown', (e) => {
        e.preventDefault(); // evita que el foco cambie y dispare el click global
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        dropdown.classList.toggle('open', !isOpen);
        moreMenu.setAttribute('aria-expanded', String(!isOpen));
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!moreMenu.contains(e.target)) {
            dropdown.classList.remove('open');
            moreMenu.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdown.classList.remove('open');
            moreMenu.setAttribute('aria-expanded', 'false');
        }
    });

    // ----- Lógica de colapso -----
    function updateNavigation() {

        // En móvil el drawer lateral maneja todo — resetear y salir
        if (window.innerWidth <= 768) {
            [...dropdown.children].forEach(li => navList.insertBefore(li, moreMenu));
            moreMenu.style.display = 'none';
            return;
        }

        // 1. Restaurar todos los items al nav-list
        [...dropdown.children].forEach(li => navList.insertBefore(li, moreMenu));
        moreMenu.style.display = 'none';

        // 2. Espacio disponible para los items de navegación
        //    = ancho total del contenedor - logo - actions - gaps y padding
        const headerContainer = document.querySelector('.header-container');
        const logo            = document.getElementById('logo');
        const containerWidth  = headerContainer?.clientWidth ?? window.innerWidth;
        const logoWidth       = logo?.offsetWidth ?? 0;
        const actionsWidth    = navActions?.offsetWidth ?? 0;
        // gap: 2rem (logo↔nav) + 2rem (nav↔actions) = ~64px + margen seguridad 16px
        const gaps            = 80;
        const available       = containerWidth - logoWidth - actionsWidth - gaps;

        // 3. Medir el ancho de "Ver más" sin afectar el layout
        moreMenu.style.cssText = 'display:block !important; visibility:hidden !important; position:absolute !important;';
        const moreWidth = moreMenu.offsetWidth;
        moreMenu.style.cssText = 'display:none;';

        // 4. Determinar cuántos items caben
        const items = [...navList.children].filter(li => li !== moreMenu);
        let usedWidth = 0;
        let cutIndex  = items.length; // optimista: todos caben

        for (let i = 0; i < items.length; i++) {
            const w = items[i].offsetWidth;
            // Si este NO es el último item, reservar espacio para "Ver más"
            const reserve = (i < items.length - 1) ? moreWidth : 0;

            if (usedWidth + w + reserve > available) {
                cutIndex = i;
                break;
            }
            usedWidth += w;
        }

        // 5. Si hay overflow, mostrar "Ver más" y mover los sobrantes
        if (cutIndex < items.length) {
            moreMenu.style.display = 'block';
            for (let i = cutIndex; i < items.length; i++) {
                dropdown.appendChild(items[i]);
            }
        }
    }

    // Observar cambios de tamaño en el contenedor del header
    const container = document.querySelector('.header-container');
    if (container && typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => updateNavigation()).observe(container);
    } else {
        window.addEventListener('resize', updateNavigation);
    }

    // Doble rAF para garantizar que el layout esté completamente pintado
    requestAnimationFrame(() => requestAnimationFrame(updateNavigation));
})();

/* ==========================================================================
   NEWSLETTER FORM HANDLER
   ========================================================================== */
function initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    const feedback = document.getElementById('newsletter-feedback');
    const input = document.getElementById('newsletter-email');
    
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = input.value.trim();
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (!email) {
            showFeedback('Por favor, ingresa tu correo electrónico.', 'error');
            return;
        }
        if (!emailPattern.test(email)) {
            showFeedback('Por favor, ingresa un correo electrónico válido.', 'error');
            return;
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        input.disabled = true;
        showFeedback('Procesando...', '');
        
        setTimeout(() => {
            showFeedback('¡Suscripción exitosa! Te mantendremos informado.', 'success');
            input.value = '';
            submitBtn.disabled = false;
            input.disabled = false;
        }, 1200);
    });
    
    function showFeedback(message, type) {
        feedback.textContent = message;
        feedback.className = 'form-feedback';
        if (type) feedback.classList.add(type);
    }
}

/* ==========================================================================
   PRICING PLAN ACTION CLICKS
   ========================================================================== */
function initPricingActions() {
    const pricingButtons = document.querySelectorAll('.price-card .plan-btn');
    
    pricingButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const planCard = e.target.closest('.price-card');
            const planName = planCard.querySelector('.plan-name').textContent;
            
            // Check if logged in. If not, pop Register view selecting that plan!
            const loggedInUser = localStorage.getItem('cae_user');
            if (!loggedInUser) {
                const planSelect = document.getElementById('reg-plan');
                if (planSelect) {
                    planSelect.value = planName;
                }
                openAuthModal('register');
            } else {
                showPremiumNotification(planName);
            }
        });
    });
}

function showPremiumNotification(planName) {
    const notification = document.createElement('div');
    notification.className = 'premium-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <svg class="icon-lock" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C4DFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.75rem;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <div>
                <h4 style="color:#ffffff; font-size:1rem; font-weight:600; margin-bottom: 0.15rem;">Procesar Pago</h4>
                <p style="color:#A8B0C5; font-size:0.85rem;">Redirigiendo a pasarela segura para el Plan <strong>${planName}</strong>...</p>
            </div>
        </div>
        <div class="notification-progress"></div>
    `;
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .premium-notification {
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: rgba(10, 16, 48, 0.95);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(124, 77, 255, 0.4);
                box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5), 0 0 30px rgba(124, 77, 255, 0.2);
                border-radius: 12px;
                padding: 1rem 1.5rem;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: slide-in-notification 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                max-width: 350px;
            }
            .notification-content { display: flex; align-items: center; }
            .notification-progress {
                height: 3px;
                background: linear-gradient(90deg, #7C4DFF, #9D6CFF);
                width: 100%;
                margin-top: 1rem;
                transform-origin: left;
                animation: shrink-progress 3s linear forwards;
            }
            @keyframes slide-in-notification {
                from { transform: translateY(50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes shrink-progress {
                from { transform: scaleX(1); }
                to { transform: scaleX(0); }
            }
            @media (max-width: 576px) {
                .premium-notification { left: 20px; right: 20px; max-width: none; bottom: 20px; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/* ==========================================================================
   AUTHENTICATION UI AND MOCK SYSTEM
   ========================================================================== */
function initAuthUI() {
    const modalOverlay = document.getElementById('auth-modal-overlay');
    const closeBtn = document.getElementById('auth-modal-close');
    const guestActions = document.getElementById('auth-guest-actions');
    const userBadge = document.getElementById('user-profile-badge');
    const avatarBtn = document.getElementById('avatar-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    // View Switch buttons
    const toRegister = document.getElementById('to-register-btn');
    const toLogin = document.getElementById('to-login-btn');
    const toForgot = document.getElementById('to-forgot-btn');
    const toLoginFromForgot = document.getElementById('to-login-from-forgot-btn');
    const toLoginFromReset = document.getElementById('to-login-from-reset-btn');
    
    // Auth Forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    const resetForm = document.getElementById('reset-form');
    
    // Lock cards buttons
    const unlockElec = document.getElementById('unlock-elec-btn');
    const unlockMeca = document.getElementById('unlock-meca-btn');
    
    if (!modalOverlay) return;
    
    // Open login or register depending on URL hash
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#login') {
            openAuthModal('login');
        } else if (window.location.hash === '#register') {
            openAuthModal('register');
        }
    });
    
    // Initial check for URL hash on load
    if (window.location.hash === '#login') openAuthModal('login');
    if (window.location.hash === '#register') openAuthModal('register');
    
    // Event listeners to open/close modals
    const loginLinkBtn = document.getElementById('nav-login-btn');
    const registerLinkBtn = document.getElementById('nav-register-btn');
    
    if (loginLinkBtn) {
        loginLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('login');
        });
    }
    if (registerLinkBtn) {
        registerLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal('register');
        });
    }
    
    if (unlockElec) {
        unlockElec.addEventListener('click', () => {
            const user = JSON.parse(localStorage.getItem('cae_user'));
            if (!user) {
                openAuthModal('register');
            } else {
                alert("Debes cambiar tu carrera registrada para desbloquear este curso.");
            }
        });
    }
    if (unlockMeca) {
        unlockMeca.addEventListener('click', () => {
            const user = JSON.parse(localStorage.getItem('cae_user'));
            if (!user) {
                openAuthModal('register');
            } else {
                alert("Debes cambiar tu carrera registrada para desbloquear este curso.");
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAuthModal);
    }
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeAuthModal();
    });
    
    // View switches
    if (toRegister) toRegister.addEventListener('click', () => switchView('register'));
    if (toLogin) toLogin.addEventListener('click', () => switchView('login'));
    if (toForgot) toForgot.addEventListener('click', () => switchView('forgot'));
    if (toLoginFromForgot) toLoginFromForgot.addEventListener('click', () => switchView('login'));
    if (toLoginFromReset) toLoginFromReset.addEventListener('click', () => switchView('login'));
    
    // Toggle avatar menu dropdown
    if (avatarBtn) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = userDropdown.classList.contains('open');
            userDropdown.classList.toggle('open', !isOpen);
            userDropdown.setAttribute('aria-hidden', isOpen);
        });
    }
    
    document.addEventListener('click', () => {
        if (userDropdown) {
            userDropdown.classList.remove('open');
            userDropdown.setAttribute('aria-hidden', 'true');
        }
    });

    // Logout trigger
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('cae_user');
            window.location.hash = '';
            window.location.reload();
        });
    }

    // ======================================================================
    // MOCK LOGIN FORM LOGIC
    // ======================================================================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearFeedback();
            
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value;
            
            if (!email || !pass) {
                showFeedback('Por favor, completa todos los campos.', 'error');
                return;
            }
            
            // Check in mockup students first
            const students = JSON.parse(localStorage.getItem('cae_students')) || [];
            
            // Allow admin bypass
            if (email === "admin@cae.com" && pass === "admin123") {
                const sessionUser = {
                    email: email,
                    firstName: "Admin",
                    lastName: "General",
                    role: "administrador",
                    career: "Ambas",
                    plan: "Full-access"
                };
                localStorage.setItem('cae_user', JSON.stringify(sessionUser));
                showFeedback('¡Ingreso exitoso! Redirigiendo al panel...', 'success');
                setTimeout(() => {
                    closeAuthModal();
                    window.location.href = 'admin.html';
                }, 1000);
                return;
            }
            
            const studentMatch = students.find(s => s.email.toLowerCase() === email.toLowerCase());
            
            if (studentMatch) {
                if (studentMatch.status === "Bloqueado") {
                    showFeedback('Tu cuenta ha sido bloqueada. Contacta a soporte.', 'error');
                    return;
                }
                
                const sessionUser = {
                    email: studentMatch.email,
                    firstName: studentMatch.firstName,
                    lastName: studentMatch.lastName,
                    role: "alumno",
                    career: studentMatch.career,
                    plan: studentMatch.plan
                };
                
                localStorage.setItem('cae_user', JSON.stringify(sessionUser));
                showFeedback('¡Ingreso exitoso! Redirigiendo...', 'success');
                setTimeout(() => {
                    closeAuthModal();
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showFeedback('Credenciales incorrectas o usuario no registrado.', 'error');
            }
        });
    }

    // ======================================================================
    // MOCK REGISTRATION FORM LOGIC
    // ======================================================================
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearFeedback();
            
            const firstName = document.getElementById('reg-firstname').value.trim();
            const lastName = document.getElementById('reg-lastname').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const pass = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('reg-confirm-password').value;
            const career = document.getElementById('reg-career').value;
            const plan = document.getElementById('reg-plan').value;
            const termsChecked = document.getElementById('reg-terms').checked;
            
            if (!firstName || !lastName || !email || !pass || !confirmPass) {
                showFeedback('Por favor, completa todos los campos del registro.', 'error');
                return;
            }
            
            if (pass !== confirmPass) {
                showFeedback('Las contraseñas no coinciden.', 'error');
                return;
            }
            
            if (pass.length < 6) {
                showFeedback('La contraseña debe tener al menos 6 caracteres.', 'error');
                return;
            }
            
            if (!termsChecked) {
                showFeedback('Debes aceptar los términos y condiciones.', 'error');
                return;
            }
            
            const students = JSON.parse(localStorage.getItem('cae_students')) || [];
            
            // Check if email already registered
            if (students.some(s => s.email.toLowerCase() === email.toLowerCase())) {
                showFeedback('El correo ya está registrado en la plataforma.', 'error');
                return;
            }
            
            // Create student
            const newStudent = {
                firstName,
                lastName,
                email,
                career,
                plan,
                status: "Activo"
            };
            
            students.push(newStudent);
            localStorage.setItem('cae_students', JSON.stringify(students));
            
            // Create user session
            const sessionUser = {
                email,
                firstName,
                lastName,
                role: "alumno",
                career,
                plan
            };
            
            localStorage.setItem('cae_user', JSON.stringify(sessionUser));
            
            showFeedback('¡Registro exitoso! Redirigiendo a tu panel...', 'success');
            setTimeout(() => {
                closeAuthModal();
                window.location.href = 'dashboard.html';
            }, 1200);
        });
    }

    // ======================================================================
    // MOCK FORGOT PASSWORD FORM LOGIC
    // ======================================================================
    if (forgotForm) {
        forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearFeedback();
            const email = document.getElementById('forgot-email').value.trim();
            
            if (!email) {
                showFeedback('Por favor, ingresa tu correo.', 'error');
                return;
            }
            
            showFeedback('Enviando enlace...', '');
            
            setTimeout(() => {
                showFeedback('Se ha enviado el enlace de restablecimiento a tu correo.', 'success');
                // Simulate transition to reset view after mail delivery
                setTimeout(() => {
                    switchView('reset');
                }, 1500);
            }, 1000);
        });
    }

    // ======================================================================
    // MOCK RESET PASSWORD FORM LOGIC
    // ======================================================================
    if (resetForm) {
        resetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            clearFeedback();
            const pass = document.getElementById('reset-password').value;
            const confirmPass = document.getElementById('reset-confirm-password').value;
            
            if (!pass || !confirmPass) {
                showFeedback('Por favor, completa ambos campos.', 'error');
                return;
            }
            if (pass !== confirmPass) {
                showFeedback('Las contraseñas no coinciden.', 'error');
                return;
            }
            
            showFeedback('Guardando contraseña...', '');
            setTimeout(() => {
                showFeedback('¡Contraseña actualizada! Ya puedes iniciar sesión.', 'success');
                setTimeout(() => {
                    switchView('login');
                }, 1500);
            }, 1000);
        });
    }
}

// Open modal wrapper helper
function openAuthModal(view = 'login') {
    const modalOverlay = document.getElementById('auth-modal-overlay');
    if (!modalOverlay) return;
    
    modalOverlay.classList.add('open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    switchView(view);
}

// Close modal helper
function closeAuthModal() {
    const modalOverlay = document.getElementById('auth-modal-overlay');
    if (!modalOverlay) return;
    
    modalOverlay.classList.remove('open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Clear hash cleanly
    if (window.location.hash === '#login' || window.location.hash === '#register') {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    clearFeedback();
}

// Switch between modal views
function switchView(view) {
    const views = ['login', 'register', 'forgot', 'reset'];
    views.forEach(v => {
        const element = document.getElementById(`auth-view-${v}`);
        if (element) {
            element.style.display = (v === view) ? 'block' : 'none';
        }
    });
    clearFeedback();
}

// Feedback alerts inside Modal
function showFeedback(message, type) {
    const feedback = document.getElementById('auth-feedback');
    if (!feedback) return;
    
    feedback.textContent = message;
    feedback.className = 'auth-feedback';
    if (type) feedback.classList.add(type);
}

function clearFeedback() {
    const feedback = document.getElementById('auth-feedback');
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'auth-feedback';
    }
}

/* ==========================================================================
   SESSION CHECK & CATALOG LOCK LOGIC (Career based access)
   ========================================================================== */
function checkUserSession() {
    const loggedInUser = localStorage.getItem('cae_user');
    const guestActions = document.getElementById('auth-guest-actions');
    const userBadge = document.getElementById('user-profile-badge');
    const initialsSpan = document.getElementById('user-avatar-initials');
    
    const dropdownName = document.getElementById('user-dropdown-name');
    const dropdownRole = document.getElementById('user-dropdown-role');
    const dropdownCareer = document.getElementById('user-dropdown-career');
    
    // Study areas elements
    const elecCard = document.getElementById('card-electronica');
    const mecaCard = document.getElementById('card-mecatronica');
    const elecLock = document.getElementById('lock-electronica');
    const mecaLock = document.getElementById('lock-mecatronica');
    
    const elecBtn = document.getElementById('btn-elec-action');
    const mecaBtn = document.getElementById('btn-meca-action');
    
    if (!loggedInUser) {
        // No session active
        if (guestActions) guestActions.style.display = 'flex';
        if (userBadge) userBadge.style.display = 'none';
        
        // Ensure locks are hidden on landing page for guest previewing
        if (elecLock) elecLock.style.display = 'none';
        if (mecaLock) mecaLock.style.display = 'none';
        return;
    }
    
    const user = JSON.parse(loggedInUser);
    
    // User session active
    if (guestActions) guestActions.style.display = 'none';
    if (userBadge) userBadge.style.display = 'flex';
    
    // Set user profile info
    if (initialsSpan) {
        const initials = ((user.firstName ? user.firstName[0] : '') + (user.lastName ? user.lastName[0] : '')).toUpperCase();
        initialsSpan.textContent = initials || 'U';
    }
    
    if (dropdownName) dropdownName.textContent = `${user.firstName} ${user.lastName}`;
    if (dropdownRole) dropdownRole.textContent = `Plan ${user.plan || 'Profesional'}`;
    if (dropdownCareer) dropdownCareer.textContent = `Carrera: ${user.career}`;
    
    // Handle specific locks based on selected career
    if (user.role === "administrador") {
        // Admin has unlock permissions to everything
        if (elecLock) elecLock.style.display = 'none';
        if (mecaLock) mecaLock.style.display = 'none';
        
        if (elecBtn) {
            elecBtn.textContent = 'Ver Aula de Electrónica';
            elecBtn.href = 'course.html?c=electronica';
        }
        if (mecaBtn) {
            mecaBtn.textContent = 'Ver Aula de Mecatrónica';
            mecaBtn.href = 'course.html?c=mecatronica';
        }
    } else {
        // Student locking rules:
        if (user.career === "Electrónica") {
            // Unlock Electronica, Lock Mecatronica
            if (elecLock) elecLock.style.display = 'none';
            if (mecaLock) mecaLock.style.display = 'flex';
            
            if (elecBtn) {
                elecBtn.textContent = 'Ir a mi Aula de Electrónica';
                elecBtn.href = 'course.html?c=electronica';
            }
        } else if (user.career === "Mecatrónica") {
            // Unlock Mecatronica, Lock Electronica
            if (elecLock) elecLock.style.display = 'flex';
            if (mecaLock) mecaLock.style.display = 'none';
            
            if (mecaBtn) {
                mecaBtn.textContent = 'Ir a mi Aula de Mecatrónica';
                mecaBtn.href = 'course.html?c=mecatronica';
            }
        }
    }
}
