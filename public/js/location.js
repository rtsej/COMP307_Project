const locationId = new URLSearchParams(window.location.search).get("id");
const title = document.querySelector(".title");
const subtitle = document.querySelector(".subtitle");

async function loadLocation() {
    if (!locationId) {
        title.textContent = "No location selected";
        return;
    }

    try {
        const res = await fetch("/api/locations/" + encodeURIComponent(locationId));

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (res.status === 404) {
            title.textContent = "Location not found";
            return;
        }

        if (!res.ok) {
            throw new Error("Failed to load location");
        }

        const data = await res.json();
        displayLocation(data.location);
        loadReports();
    } catch (err) {
        title.textContent = "Unable to load location";
    }
}

function displayLocation(location) {
    title.textContent = location.name;
    subtitle.textContent = location.address;

    // Display accessibility features reported by students
    for (const feature of Object.keys(location.accessibility)) {
        const status = document.getElementById(feature);

        if (status) {
            status.textContent =
                location.accessibility[feature] === "available"
                    ? "Yes"
                    : "Unknown";
        }
    }

    document.getElementById("lastReported").textContent =
        location.lastReportedOn
            ? "Last reported: " + location.lastReportedOn
            : "No reports yet";

    // Only display the library image for McLennan
    if (location.name === "McLennan Library") {
        document.querySelector(".buildingImage img").hidden = false;
        document.getElementById("noImage").hidden = true;
    }

    document.querySelector(".add").href =
        "submit.html?locationId=" + encodeURIComponent(location.id);

    document.querySelector(".content").hidden = false;
}

async function loadReports() {
    const list = document.querySelector(".reportList");

    try {
        const res = await fetch("/api/locations/" +
            encodeURIComponent(locationId) + "/reports");

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!res.ok) {
            throw new Error("Failed to load reports");
        }

        const data = await res.json();
        displayReports(data.reports);
    } catch (err) {
        list.textContent = "Unable to load student reports.";
    }
}

// Display the observations submitted for this building
function displayReports(reports) {
    const list = document.querySelector(".reportList");

    const featureNames = {
        stepFreeEntrance: "Step-free entrance",
        elevator: "Elevator",
        accessibleBathroom: "Accessible bathroom",
        automaticDoors: "Automatic doors"
    };

    list.replaceChildren();

    if (reports.length === 0) {
        list.textContent = "No student reports yet.";
        return;
    }

    for (const report of reports) {
        const card = document.createElement("div");
        card.className = "reportCard";

        const features = document.createElement("p");
        features.className = "reportFeature";
        features.textContent = report.features
            .map(feature => featureNames[feature])
            .join(" • ") || "No features selected";

        const comment = document.createElement("p");
        comment.className = "comment";
        comment.textContent = report.comments || "No additional comments.";

        const date = document.createElement("p");
        date.className = "date";
        date.textContent = "Observed on: " + report.observedOn;

        card.append(features, comment, date);
        list.appendChild(card);
    }
}

loadLocation();