const list = document.querySelector(".list");
const results = document.querySelector(".resultsReturned");
const filters = document.querySelectorAll(".filters input");

const features = {
    stepFreeEntrance: "Step-free entrance",
    elevator: "Elevator",
    accessibleBathroom: "Accessible washrooms",
    automaticDoors: "Automatic doors"
};

const markers = L.layerGroup().addTo(map);

async function loadLocations() {
    try {
        const query = document.getElementById("query").value.trim();
        const params = new URLSearchParams();
        params.set("q", query);

        for (const filter of filters) {
            if (filter.checked) {
                params.append("feature", filter.value);
            }
        }

        const res = await fetch("/api/locations?" + params.toString());

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!res.ok) {
            throw new Error("Failed to load locations");
        }

        const data = await res.json();
        displayLocations(data.locations);
    } catch (err) {
        results.textContent = "Unable to load locations";
    }
}

function displayLocations(locations) {
    list.innerHTML = "";
    markers.clearLayers();
    results.textContent = locations.length + " matching locations";

    locations.forEach((location, i) => {
        const card = document.createElement("div");
        card.className = "resultCard";

        card.innerHTML = `
            <div class="resultTitle">
                <span class="number">${i + 1}</span>
                <h3></h3>
            </div>
            <p class="address"></p>
            <div class="accessibilityInfo"></div>
            <div class="cardFooter">
                <span class="updated"></span>
                <a class="details">Details →</a>
            </div>
        `;

        card.querySelector("h3").textContent = location.name;
        card.querySelector(".address").textContent = location.address;

        const available = Object.keys(features)
            .filter(key => location.accessibility[key] === "available")
            .map(key => features[key]);

        card.querySelector(".accessibilityInfo").textContent =
            available.length ? available.join(" • ") : "Accessibility unknown";

        card.querySelector(".updated").textContent =
            location.lastReportedOn || "No reports yet";

        card.querySelector(".details").href =
            "location.html?id=" + encodeURIComponent(location.id);

        list.appendChild(card);
        const popup = document.createElement("a");
        popup.textContent = location.name;
        popup.href = "location.html?id=" + encodeURIComponent(location.id);

        L.marker([location.latitude, location.longitude])
            .bindPopup(popup)
            .addTo(markers);
    });
}

document.getElementById("searchForm").addEventListener("submit", function (event) {
    event.preventDefault();
    loadLocations();
});

filters.forEach(filter => {
    filter.addEventListener("change", loadLocations);
});

loadLocations();