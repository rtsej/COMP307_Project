const form = document.getElementById("reportForm");
const locationSelect = document.getElementById("location");
const dateInput = document.getElementById("observedOn");
const commentsInput = document.getElementById("comments");
const error = document.getElementById("error");
const submitButton = document.querySelector(".submit");

const params = new URLSearchParams(window.location.search);
const locationId = params.get("locationId");
const reportId = params.get("reportId");

const today = new Date();
const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().split("T")[0];

dateInput.max = localDate;
dateInput.value = localDate;
dateInput.defaultValue = localDate;
submitButton.disabled = true;

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

        if (reportId) {
            await loadReport();
        } else if (locationId) {
            locationSelect.value = locationId;
        }

        submitButton.disabled = false;

    } catch (err) {
        error.textContent = err.message || "Unable to load form.";
    }
}

// Prefill the form when editing an existing report
async function loadReport() {
    const res = await fetch("/api/me/reports");

    if (res.status === 401) {
        window.location.href = "login.html";
        throw new Error("Please sign in.");
    }

    if (!res.ok) {
        throw new Error("Unable to load report.");
    }

    const data = await res.json();
    const report = data.reports.find(item => item.id === reportId);

    if (!report) {
        throw new Error("Report not found.");
    }

    document.title = "Edit Report";
    document.querySelector(".title").textContent = "Edit accessibility report";
    document.querySelector(".subtitle").textContent =
        "Update your accessibility observation.";

    const back = document.querySelector(".back");
    back.href = "contributions.html";
    back.textContent = "← Back to My Contributions";

    submitButton.textContent = "Save changes";

    locationSelect.value = report.locationId;
    locationSelect.disabled = true;
    locationSelect.selectedOptions[0].defaultSelected = true;

    dateInput.value = report.observedOn;
    dateInput.defaultValue = report.observedOn;

    commentsInput.value = report.comments;
    commentsInput.defaultValue = report.comments;

    const checkboxes = document.querySelectorAll('input[name="features"]');

    for (const checkbox of checkboxes) {
        checkbox.checked = report.features.includes(checkbox.value);
        checkbox.defaultChecked = checkbox.checked;
    }

    document.querySelector(".clear").textContent = "Reset changes";
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (submitButton.disabled) {
        return;
    }

    error.textContent = "";

    const selectedLocation = locationSelect.value;
    const observedOn = dateInput.value;
    const comments = commentsInput.value.trim();

    const features = Array.from(
        document.querySelectorAll('input[name="features"]:checked')
    ).map(input => input.value);

    submitButton.disabled = true;

    // Use PATCH for editing and POST for new reports
    const url = reportId
        ? "/api/reports/" + encodeURIComponent(reportId)
        : "/api/locations/" + encodeURIComponent(selectedLocation) + "/reports";

    try {
        const res = await fetch(url, {
            method: reportId ? "PATCH" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                observedOn,
                features,
                comments
            })
        });

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        const data = await res.json();

        if (!res.ok) {
            error.textContent =
                data.error?.message || "Unable to save report.";
            return;
        }

        window.location.href = reportId
            ? "contributions.html"
            : "location.html?id=" + encodeURIComponent(selectedLocation);

    } catch (err) {
        error.textContent = "Unable to save report.";
    } finally {
        submitButton.disabled = false;
    }
});

form.addEventListener("reset", function () {
    error.textContent = "";
});

loadBuildings();