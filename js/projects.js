/* =========================================================
   FTZ-17th
   Projects Data & Filtering
   ========================================================= */

const projectsGrid =
  document.getElementById("projects-grid");

const projectResultCount =
  document.getElementById("project-result-count");

const projectFilterButtons =
  document.querySelectorAll("[data-project-status]");


const projectState = {
  data: [],
  status: "all"
};


/* ---------------------------------------------------------
   ESCAPE HTML
   --------------------------------------------------------- */

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ---------------------------------------------------------
   STATUS CLASS
   --------------------------------------------------------- */

function getStatusClass(status) {
  switch (status) {
    case "in-progress":
      return "status-progress";

    case "planned":
      return "status-planned";

    case "released":
      return "status-released";

    default:
      return "";
  }
}


/* ---------------------------------------------------------
   IMAGE / PLACEHOLDER
   --------------------------------------------------------- */

function renderProjectImage(project) {
  if (project.image) {
    return `
      <img
        src="${escapeHTML(project.image)}"
        alt="${escapeHTML(project.name)}"
        loading="lazy"
      >
    `;
  }

  const placeholder =
    project.placeholder ||
    project.name
      .replace(/Tutorial/gi, "")
      .replace(/Command Variant/gi, "")
      .replace(/Missile Boat/gi, "")
      .trim();

  return `
    <div class="project-image-placeholder">
      ${escapeHTML(placeholder)}
    </div>
  `;
}


/* ---------------------------------------------------------
   PROJECT LINKS
   --------------------------------------------------------- */

function renderProjectLinks(project) {
  const links = [];

  if (project.archiveId) {
    links.push(`
      <a
        class="project-entry-link"
        href="archive.html?q=${encodeURIComponent(project.archiveId)}"
      >
        ARCHIVE
      </a>
    `);
  }

  if (project.bilibili) {
    links.push(`
      <a
        class="project-entry-link"
        href="${escapeHTML(project.bilibili)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        VIDEO ↗
      </a>
    `);
  }

  if (!links.length) {
    return "";
  }

  return `
    <div class="project-entry-links">
      ${links.join("")}
    </div>
  `;
}


/* ---------------------------------------------------------
   PROJECT CARD
   --------------------------------------------------------- */

function createProjectCard(project) {
  const article =
    document.createElement("article");

  article.className = "project-entry";
  article.dataset.status = project.status;


  /* -------------------------------------------------------
     DETAIL PAGE SUPPORT
     ------------------------------------------------------- */

  if (project.page) {
    article.classList.add(
      "project-entry-clickable"
    );

    article.dataset.page =
      project.page;

    article.setAttribute(
      "role",
      "link"
    );

    article.setAttribute(
      "tabindex",
      "0"
    );

    article.setAttribute(
      "aria-label",
      `Open ${project.name} project page`
    );
  }


  const statusClass =
    getStatusClass(project.status);


  article.innerHTML = `
    <div class="project-entry-image">

      ${renderProjectImage(project)}

    </div>

    <div class="project-entry-body">

      <div class="project-entry-top">

        <span
          class="project-status ${statusClass}"
        >
          ${escapeHTML(project.statusLabel)}
        </span>

      </div>

      <h3>
        ${escapeHTML(project.name)}
      </h3>

      <p class="project-entry-description">
        ${escapeHTML(project.description)}
      </p>

      <div class="project-entry-meta">

        <span>
          ${escapeHTML(project.branchLabel)}
        </span>

        <span>
          ${escapeHTML(project.categoryLabel)}
        </span>

      </div>

      ${renderProjectLinks(project)}

    </div>
  `;


  /* -------------------------------------------------------
     WHOLE CARD CLICK
     ------------------------------------------------------- */

  if (project.page) {

    const openProjectPage = () => {
      window.location.href =
        project.page;
    };


    article.addEventListener(
      "click",
      event => {

        /*
          If future ARCHIVE or VIDEO links are clicked,
          let those links work normally instead of
          opening the project detail page.
        */

        if (
          event.target.closest(
            "a, button"
          )
        ) {
          return;
        }

        openProjectPage();
      }
    );


    article.addEventListener(
      "keydown",
      event => {

        if (
          event.key !== "Enter" &&
          event.key !== " "
        ) {
          return;
        }

        if (
          event.target.closest(
            "a, button"
          )
        ) {
          return;
        }

        event.preventDefault();

        openProjectPage();
      }
    );

  }


  return article;
}


/* ---------------------------------------------------------
   FILTER
   --------------------------------------------------------- */

function getVisibleProjects() {
  if (projectState.status === "all") {
    return projectState.data;
  }

  return projectState.data.filter(
    project =>
      project.status === projectState.status
  );
}


/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */

function renderProjects() {
  const visibleProjects =
    getVisibleProjects();

  projectsGrid.innerHTML = "";

  if (!visibleProjects.length) {
    projectsGrid.innerHTML = `
      <div class="projects-empty-state">

        <strong>
          NO PROJECTS FOUND
        </strong>

        <p>
          当前分类中暂时没有项目。
        </p>

      </div>
    `;
  } else {
    visibleProjects.forEach(project => {
      projectsGrid.appendChild(
        createProjectCard(project)
      );
    });
  }

  updateProjectCount(
    visibleProjects.length
  );
}


/* ---------------------------------------------------------
   RESULT COUNT
   --------------------------------------------------------- */

function updateProjectCount(count) {
  const label =
    count === 1
      ? "PROJECT"
      : "PROJECTS";

  projectResultCount.textContent =
    `${count} ${label}`;
}


/* ---------------------------------------------------------
   FILTER BUTTON STATE
   --------------------------------------------------------- */

function syncProjectFilters() {
  projectFilterButtons.forEach(button => {
    const status =
      button.dataset.projectStatus;

    button.classList.toggle(
      "active",
      status === projectState.status
    );
  });
}


/* ---------------------------------------------------------
   EVENTS
   --------------------------------------------------------- */

function initializeProjectEvents() {
  projectFilterButtons.forEach(button => {
    button.addEventListener(
      "click",
      () => {

        projectState.status =
          button.dataset.projectStatus;

        syncProjectFilters();
        renderProjects();

      }
    );
  });
}


/* ---------------------------------------------------------
   LOAD DATA
   --------------------------------------------------------- */

async function loadProjects() {
  if (!projectsGrid) {
    return;
  }

  const source =
    projectsGrid.dataset.source ||
    "data/projects.json";

  try {

    const response =
      await fetch(source);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Project data must be an array."
      );
    }

    projectState.data = data;

    renderProjects();

  } catch (error) {

    console.error(
      "Failed to load FTZ-17th project data:",
      error
    );

    projectsGrid.innerHTML = `
      <div class="projects-empty-state">

        <strong>
          PROJECT DATA UNAVAILABLE
        </strong>

        <p>
          项目数据暂时无法加载。
        </p>

      </div>
    `;

    projectResultCount.textContent =
      "DATA ERROR";
  }
}


/* ---------------------------------------------------------
   INITIALIZE
   --------------------------------------------------------- */

initializeProjectEvents();
syncProjectFilters();
loadProjects();
