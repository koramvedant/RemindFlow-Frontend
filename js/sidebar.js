// /js/sidebar.js

(function initSidebar() {

  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("mobileToggle");
  const overlay = document.getElementById("sidebarOverlay");
  const closeBtn = document.getElementById("sidebarClose");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!sidebar) return;

  const closeSidebar = () => {
    sidebar.classList.remove("active");
    overlay?.classList.remove("active");
    document.body.classList.remove("sidebar-open");
  };

  toggleBtn?.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    overlay?.classList.toggle("active");
    document.body.classList.toggle("sidebar-open");
  });

  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  // Logout
  logoutBtn?.addEventListener("click", () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login.html";
  });

  // Active link highlight
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".sidebar-link[href]").forEach(link => {
    const linkPath = link.getAttribute("href").split("/").pop();
    if (linkPath === currentPath) {
      link.classList.add("active");
    }
    link.addEventListener("click", closeSidebar);
  });

})();