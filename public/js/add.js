const form = document.getElementById("addForm");
const error = document.getElementById("error");
const confirmButton = document.querySelector(".confirm");

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    error.textContent = "";

    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const latitude = Number(document.getElementById("latitude").value);
    const longitude = Number(document.getElementById("longitude").value);

    if (!name || !address) {
        error.textContent = "Please fill in all fields.";
        return;
    }

    confirmButton.disabled = true;

    try {
        // Send the new location to the backend
        const res = await fetch("/api/locations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                address,
                latitude,
                longitude
            })
        });

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        const data = await res.json();

        if (!res.ok) {
            error.textContent =
                data.error?.message || "Unable to add location";
            return;
        }

        window.location.href =
            "location.html?id=" + encodeURIComponent(data.location.id);

    } catch (err) {
        error.textContent = "Unable to connect to the server.";
    } finally {
        confirmButton.disabled = false;
    }
});

form.addEventListener("reset", function () {
    error.textContent = "";
});