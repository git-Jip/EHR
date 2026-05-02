document.addEventListener('DOMContentLoaded', () => {
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const dropdownUsername = document.getElementById('dropdown-username');
    const dropdownEmail = document.getElementById('dropdown-email');
    const logoutBtn = document.getElementById('logout-btn');

    // Retrieve user data from localStorage if available
    const actualEmail = localStorage.getItem('userEmail');
    
    // Hide profile and redirect return buttons if no user is logged in
    const headerRight = document.querySelector('.header-right');
    if (!actualEmail) {
        if (headerRight) {
            headerRight.style.display = 'none';
        }
        const returnBtns = document.querySelectorAll('.btn-return');
        returnBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                window.location.href = 'index.html';
            };
        });
    }

    const savedEmail = actualEmail || 'qwerty@gmail.com';
    const emailParts = savedEmail.split('@');
    const savedUsername = emailParts[0];

    if (dropdownUsername) dropdownUsername.textContent = savedUsername;
    if (dropdownEmail) dropdownEmail.textContent = savedEmail;

    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        window.addEventListener('click', () => {
            if (profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        });
        
        // Prevent closing when clicking inside the dropdown
        profileDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear items
            localStorage.removeItem('userEmail');
            // Redirect to login page
            window.location.href = 'index.html';
        });
    }

    // --- FOR PROFILE PAGE (if we are on profile.html) ---
    const profilePageEmail = document.getElementById('profile-page-email');
    const profilePageUsername = document.getElementById('profile-page-username');
    const profilePageInfoEmail = document.getElementById('profile-info-email');

    if (profilePageEmail && profilePageUsername && profilePageInfoEmail) {
        profilePageUsername.textContent = savedUsername;
        profilePageEmail.textContent = savedEmail;
        profilePageInfoEmail.textContent = savedEmail;
    }

});
