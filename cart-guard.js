function goToCart() {
    // Initialize Supabase if not already done
    if (typeof initializeSupabase === 'function' && !window.supabaseService) {
        initializeSupabase();
    }
    
    // Wait for supabaseService to be available
    const checkLogin = () => {
        if (window.supabaseService) {
            if (window.supabaseService.isLoggedIn()) {
                window.location.href = 'cart.html';
            } else {
                // Store the intended destination and redirect to login
                sessionStorage.setItem('redirect_url', 'cart.html');
                window.location.href = 'login.html';
            }
        } else {
            // Retry after a short delay
            setTimeout(checkLogin, 100);
        }
    };
    checkLogin();
}
