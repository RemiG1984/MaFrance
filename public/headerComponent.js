
/**
 * Header Component
 * Provides reusable header functionality across all pages
 */
export class HeaderComponent {
    constructor() {
        this.currentPath = window.location.pathname.split('/').pop() || 'index.html';
    }

    /**
     * Initialize the header component
     * Should be called after the header HTML is inserted into the page
     */
    init() {
        this.setupMenuToggle();
        this.highlightActivePage();
        this.initializeVersionDropdown();
        this.updatePageTitle();
        // Delay version display update to ensure MetricsConfig is loaded
        setTimeout(() => this.updateVersionDisplay(), 100);
    }

    /**
     * Get the header HTML structure
     */
    getHeaderHTML() {
        return `
            <header class="site-header bg-white shadow">
                <div class="header-content container mx-auto px-4 flex justify-between items-center py-4">
                    <div class="branding flex items-center gap-4">
                        <h1 class="text-3xl font-bold text-gray-800">Ma France: état des lieux</h1>
                        <a
                            href="https://twitter.com/ou_va_ma_France?ref_src=twsrc%5Etfw"
                            class="twitter-follow-button"
                            data-show-count="false"
                        ></a>
                    </div>
                    <nav class="site-nav flex items-center gap-4">
                        <button class="menu-toggle" aria-label="Toggle menu">
                            <span class="hamburger"></span>
                        </button>
                        <ul class="nav-menu flex gap-4">
                            <li>
                                <a href="index.html" class="nav-link">Accueil</a>
                            </li>
                            <li>
                                <a href="rankings.html" class="nav-link">Classements</a>
                            </li>
                            <li>
                                <a href="notice.html" class="nav-link">Méthodologie</a>
                            </li>
                            <li class="version-dropdown">
                                <a href="#" class="nav-link version-toggle">
                                    <span class="version-text">Version neutre ⚖️</span>
                                    <span class="dropdown-arrow">▼</span>
                                </a>
                                <ul class="version-menu">
                                    <li><a href="#" class="version-option">Version neutre ⚖️</a></li>
                                    <li><a href="#" class="version-option">Version inclusive 🌈</a></li>
                                    <li><a href="#" class="version-option">Version identitaire 🦅</a></li>
                                </ul>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>
        `;
    }

    /**
     * Setup mobile menu toggle functionality
     */
    setupMenuToggle() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Menu toggle clicked');
                menuToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
                console.log('Menu active class:', navMenu.classList.contains('active'));
            });

            // Close menu when a link is clicked
            navMenu.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    menuToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    menuToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            });
        }
    }

    /**
     * Highlight the active page in navigation
     */
    highlightActivePage() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === this.currentPath) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Initialize version dropdown functionality
     * Uses MetricsConfig if available
     */
    initializeVersionDropdown() {
        // Import MetricsConfig dynamically if available
        if (typeof window !== 'undefined' && window.MetricsConfig) {
            window.MetricsConfig.initializeVersionDropdown();
        } else {
            // Fallback basic version dropdown functionality
            this.setupBasicVersionDropdown();
        }
    }

    /**
     * Basic version dropdown setup (fallback when MetricsConfig is not available)
     */
    setupBasicVersionDropdown() {
        const versionDropdown = document.querySelector('.version-dropdown');
        const versionToggle = document.querySelector('.version-toggle');
        const versionMenu = document.querySelector('.version-menu');
        
        if (!versionDropdown || versionDropdown.dataset.initialized) return;
        
        versionDropdown.dataset.initialized = "true";
        
        // Toggle dropdown menu visibility
        versionToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            versionMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!versionDropdown.contains(e.target)) {
                versionMenu.classList.remove('active');
            }
        });
        
        // Add click listeners to version options
        const versionOptions = versionMenu.querySelectorAll('.version-option');
        versionOptions.forEach((option, index) => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const versionText = versionToggle.querySelector('.version-text');
                if (versionText) {
                    versionText.textContent = option.textContent;
                }
                
                versionMenu.classList.remove('active');
            });
        });
    }

    /**
     * Update page title based on current page and version state
     */
    updatePageTitle() {
        if (typeof window !== 'undefined' && window.MetricsConfig) {
            document.title = window.MetricsConfig.getCurrentPageTitle();
            
            const headerH1 = document.querySelector('h1');
            if (headerH1) {
                headerH1.textContent = window.MetricsConfig.getCurrentPageTitle();
            }
        }
    }

    /**
     * Load Twitter widgets script
     */
    loadTwitterWidget() {
        if (!document.querySelector('script[src*="platform.twitter.com"]')) {
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://platform.twitter.com/widgets.js';
            script.charset = 'utf-8';
            document.head.appendChild(script);
        }
    }

    /**
     * Render the header into a container element
     * @param {string|HTMLElement} container - Container selector or element
     */
    render(container) {
        const targetElement = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
            
        if (targetElement) {
            targetElement.innerHTML = this.getHeaderHTML();
            this.init();
            this.loadTwitterWidget();
        }
    }

    /**
     * Update version display based on current state
     */
    updateVersionDisplay() {
        const versionText = document.querySelector('.version-text');
        if (!versionText) return;

        if (typeof window !== 'undefined' && window.MetricsConfig) {
            versionText.textContent = window.MetricsConfig.getCurrentVersionLabel();
        } else {
            // If MetricsConfig isn't available yet, try to read from localStorage directly
            const savedState = parseInt(localStorage.getItem('metricsLabelState')) || 0;
            const versionLabels = [
                "Version neutre ⚖️",
                "Version inclusive 🌈", 
                "Version identitaire 🦅"
            ];
            versionText.textContent = versionLabels[savedState] || versionLabels[0];
        }
    }

    /**
     * Static method to create and render header in one call
     * @param {string|HTMLElement} container - Container selector or element
     */
    static create(container) {
        const header = new HeaderComponent();
        header.render(container);
        return header;
    }
}

// Auto-initialize if a header container is found
document.addEventListener('DOMContentLoaded', () => {
    const headerContainer = document.querySelector('#header-container');
    if (headerContainer) {
        const header = HeaderComponent.create(headerContainer);
        
        // Wait a bit for MetricsConfig to be available, then update
        setTimeout(() => {
            header.updateVersionDisplay();
            header.updatePageTitle();
        }, 200);
    }
});
