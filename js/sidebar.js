// /js/sidebar.js

(function initSidebar() {

  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("mobileToggle");
  const overlay = document.getElementById("sidebarOverlay");
  const closeBtn = document.getElementById("sidebarClose");

  if (!sidebar) return;

  const closeSidebar = () => {
    sidebar.classList.remove("active");
    overlay?.classList.remove("active");
    document.body.classList.remove("sidebar-open");
  };

  // Toggle button
  toggleBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    overlay?.classList.toggle("active");
    document.body.classList.toggle("sidebar-open");
  });

  // Close button
  closeBtn?.addEventListener("click", closeSidebar);

  // Overlay click
  overlay?.addEventListener("click", closeSidebar);

  // Active link highlight
  const currentPath = window.location.pathname.split("/").pop();

  document.querySelectorAll(".sidebar a").forEach(link => {
    const linkPath = link.getAttribute("href").split("/").pop();

    if (linkPath === currentPath) {
      link.classList.add("active");
    }

    // Close sidebar on link click (mobile)
    link.addEventListener("click", closeSidebar);
  });

})();
