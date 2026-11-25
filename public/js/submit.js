const form = document.getElementById("reportForm");
const locationSelect = document.getElementById("location");
const dateInput = document.getElementById("observedOn");
const error = document.getElementById("error");
const submitButton = document.querySelector(".submit");

const locationId = new URLSearchParams(window.location.search).get("locationId");

const today = new Date();
const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().split("T")[0];

dateInput.max = localDate;
dateInput.value = localDate;

async function loadBuildings() {
    try {
        const res = await fetch("/api/locations");

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!res.ok) {
            throw new Error("Unable to load buildings");
        }

        const data = await res.json();

        for (const location of data.locations) {
            const option = document.createElement("option");
            option.value = location.id;
            option.textContent = location.name;
            locationSelect.appendChild(option);
        }

        // Preselect the building when coming from its details page
        if (locationId) {
            locationSelect.value = locationId;
        }

    } catch (err) {
        error.textContent = "Unable to load buildings.";
    }
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    error.textContent = "";

    const selectedLocation = locationSelect.value;
    const observedOn = dateInput.value;
    const comments = document.getElementById("comments").value.trim();

    const features = Array.from(
        document.querySelectorAll('input[name="features"]:checked')
    ).map(input => input.value);

    if (features.length === 0) {
        error.textContent = "Please select at least one accessibility feature.";
        return;
    }

    submitButton.disabled = true;

    try {
        const res = await fetch(
            "/api/locations/" + encodeURIComponent(selectedLocation) + "/reports",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    observedOn,
                    features,
                    comments
                })
            }
        );

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (res.status === 404) {
            error.textContent = "Report submission is not available yet.";
            return;
        }

        const data = await res.json();

        if (!res.ok) {
            error.textContent =
                data.error?.message || "Unable to submit report";
            return;
        }

        window.location.href =
            "location.html?id=" + encodeURIComponent(selectedLocation);

    } catch (err) {
        error.textContent = "Unable to submit report.";
    } finally {
        submitButton.disabled = false;
    }
});

form.addEventListener("reset", function () {
    error.textContent = "";
});

loadBuildings();