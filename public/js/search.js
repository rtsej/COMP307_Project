const list = document.querySelector(".list");
const results = document.querySelector(".resultsReturned");

async function loadLocations() {
    try {
        const res = await fetch("/api/locations");

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

        // Accessibility information comes from student reports
        card.querySelector(".accessibilityInfo").textContent =
            "Accessibility information not displayed yet";

        card.querySelector(".updated").textContent =
            location.lastReportedOn || "No reports yet";

        card.querySelector(".details").href =
            "location.html?id=" + encodeURIComponent(location.id);

        list.appendChild(card);
    });
}

loadLocations();