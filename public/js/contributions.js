const list = document.querySelector(".list");
const reportCount = document.getElementById("reportCount");

const featureNames = {
    stepFreeEntrance: "Step-free entrance",
    elevator: "Elevator",
    accessibleBathroom: "Accessible washrooms",
    automaticDoors: "Automatic doors"
};

// Load the current user's reports
async function loadReports() {
    try {
        const res = await fetch("/api/me/reports");

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
        reportCount.textContent = "Unable to load reports";
    }
}

function displayReports(reports) {
    list.replaceChildren();

    reportCount.textContent = reports.length +
        (reports.length === 1 ? " submitted report" : " submitted reports");

    if (reports.length === 0) {
        list.textContent = "You haven't submitted any reports yet.";
        return;
    }

    for (const report of reports) {
        const card = document.createElement("div");
        card.className = "reportCard";

        const header = document.createElement("div");
        header.className = "reportHeader";

        const name = document.createElement("h3");
        name.textContent = report.locationName;

        const buttons = document.createElement("div");
        buttons.className = "reportButtons";

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";

        editButton.addEventListener("click", function () {
            window.location.href =
                "submit.html?reportId=" + encodeURIComponent(report.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function () {
            deleteReport(report.id);
        });

        buttons.append(editButton, deleteButton);
        header.append(name, buttons);

        const features = document.createElement("div");
        features.className = "features";
        features.textContent = report.features
            .map(feature => featureNames[feature])
            .join(" • ") || "No features selected";

        const comment = document.createElement("p");
        comment.className = "comment";
        comment.textContent = report.comments || "No additional comments.";

        const date = document.createElement("p");
        date.className = "date";
        date.textContent = "Observed on: " + report.observedOn;

        card.append(header, features, comment, date);
        list.appendChild(card);
    }
}

// Confirm before deleting a report
async function deleteReport(reportId) {
    if (!confirm("Are you sure you want to delete this report?")) {
        return;
    }

    try {
        const res = await fetch("/api/reports/" +
            encodeURIComponent(reportId), {
            method: "DELETE"
        });

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!res.ok) {
            const data = await res.json();
            alert(data.error?.message || "Unable to delete report.");
            return;
        }

        loadReports();
    } catch (err) {
        alert("Unable to delete report.");
    }
}

loadReports();