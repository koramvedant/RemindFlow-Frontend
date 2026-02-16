// /js/loadSidebar.js

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("sidebarContainer");
  if (!container) return;

  // Prevent double injection
  if (container.dataset.loaded === "true") return;

  try {
    const response = await fetch("/sidebar.html", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      console.error("Sidebar load failed:", response.status);
      return;
    }

    const html = await response.text();
    container.innerHTML = html;
    container.dataset.loaded = "true";

    // Load sidebar behavior only once
    if (!window.__SIDEBAR_SCRIPT_LOADED__) {
      const script = document.createElement("script");
      script.src = "/js/sidebar.js";
      script.defer = true;
      document.body.appendChild(script);

      window.__SIDEBAR_SCRIPT_LOADED__ = true;
    }

  } catch (error) {
    console.error("Sidebar injection error:", error);
  }
});
