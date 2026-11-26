const reportCount = document.getElementById("reportCount");
const reportList = document.getElementById("reports");
const reportError = document.getElementById("reportError");
const labels = {
    stepFreeEntrance: "Step-free entrance",
    elevator: "Elevator",
    accessibleBathroom: "Accessible washrooms",
    automaticDoors: "Automatic doors"
};

function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
}

function showCount() {
    const count = reportList.children.length;
    reportCount.textContent = count === 0 ? "No submitted reports"
        : count === 1 ? "1 submitted report" : count + " submitted reports";
}

function reportCard(report) {
    const card = element("article", "reportCard", "");
    const header = element("div", "reportHeader", "");
    const buttons = element("div", "reportButtons", "");
    const edit = element("button", "", "Edit");
    const remove = element("button", "", "Delete");
    edit.type = remove.type = "button";
    edit.addEventListener("click", () => {
        window.location.href = "submit.html?reportId=" + encodeURIComponent(report.id);
    });
    remove.addEventListener("click", async () => {
        if (!window.confirm("Delete this report for " + report.locationName + "?")) return;
        reportError.textContent = "";
        edit.disabled = remove.disabled = true;
        try {
            const res = await fetch("/api/reports/" + encodeURIComponent(report.id), { method: "DELETE" });
            if (res.status === 401) {
                window.location.href = "login.html";
                return;
            }
            if (!res.ok && res.status !== 404) throw new Error("Delete failed");
            card.remove();
            showCount();
        } catch {
            reportError.textContent = "Unable to delete this report. Please try again.";
            edit.disabled = remove.disabled = false;
        }
    });
    buttons.append(edit, remove);
    header.append(element("h3", "", report.locationName), buttons);
    card.append(
        header,
        element("p", "date", "Observed " + report.observedOn),
        element("div", "features", report.features.map(key => labels[key]).join(" · ") || "No features selected"),
        element("p", "comment", report.comments)
    );
    return card;
}

async function loadReports() {
    try {
        const res = await fetch("/api/me/reports");
        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!res.ok) throw new Error("Load failed");
        const { reports } = await res.json();
        reportList.replaceChildren(...reports.map(reportCard));
        showCount();
    } catch {
        reportCount.textContent = "Reports unavailable";
        reportError.textContent = "Unable to load your reports. Refresh to try again.";
    }
}
loadReports();
