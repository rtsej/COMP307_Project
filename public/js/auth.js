async function checkSession() {
    try {
        const res = await fetch("/api/auth/me");

        if (res.status === 401) {
            window.location.href = "login.html";
        } else if (!res.ok) {
            throw new Error("Unable to check session");
        }
    } catch (err) {
        console.error("Unable to check session", err);
    }
}

async function logout() {
    try {
        const res = await fetch("/api/auth/logout", {
            method: "POST"
        });

        if (res.ok || res.status === 401) {
            window.location.href = "login.html";
        } else {
            alert("Unable to log out.");
        }
    } catch (err) {
        alert("Unable to connect to the server.");
    }
}

document.getElementById("logout").addEventListener("click", logout);

checkSession();