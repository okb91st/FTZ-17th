"use strict";

/* =========================
   FTZ-17th Archive System
   ========================= */

const archiveState = {
  data: [],
  search: "",
  production: "all",
  branch: "all",
  period: "all",
  country: "all",
  type: "all",
  tag: null
};


/* =========================
   DOM
   ========================= */

const archiveGrid =
  document.querySelector("#archive-grid");

const resultCount =
  document.querySelector("#archive-result-count");

const emptyState =
  document.querySelector("#archive-empty");

const searchInput =
  document.querySelector("#archive-search-input");

const countrySelect =
  document.querySelector("#country-filter");

const typeSelect =
  document.querySelector("#type-filter");

const resetButton =
  document.querySelector("#reset-filters");

const filterButtons =
  document.querySelectorAll(".filter-button");

const tagButtons =
  document.querySelectorAll(".archive-tag-button");

const secondaryResetButtons =
  document.querySelectorAll("[data-reset-archive]");


/* =========================
   LABELS
   ========================= */

const labels = {
  production: {
    custom: "Custom",
    standard: "Standard"
  },

  branch: {
    ground: "Ground",
    air: "Air",
    naval: "Naval"
  },

  period: {
    wwii: "WWII",
    "cold-war": "Cold War",
    modern: "Modern"
  },

  type: {
    "main-battle-tank": "Main Battle Tank",
    "armored-vehicle": "Armored Vehicle",
    aircraft: "Aircraft",
    helicopter: "Helicopter",
    warship: "Warship"
  }
};


/* =========================
   UTILITIES
   ========================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function getLabel(group, value) {
  return (
    labels[group]?.[value] ||
    value ||
    ""
  );
}


/* =========================
   LOAD DATA
   ========================= */

async function loadArchive() {
  if (!archiveGrid) return;

  const source =
    archiveGrid.dataset.source;

  if (!source) {
    showLoadError();
    return;
  }

  try {
    const response =
      await fetch(source);

    if (!response.ok) {
      throw new Error(
        `Archive request failed: ${response.status}`
      );
    }

    const data =
      await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Archive data is not an array."
      );
    }

    archiveState.data = data;

    readURLState();
    syncControls();
    applyArchiveFilters();

  } catch (error) {
    console.error(
      "FTZ Archive:",
      error
    );

    showLoadError();
  }
}


/* =========================
   URL STATE
   ========================= */

function readURLState() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const validFilterValues = {
    production: [
      "custom",
      "standard"
    ],

    branch: [
      "ground",
      "air",
      "naval"
    ],

    period: [
      "wwii",
      "cold-war",
      "modern"
    ]
  };


  for (
    const field of
    ["production", "branch", "period"]
  ) {
    const value =
      params.get(field);

    if (
      value &&
      validFilterValues[field].includes(value)
    ) {
      archiveState[field] = value;
    }
  }


  const country =
    params.get("country");

  if (country) {
    archiveState.country = country;
  }


  const type =
    params.get("type");

  if (type) {
    archiveState.type = type;
  }


  const tag =
    params.get("tag");

  if (tag) {
    archiveState.tag = tag;
  }


  const search =
    params.get("q");

  if (search) {
    archiveState.search = search;
  }
}


function updateURL() {
  const params =
    new URLSearchParams();


  if (archiveState.search) {
    params.set(
      "q",
      archiveState.search
    );
  }


  for (
    const field of
    [
      "production",
      "branch",
      "period",
      "country",
      "type"
    ]
  ) {
    const value =
      archiveState[field];

    if (
      value &&
      value !== "all"
    ) {
      params.set(
        field,
        value
      );
    }
  }


  if (archiveState.tag) {
    params.set(
      "tag",
      archiveState.tag
    );
  }


  const query =
    params.toString();

  const newURL =
    query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;


  window.history.replaceState(
    {},
    "",
    newURL
  );
}


/* =========================
   FILTERING
   ========================= */

