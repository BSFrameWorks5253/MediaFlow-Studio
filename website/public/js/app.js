/**
 * DataFlow Studio - Landing Page Interactive Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Screenshot Lightbox
  const lightboxModal = document.getElementById("lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const closeLightboxBtn = document.getElementById("close-lightbox");

  document.querySelectorAll(".screenshot-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const fullSrc = thumb.getAttribute("data-full");
      const title = thumb.getAttribute("data-title");
      if (lightboxImg && lightboxModal) {
        lightboxImg.src = fullSrc;
        if (lightboxCaption) lightboxCaption.textContent = title;
        lightboxModal.style.display = "flex";
      }
    });
  });

  if (closeLightboxBtn && lightboxModal) {
    closeLightboxBtn.addEventListener("click", () => {
      lightboxModal.style.display = "none";
    });
  }

  if (lightboxModal) {
    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) {
        lightboxModal.style.display = "none";
      }
    });
  }

  // 2. GitHub Config Modal
  const configModal = document.getElementById("config-modal");
  const openConfigBtn = document.getElementById("btn-configure-repo");
  const closeConfigBtn = document.getElementById("close-config-modal");
  const form = document.getElementById("repo-config-form");
  const ownerInput = document.getElementById("repo-owner-input");
  const repoInput = document.getElementById("repo-name-input");
  const resetBtn = document.getElementById("btn-reset-repo");

  if (openConfigBtn && configModal) {
    openConfigBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const current = getRepoConfig();
      if (ownerInput) ownerInput.value = current.owner;
      if (repoInput) repoInput.value = current.repo;
      configModal.style.display = "flex";
    });
  }

  if (closeConfigBtn && configModal) {
    closeConfigBtn.addEventListener("click", () => {
      configModal.style.display = "none";
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (ownerInput && repoInput) {
        window.configureGitHubRepo(ownerInput.value, repoInput.value);
        configModal.style.display = "none";
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      window.resetGitHubRepo();
      configModal.style.display = "none";
    });
  }

  // 3. Pipeline Tabs
  const stageTabs = document.querySelectorAll(".stage-tab-btn");
  const stagePanels = document.querySelectorAll(".stage-panel");

  stageTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-stage");
      stageTabs.forEach((t) => t.classList.remove("active"));
      stagePanels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const activePanel = document.getElementById(`panel-${targetId}`);
      if (activePanel) activePanel.classList.add("active");
    });
  });
});
