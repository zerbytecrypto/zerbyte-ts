// REPLACE THESE with your actual Supabase keys
const supabaseUrl = 'https://odvjvyctqaidcexrqmrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdmp2eWN0cWFpZGNleHJxbXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTU5ODEsImV4cCI6MjA4MzQ5MTk4MX0.anicfODTH70oAhpniUMI_9KWQL7hie6i9cZHzUJa6hU';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

let isLogin = true;

// Element Selectors
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const submitBtn = document.getElementById('submit-btn');
const toggleAuth = document.getElementById('toggle-auth');
const toggleText = document.getElementById('toggle-text');
const messageDiv = document.getElementById('message');

// New Selectors for the missing pieces
const tosContainer = document.getElementById('tos-container');
const forgotPassword = document.getElementById('forgot-password');
const tosCheckbox = document.getElementById('tos-checkbox');

// --- THE SWITCHING LOGIC ---
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault(); 
    isLogin = !isLogin;
    
    // Update UI text
    authTitle.innerText = isLogin ? 'Sign In' : 'Create Account';
    authSubtitle.innerText = isLogin ? 'Enter your details to access your account.' : 'Join Zerbyte to start trading today.';
    submitBtn.innerText = isLogin ? 'Sign In' : 'Create Account';
    toggleText.innerText = isLogin ? "Don't have an account?" : "Already have an account?";
    toggleAuth.innerText = isLogin ? 'Sign Up' : 'Log In';
    
    // FIX: Show/Hide Forgot Password (only for Login)
    if (forgotPassword) forgotPassword.classList.toggle('hidden', !isLogin);
    
    // FIX: Show/Hide TOS Checkbox (only for Signup)
    if (tosContainer) tosContainer.classList.toggle('hidden', isLogin);

    // Clear messages and reset form on switch
    messageDiv.classList.add('hidden');
    authForm.reset();
});

// --- SUBMISSION LOGIC ---
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // FIX: Validation for Checkbox on Signup
    if (!isLogin && tosCheckbox && !tosCheckbox.checked) {
        showMessage("You must agree to the Terms of Service to create an account.", 'error');
        return;
    }

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Loading State
    submitBtn.innerText = isLogin ? 'Signing In...' : 'Creating Account...';
    submitBtn.disabled = true;

    if (isLogin) {
        // LOGIN
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            showMessage(error.message, 'error');
        } else if (data.user && !data.session) {
            showMessage("Please confirm your email address via the link sent to your inbox.", 'warning');
        } else if (data.user) {
            // --- UPDATED LOGIC FOR ADMIN REDIRECTION ---
            showMessage("Success! Redirecting...", 'success');
            
            // Define your Admin email here
            const ADMIN_EMAIL = 'hardpaper1212@gmail.com'; 
            
            // Check if logged in user is Admin
            const target = (email === ADMIN_EMAIL) ? 'admin.html' : 'dashboard.html';
            
            setTimeout(() => {
                window.location.href = target;
            }, 1500);
        }
    } else {
        // SIGN UP
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin + '/index.html'
            }
        });

        if (error) {
            showMessage(error.message, 'error');
        } else {
            showMessage("Verification email sent! You must confirm it to login.", 'success');
            // FIX: Clear form after successful signup
            authForm.reset();
        }
    }

    submitBtn.innerText = isLogin ? 'Sign In' : 'Create Account';
    submitBtn.disabled = false;
});

function showMessage(msg, type) {
    messageDiv.innerText = msg;
    messageDiv.className = 'text-sm p-3 rounded-lg block mb-4'; 
    
    if (type === 'error') {
        messageDiv.classList.add('bg-red-900/20', 'text-red-400', 'border', 'border-red-800/50');
    } else if (type === 'success') {
        messageDiv.classList.add('bg-green-900/20', 'text-[#00d084]', 'border', 'border-[#00d084]/30');
    } else {
        messageDiv.classList.add('bg-yellow-900/20', 'text-yellow-400', 'border', 'border-yellow-800/50');
    }
}