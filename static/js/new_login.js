// ---------- DOM Elements ----------
const studentBtn = document.getElementById('student-btn');
const driverBtn = document.getElementById('driver-btn');
const studentModal = document.getElementById('student-modal');
const driverModal = document.getElementById('driver-modal');
const closeBtns = document.querySelectorAll('.close-btn');
const tabs = document.querySelectorAll('.tab');

// ---------- Modal Controls ----------
studentBtn.addEventListener('click', () => studentModal.style.display = 'flex');
driverBtn.addEventListener('click', () => driverModal.style.display = 'flex');

closeBtns.forEach(btn => btn.addEventListener('click', () => {
    studentModal.style.display = 'none';
    driverModal.style.display = 'none';
}));

window.addEventListener('click', (e) => {
    if (e.target === studentModal) studentModal.style.display = 'none';
    if (e.target === driverModal) driverModal.style.display = 'none';
});

// ---------- Tab Switching ----------
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const modal = tab.closest('.modal-content');
        const tabName = tab.getAttribute('data-tab');
        modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        modal.querySelector(`#${tabName}-tab`).classList.add('active');
    });
});

// ---------- SIGNUP ----------
async function signup(role, name, email, password, confirm) {
    if (password !== confirm) return alert("Passwords do not match!");

    const res = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name, email, password })
    });

    const data = await res.json();
    alert(data.message || "Signup successful!");
}

document.getElementById("student-signup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    signup(
        "student",
        document.getElementById("student-fullname").value,
        document.getElementById("student-signup-email").value,
        document.getElementById("student-signup-password").value,
        document.getElementById("student-confirm-password").value
    );
});

document.getElementById("driver-signup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    signup(
        "driver",
        document.getElementById("driver-fullname").value,
        document.getElementById("driver-signup-email").value,
        document.getElementById("driver-signup-password").value,
        document.getElementById("driver-confirm-password").value
    );
});

// ---------- LOGIN ----------
async function login(role, email, password) {
    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, email, password })
    });

    const data = await res.json();

    if (data.status === "success" && data.redirect) {
        // ✅ Redirect to correct dashboard
        window.location.href = data.redirect;
    } else {
        alert(data.message || "Invalid login!");
    }
}

document.getElementById("student-login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    login(
        "student",
        document.getElementById("student-email").value,
        document.getElementById("student-password").value
    );
});

document.getElementById("driver-login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    login(
        "driver",
        document.getElementById("driver-email").value,
        document.getElementById("driver-password").value
    );
});
