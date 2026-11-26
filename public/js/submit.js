const form = document.getElementById("reportForm");
const locationSelect = document.getElementById("location");
const dateInput = document.getElementById("observedOn");
const commentsInput = document.getElementById("comments");
const featureInputs = form.querySelectorAll('input[name="features"]');
const error = document.getElementById("error");
const submitButton = form.querySelector(".submit");

const params = new URLSearchParams(window.location.search);
const locationId = params.get("locationId");
const reportId = params.get("reportId");
let originalReport;

const today = new Date();
const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().split("T")[0];
dateInput.max = localDate;
dateInput.defaultValue = localDate;

function addBuilding(id, name) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    locationSelect.appendChild(option);
}

function showSavedReport(report) {
    locationSelect.value = report.locationId;
    dateInput.value = report.observedOn;
    commentsInput.value = report.comments;
    for (const input of featureInputs) input.checked = report.features.includes(input.value);
}

async function loadForm() {
    if (reportId) {
        document.querySelector(".title").textContent = "Edit your accessibility report";
        document.querySelector(".back").href = "contributions.html";
        document.querySelector(".back").textContent = "← Back to My Contributions";
        submitButton.textContent = "Save changes";
        form.querySelector(".clear").textContent = "Reset changes";
    }
    try {
        const res = await fetch(reportId ? "/api/me/reports" : "/api/locations");
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!res.ok) throw new Error("Load failed");
        const data = await res.json();
        if (reportId) {
            originalReport = data.reports.find(report => report.id === reportId);
            if (!originalReport) {
                error.textContent = "This report was not found in your contributions.";
                return;
            }
            addBuilding(originalReport.locationId, originalReport.locationName);
            locationSelect.disabled = true;
            dateInput.max = originalReport.observedOn > localDate ? originalReport.observedOn : localDate;
            showSavedReport(originalReport);
        } else {
            for (const location of data.locations) addBuilding(location.id, location.name);
            if (data.locations.some(location => location.id === locationId)) {
                locationSelect.value = locationId;
            }
            if (data.locations.length === 0) {
                error.textContent = "Add a location before submitting an accessibility report.";
                return;
            }
        }
        submitButton.disabled = false;
    } catch {
        error.textContent = reportId ? "Unable to load your report." : "Unable to load buildings.";
    }
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitButton.disabled || (reportId && !originalReport)) return;
    error.textContent = "";

    const selectedLocation = locationSelect.value;
    const observedOn = dateInput.value;
    const comments = commentsInput.value.trim();
    const features = Array.from(featureInputs).filter(input => input.checked).map(input => input.value);

    submitButton.disabled = true;
    try {
        const endpoint = reportId ? "/api/reports/" + encodeURIComponent(reportId)
            : "/api/locations/" + encodeURIComponent(selectedLocation) + "/reports";
        const res = await fetch(endpoint, {
            method: reportId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observedOn, features, comments })
        });
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!res.ok) {
            const data = await res.json();
            error.textContent = data.error?.message || "Unable to save report.";
            return;
        }
        window.location.href = reportId ? "contributions.html"
            : "location.html?id=" + encodeURIComponent(selectedLocation);
    } catch {
        error.textContent = "Unable to save report. Please try again.";
    } finally {
        submitButton.disabled = false;
    }
});

form.addEventListener("reset", event => {
    error.textContent = "";
    if (originalReport) {
        event.preventDefault();
        showSavedReport(originalReport);
    }
});

loadForm();
