const supabaseUrl = 'https://odvjvyctqaidcexrqmrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdmp2eWN0cWFpZGNleHJxbXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTU5ODEsImV4cCI6MjA4MzQ5MTk4MX0.anicfODTH70oAhpniUMI_9KWQL7hie6i9cZHzUJa6hU';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

let isVerified = false;

async function initDashboard() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = 'auth.html'; return; }

    document.getElementById('user-email').innerText = user.email;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile) {
        document.getElementById('total-balance').innerText = `$${(profile.balance || 0).toLocaleString()}`;
        
        // Handle rejection alerts if the email was sent
        if (profile.kyc_status === 'unverified' && profile.rejection_reason) {
            console.log("User was previously rejected for: " + profile.rejection_reason);
        }

        if (profile.kyc_status === 'verified') {
            isVerified = true;
            document.getElementById('verification-status').innerText = "Verified";
            document.getElementById('verification-status').className = "text-xs font-bold px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20";
            
            // SHOW TRADE BUTTON, HIDE VERIFY BUTTON
            document.getElementById('trade-nav-btn')?.classList.remove('hidden');
            document.getElementById('main-verify-btn')?.classList.add('hidden');
        } else if (profile.kyc_status === 'pending') {
            document.getElementById('verification-status').innerText = "Pending Review";
            const vBtn = document.getElementById('main-verify-btn');
            if(vBtn) {
                vBtn.disabled = true;
                vBtn.innerText = "In Progress";
                vBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }
    fetchMarkets();
}

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
function startVerification() { openModal('verify-modal'); }

// KYC SUBMISSION (Updated with Email for notifications)
document.getElementById('kyc-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-kyc-btn');
    const originalText = btn.innerText;
    btn.innerText = "Uploading...";
    btn.disabled = true;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const front = document.getElementById('id-front').files[0];
        const back = document.getElementById('id-back').files[0];
        const ts = Date.now();

        if (!front || !back) throw new Error("Please select both ID images.");

        // Upload to Storage
        const upload1 = await supabaseClient.storage.from('kyc-documents').upload(`${user.id}/f_${ts}`, front);
        const upload2 = await supabaseClient.storage.from('kyc-documents').upload(`${user.id}/b_${ts}`, back);

        if (upload1.error || upload2.error) throw new Error("Image upload failed. Check storage permissions.");

        // Update Profile - IMPORTANT: We now include 'email' so the Edge Function can send notifications
        const { error: dbError } = await supabaseClient.from('profiles').update({
            kyc_status: 'pending',
            email: user.email, // <--- CRITICAL FOR EMAIL FUNCTIONALITY
            first_name: document.getElementById('kyc-fname').value,
            last_name: document.getElementById('kyc-lname').value,
            id_type: document.getElementById('kyc-type').value,
            id_front_url: upload1.data.path,
            id_back_url: upload2.data.path
        }).eq('id', user.id);

        if (dbError) throw dbError;

        alert("Documents submitted successfully! You will receive an email once reviewed.");
        window.location.reload();
    } catch (err) {
        alert("Error: " + err.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

async function fetchMarkets() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=5');
        const data = await res.json();
        const tbody = document.getElementById('asset-table-body');
        if(tbody) {
            tbody.innerHTML = data.map(c => `
                <tr class="border-b border-gray-800">
                    <td class="p-4 flex items-center gap-2"><img src="${c.image}" class="w-6 h-6"> ${c.symbol.toUpperCase()}</td>
                    <td class="p-4 font-mono">$${c.current_price.toLocaleString()}</td>
                </tr>
            `).join('');
        }
    } catch (e) { console.error("Market fetch failed"); }
}

document.getElementById('logout-btn').onclick = () => supabaseClient.auth.signOut().then(() => window.location.href='auth.html');
document.addEventListener('DOMContentLoaded', initDashboard);