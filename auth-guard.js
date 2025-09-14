// Authentication Guard - Include this on all protected pages
(function() {
    // List of pages that don't require authentication
    const publicPages = ['login.html', 'signup.html', 'index.html', 'about.html', 'product.html', 'order-tracking.html'];
    
    // Get current page name
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Check if current page requires authentication
    const requiresAuth = !publicPages.includes(currentPage);
    
    const checkAuth = () => {
        if (window.supabaseService) {
            const user = window.supabaseService.getCurrentUser();

            if (user) {
                // User is logged in, show user info and logout button
                addLogoutButton();
                displayUserInfo();

                // Protect admin page from non-admins
                if (currentPage === 'admin.html' && user.role !== 'admin') {
                    alert('Access denied. You must be an admin to view this page.');
                    window.location.href = 'index.html';
                    return;
                }
            } else {
                // User is not logged in, redirect if the page is protected
                if (requiresAuth) {
                    window.location.href = 'login.html';
                    return;
                }
            }
        } else {
            // Retry after a short delay
            setTimeout(checkAuth, 100);
        }
    };

    // Start auth check when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }
    
    function addLogoutButton() {
        const navRight = document.querySelector('nav ul.nav-right');
        if (navRight) {
            // Clear existing login/signup links
            navRight.innerHTML = '';

            // Add logout button
            const logoutItem = document.createElement('li');
            logoutItem.innerHTML = '<a href="#" id="logoutBtn" style="color: #ff6f61; font-weight: bold;">Logout</a>';
            navRight.appendChild(logoutItem);
            
            document.getElementById('logoutBtn').addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    window.supabaseService.logout();
                    // Redirect to login page after logout
                    window.location.href = 'login.html';
                }
            });
        }
    }
    
    function displayUserInfo() {
        const user = window.supabaseService.getCurrentUser();
        if (user) {
            // Add welcome message to header if it exists
            const header = document.querySelector('nav, header');
            if (header && !document.getElementById('welcomeMessage')) {
                const welcomeDiv = document.createElement('div');
                welcomeDiv.id = 'welcomeMessage';
                welcomeDiv.style.cssText = 'position: absolute; top: 10px; right: 20px; background: rgba(255,255,255,0.9); padding: 5px 10px; border-radius: 15px; font-size: 12px; color: #333;';
                welcomeDiv.textContent = `Welcome, ${user.username}!`;
                header.style.position = 'relative';
                header.appendChild(welcomeDiv);
            }
        }
    }
})();
