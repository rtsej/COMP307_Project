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

loadLocation();