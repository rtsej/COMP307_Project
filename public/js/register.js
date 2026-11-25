const form = document.getElementById("registerForm");

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.textContent = "";

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = "search.html";
        } else {
            errorMessage.textContent = data.error.message;
        }
    } catch (error) {
        errorMessage.textContent = "Unable to connect to the server.";
    }
});