function matchesSearch(item) {
  const query =
    normalize(
      archiveState.search
    );

  if (!query) {
    return true;
  }


  const tags =
    Array.isArray(item.tags)
      ? item.tags
          .flatMap(tag => [
            tag.id,
            tag.label
          ])
          .join(" ")
      : "";


  const searchableText = [
    item.id,
    item.name,
    item.country,
    item.countryLabel,
    item.countryZh,
    item.period,
    item.branch,
    item.type,
    item.production,
    item.description,
    tags
  ]
    .join(" ")
    .toLowerCase();


  return searchableText.includes(query);
}


function matchesField(
  item,
  field
) {
  const selected =
    archiveState[field];

  if (
    !selected ||
    selected === "all"
  ) {
    return true;
  }

  return item[field] === selected;
}


function matchesTag(item) {
  if (!archiveState.tag) {
    return true;
  }

  if (!Array.isArray(item.tags)) {
    return false;
  }

  return item.tags.some(
    tag =>
      tag.id === archiveState.tag
  );
}


function getFilteredArchive() {
  return archiveState.data.filter(
    item =>
      matchesSearch(item) &&
      matchesField(item, "production") &&
      matchesField(item, "branch") &&
      matchesField(item, "period") &&
      matchesField(item, "country") &&
      matchesField(item, "type") &&
      matchesTag(item)
  );
}


function applyArchiveFilters() {
  const filtered =
    getFilteredArchive();

  renderArchive(filtered);
  updateResultCount(filtered.length);
  updateEmptyState(filtered.length);
  updateURL();
}


/* =========================
   RENDER
   ========================= */

function renderArchive(items) {
  if (!archiveGrid) return;


  archiveGrid.innerHTML =
    items
      .map(renderArchiveCard)
      .join("");
}


function renderArchiveCard(item) {
  const name =
    escapeHTML(item.name);

  const country =
    escapeHTML(
      item.countryLabel ||
      item.country
    );

  const countryZh =
    escapeHTML(
      item.countryZh || ""
    );

  const description =
    escapeHTML(
      item.description || ""
    );


  const period =
    escapeHTML(
      getLabel(
        "period",
        item.period
      )
    );

  const branch =
    escapeHTML(
      getLabel(
        "branch",
        item.branch
      )
    );

  const type =
    escapeHTML(
      getLabel(
        "type",
        item.type
      )
    );

  const production =
    escapeHTML(
      getLabel(
        "production",
        item.production
      )
    );


  const imageBlock =
    item.image
      ? `
        <div class="archive-card-image">
          <img
            src="${escapeHTML(item.image)}"
            alt="${name}"
            loading="lazy"
          >
        </div>
      `
      : `
        <div class="archive-card-image archive-card-placeholder">
          <span>
            FTZ-17th
          </span>
        </div>
      `;


  const tags =
    Array.isArray(item.tags)
      ? item.tags
          .map(tag => `
            <button
              class="archive-card-tag"
              type="button"
              data-card-tag="${escapeHTML(tag.id)}"
            >
              ${escapeHTML(tag.label)}
            </button>
          `)
          .join("")
      : "";


  const entryLink =
    item.url
      ? `
        <a
          class="archive-card-link"
          href="${escapeHTML(item.url)}"
        >
          VIEW ENTRY →
        </a>
      `
      : "";


  return `
    <article
      class="archive-card"
      data-entry-id="${escapeHTML(item.id)}"
    >

      ${imageBlock}

      <div class="archive-card-body">

        <div class="archive-country">
          <span>
            ${country}
            ${
              countryZh
                ? ` · ${countryZh}`
                : ""
            }
          </span>
        </div>

        <h3>
          ${name}
        </h3>

        <p class="archive-meta">
          ${period}
          ·
          ${branch}
          ·
          ${type}
          ·
          ${production}
        </p>

        ${
          description
            ? `
              <p class="archive-card-description">
                ${description}
              </p>
            `
            : ""
        }

        <div class="archive-card-tags">
          ${tags}
        </div>

        ${entryLink}

      </div>

    </article>
  `;
}


/* =========================
   RESULT STATE
   ========================= */

function updateResultCount(count) {
  if (!resultCount) return;

  resultCount.textContent =
    `${count} ${
      count === 1
        ? "ENTRY"
        : "ENTRIES"
    }`;
}


function updateEmptyState(count) {
  if (!emptyState) return;

  emptyState.hidden =
    count !== 0;
}


function showLoadError() {
  if (archiveGrid) {
    archiveGrid.innerHTML = `
      <div class="archive-loading">

        <strong>
          ARCHIVE UNAVAILABLE
        </strong>

        <p>
          The archive database could not be loaded.
        </p>

      </div>
    `;
  }

  if (resultCount) {
    resultCount.textContent =
      "ARCHIVE ERROR";
  }
}


/* =========================
   CONTROL SYNCHRONIZATION
   ========================= */

function syncControls() {

  /* Search */

  if (searchInput) {
    searchInput.value =
      archiveState.search;
  }


  /* Button filters */

  filterButtons.forEach(button => {
    const field =
      button.dataset.filter;

    const value =
      button.dataset.value;

    button.classList.toggle(
      "active",
      archiveState[field] === value
    );
  });


  /* Select filters */

  if (countrySelect) {
    const countryExists =
      Array.from(
        countrySelect.options
      ).some(
        option =>
          option.value ===
          archiveState.country
      );

    countrySelect.value =
      countryExists
        ? archiveState.country
        : "all";

    if (!countryExists) {
      archiveState.country =
        "all";
    }
  }


  if (typeSelect) {
    const typeExists =
      Array.from(
        typeSelect.options
      ).some(
        option =>
          option.value ===
          archiveState.type
      );

    typeSelect.value =
      typeExists
        ? archiveState.type
        : "all";

    if (!typeExists) {
      archiveState.type =
        "all";
    }
  }


  /* Tag buttons */

  tagButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tag ===
        archiveState.tag
    );
  });
}


/* =========================
   EVENTS
   ========================= */

function initializeEvents() {

  /* Search */

  searchInput?.addEventListener(
    "input",
    event => {
      archiveState.search =
        event.target.value;

      applyArchiveFilters();
    }
  );


  /* Standard button filters */

  filterButtons.forEach(button => {
    button.addEventListener(
      "click",
      () => {
        const field =
          button.dataset.filter;

        const value =
          button.dataset.value;

        if (!field || !value) {
          return;
        }

        archiveState[field] =
          value;

        syncControls();
        applyArchiveFilters();
      }
    );
  });


  /* Country */

  countrySelect?.addEventListener(
    "change",
    event => {
      archiveState.country =
        event.target.value;

      applyArchiveFilters();
    }
  );


  /* Type */

  typeSelect?.addEventListener(
    "change",
    event => {
      archiveState.type =
        event.target.value;

      applyArchiveFilters();
    }
  );


  /* Main tag cloud */

  tagButtons.forEach(button => {
    button.addEventListener(
      "click",
      () => {
        const selectedTag =
          button.dataset.tag;

        archiveState.tag =
          archiveState.tag === selectedTag
            ? null
            : selectedTag;

        syncControls();
        applyArchiveFilters();
      }
    );
  });


  /* Tags generated inside cards */

  archiveGrid?.addEventListener(
    "click",
    event => {
      const tagButton =
        event.target.closest(
          "[data-card-tag]"
        );

      if (!tagButton) {
        return;
      }

      archiveState.tag =
        tagButton.dataset.cardTag;

      syncControls();
      applyArchiveFilters();

      document
        .querySelector(
          ".archive-tags-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }
  );


  /* Reset */

  resetButton?.addEventListener(
    "click",
    resetArchive
  );


  secondaryResetButtons.forEach(
    button => {
      button.addEventListener(
        "click",
        resetArchive
      );
    }
  );
}


/* =========================
   RESET
   ========================= */

function resetArchive() {
  archiveState.search = "";

  archiveState.production =
    "all";

  archiveState.branch =
    "all";

  archiveState.period =
    "all";

  archiveState.country =
    "all";

  archiveState.type =
    "all";

  archiveState.tag =
    null;


  syncControls();
  applyArchiveFilters();
}


/* =========================
   START
   ========================= */

initializeEvents();
loadArchive();
