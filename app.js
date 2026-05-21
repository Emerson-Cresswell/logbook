const STORAGE_KEY = "procedureLogbookData_v1";
const APP_VERSION = "v52";

let state = {
  entries: [],
  hospitals: [],
  placements: [],
  procedureSettings: emptyProcedureSettings(),
  customOptions: {
    specialty: [],
    context: [],
    procedure: [],
    siteByProcedure: {},
    cpdType: [],
    cpdFormat: [],
    cpdTopic: []
  },
  hiddenDefaultOptions: {
    specialty: [],
    context: [],
    procedure: [],
    siteByProcedure: {},
    cpdType: [],
    cpdFormat: [],
    cpdTopic: []
  },
  backup: {
    lastBackupAt: null,
    changeCountSinceBackup: 0
  }
};

let currentScreen = "homeScreen";
let currentEntryType = null;
let wizardSteps = [];
let wizardIndex = 0;
let draft = {};
let currentEntrySummaryExpanded = false;
let logbookFilter = "all";
let editingEntryId = null;
let editReturnScreen = null;
let editReturnScrollY = 0;
let editOriginalComparableData = null;
let placementsBackAction = () => showScreen("homeScreen");
let specialtiesProceduresBackAction = () => showScreen("homeScreen");
let activeHomeGuard = null;

const procedureSteps = [
  "date",
  "placement",
  "specialty",
  "hospital",
  "context",
  "procedure",
  "site",
  "technique",
  "role",
  "supervision",
  "outcome",
  "attempts",
  "complication",
  "notes",
  "review"
];

const cpdSteps = [
  "date",
  "placement",
  "cpdType",
  "cpdFormat",
  "cpdTopic",
  "cpdDetails",
  "cpdTime",
  "cpdReflection",
  "cpdEvidence",
  "review"
];

const defaultSpecialties = [
  { id: "critical-care", name: "Critical Care" },
  { id: "anaesthetics", name: "Anaesthetics" },
  { id: "emergency-medicine", name: "Emergency Medicine" },
  { id: "acute-medicine", name: "Acute Medicine" }
];

const defaultProcedureCategories = [
  { id: "vascular-access", name: "Line insertion" },
  { id: "airway", name: "Airway" },
  { id: "ultrasound", name: "Ultrasound" },
  { id: "drains", name: "Drains" },
  { id: "halo", name: "HALO procedures" },
  { id: "other", name: "Other procedures" }
];

const defaultProcedureLibrary = [
  { id: "central-venous-catheter", name: "Central venous catheter", needsSite: true, needsTechnique: false },
  { id: "arterial-line", name: "Arterial line", needsSite: true, needsTechnique: true },
  { id: "intubation", name: "Intubation", needsSite: false, needsTechnique: false },
  { id: "chest-drain", name: "Chest drain", needsSite: true, needsTechnique: false },
  { id: "lumbar-puncture", name: "Lumbar puncture", needsSite: false, needsTechnique: false },
  { id: "ascitic-drain", name: "Ascitic drain", needsSite: true, needsTechnique: false },
  { id: "bronchoscopy", name: "Bronchoscopy", needsSite: false, needsTechnique: false },
  { id: "tracheostomy-related-procedure", name: "Tracheostomy-related procedure", needsSite: false, needsTechnique: false },
  { id: "other", name: "Other", needsSite: false, needsTechnique: false }
];

const defaultSpecialtyProcedureAssignments = {
  "critical-care": {
    "vascular-access": ["central-venous-catheter", "arterial-line"],
    "airway": ["intubation", "tracheostomy-related-procedure", "bronchoscopy"],
    "drains": ["chest-drain", "ascitic-drain"],
    "other": ["lumbar-puncture", "other"]
  },
  "anaesthetics": {
    "airway": ["intubation"],
    "vascular-access": ["arterial-line", "central-venous-catheter"],
    "other": ["other"]
  },
  "emergency-medicine": {
    "halo": ["intubation", "chest-drain"],
    "vascular-access": ["arterial-line", "central-venous-catheter"],
    "other": ["lumbar-puncture", "other"]
  },
  "acute-medicine": {
    "drains": ["ascitic-drain", "chest-drain"],
    "other": ["lumbar-puncture", "other"]
  }
};

const defaultProcedureOptions = {
  specialty: defaultSpecialties.map(specialty => specialty.name),
  procedure: [
    "Central venous catheter",
    "Arterial line",
    "Intubation",
    "Chest drain",
    "Lumbar puncture",
    "Ascitic drain",
    "Bronchoscopy",
    "Tracheostomy-related procedure",
    "Other"
  ],
  context: [
    "ICU",
    "Theatre",
    "Emergency Department",
    "Ward",
    "Transfer",
    "Clinic",
    "Other"
  ],
  technique: ["Ultrasound", "Landmark"],
  role: ["Observed", "Assisted", "Primary operator", "Supervisor"],
  supervision: [
    "Direct supervision",
    "Indirect supervision",
    "Independent",
    "Supervising another clinician"
  ],
  outcome: ["Successful", "Unsuccessful"],
  complication: [
    "None",
    "Failed procedure",
    "Bleeding",
    "Arterial puncture",
    "Pneumothorax",
    "Malposition",
    "Other"
  ]
};

const defaultSiteOptionsByProcedure = {
  "Central venous catheter": [
    "Right IJ",
    "Left IJ",
    "Right femoral",
    "Left femoral",
    "Right subclavian",
    "Left subclavian",
    "Other"
  ],
  "Arterial line": [
    "Right radial",
    "Left radial",
    "Right femoral",
    "Left femoral",
    "Right brachial",
    "Left brachial",
    "Dorsalis pedis",
    "Other"
  ],
  "Chest drain": ["Right chest", "Left chest", "Other"],
  "Ascitic drain": ["Right abdomen", "Left abdomen", "Midline", "Other"]
};

const defaultCpdOptions = {
  cpdType: [
    "Course",
    "Conference",
    "Teaching session",
    "Simulation",
    "E-learning",
    "Podcast",
    "Journal/article",
    "Guideline review",
    "Departmental teaching",
    "Self-directed learning",
    "Other"
  ],
  cpdFormat: [
    "In person",
    "Online live",
    "Online recorded",
    "Podcast/audio",
    "Reading",
    "Practical/simulation",
    "Other"
  ],
  cpdTopic: [
    "ICU",
    "Anaesthetics",
    "Emergency Medicine",
    "Acute Medicine",
    "PHEM/Retrieval",
    "Governance/QI",
    "Teaching/Education",
    "Leadership/Management",
    "Other"
  ],
  cpdTime: ["15 minutes", "30 minutes", "1 hour", "2 hours", "Half day", "Full day", "Custom"],
  cpdEvidence: ["Certificate available", "Attendance recorded", "Reflection only", "No evidence", "Other"]
};

const configurableFields = [
  "context",
  "procedure",
  "site",
  "cpdType",
  "cpdFormat",
  "cpdTopic"
];

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function todayISO() {
  const date = new Date();
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "Not recorded";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatShortDateTime(dateValue) {
  if (!dateValue) return "Never";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Never";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatFileDateTime(date = new Date()) {
  const day = padNumber(date.getDate());
  const month = padNumber(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = padNumber(date.getHours());
  const minutes = padNumber(date.getMinutes());
  return `${day}-${month}-${year} ${hours}${minutes}`;
}

function normaliseText(value) {
  return String(value || "").trim().toLowerCase();
}

function emptyOptionStore() {
  return {
    specialty: [],
    context: [],
    procedure: [],
    siteByProcedure: {},
    cpdType: [],
    cpdFormat: [],
    cpdTopic: []
  };
}


function emptyProcedureSettings() {
  return {
    hiddenCategories: [],
    hiddenAssignments: [],
    removedAssignments: [],
    customProcedures: [],
    customAssignments: []
  };
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const cleaned = [];

  value.forEach(item => {
    const text = String(item || "").trim();
    const key = text.toLowerCase();

    if (text && !seen.has(key)) {
      seen.add(key);
      cleaned.push(text);
    }
  });

  return cleaned;
}

function cleanOptionStore(store) {
  const base = emptyOptionStore();
  const input = store || {};

  Object.keys(base).forEach(key => {
    if (key === "siteByProcedure") {
      base.siteByProcedure = {};
      const siteInput = input.siteByProcedure || {};

      Object.keys(siteInput).forEach(procedureName => {
        base.siteByProcedure[procedureName] = cleanArray(siteInput[procedureName]);
      });
    } else {
      base[key] = cleanArray(input[key]);
    }
  });

  return base;
}


function cleanProcedureSettings(settings) {
  const input = settings || {};
  const output = emptyProcedureSettings();

  output.hiddenCategories = cleanArray(input.hiddenCategories || []);
  output.hiddenAssignments = cleanArray(input.hiddenAssignments || []);
  output.removedAssignments = cleanArray(input.removedAssignments || []);

  output.customProcedures = Array.isArray(input.customProcedures)
    ? input.customProcedures
        .map(item => ({
          id: String(item && item.id ? item.id : makeId()),
          name: String(item && item.name ? item.name : "").trim(),
          needsSite: Boolean(item && item.needsSite),
          needsTechnique: Boolean(item && item.needsTechnique),
          createdAt: item && item.createdAt ? item.createdAt : new Date().toISOString(),
          updatedAt: item && item.updatedAt ? item.updatedAt : new Date().toISOString()
        }))
        .filter(item => item.name)
    : [];

  output.customAssignments = Array.isArray(input.customAssignments)
    ? input.customAssignments
        .map(item => ({
          procedureId: String(item && item.procedureId ? item.procedureId : ""),
          specialtyId: String(item && item.specialtyId ? item.specialtyId : ""),
          categoryId: String(item && item.categoryId ? item.categoryId : "")
        }))
        .filter(item => item.procedureId && item.specialtyId && item.categoryId)
    : [];

  return output;
}

function cleanPlacements(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const cleaned = [];

  value.forEach((item, index) => {
    const source = typeof item === "string" ? { name: item } : (item || {});
    const name = String(source.name || source.title || "").trim();
    const startDate = String(source.startDate || "").trim();
    const endDate = String(source.endDate || "").trim();

    if (!name) return;

    const key = `${name.toLowerCase()}|${startDate}|${endDate}`;
    if (seen.has(key)) return;
    seen.add(key);

    cleaned.push({
      id: String(source.id || `placement-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`),
      name,
      startDate,
      endDate,
      hidden: Boolean(source.hidden),
      createdAt: source.createdAt || new Date().toISOString(),
      updatedAt: source.updatedAt || source.createdAt || new Date().toISOString()
    });
  });

  return cleaned.sort((a, b) => {
    const dateCompare = (b.startDate || "").localeCompare(a.startDate || "");
    if (dateCompare !== 0) return dateCompare;
    return a.name.localeCompare(b.name);
  });
}

function formatPlacementRange(placement) {
  if (!placement) return "Date range not recorded";

  if (placement.startDate && placement.endDate) {
    return `${formatDate(placement.startDate)} – ${formatDate(placement.endDate)}`;
  }

  if (placement.startDate) return `From ${formatDate(placement.startDate)}`;
  if (placement.endDate) return `Until ${formatDate(placement.endDate)}`;
  return "Date range not recorded";
}

function formatPlacementLabel(placement) {
  if (!placement) return "Placement not recorded";
  return `${placement.name} · ${formatPlacementRange(placement)}`;
}

function getPlacementById(placementId) {
  if (!placementId) return null;
  return state.placements.find(placement => placement.id === placementId) || null;
}

function formatPlacementSnapshot(name, startDate = "", endDate = "") {
  const placementName = String(name || "").trim();

  if (!placementName) {
    return "Not linked to a placement";
  }

  return formatPlacementLabel({ name: placementName, startDate, endDate });
}

function getEntryPlacementDisplay(entry) {
  if (!entry) return "Not linked to a placement";

  const livePlacement = getPlacementById(entry.placementId);

  if (livePlacement) {
    return formatPlacementLabel(livePlacement);
  }

  return formatPlacementSnapshot(entry.placementName, entry.placementStartDate, entry.placementEndDate);
}

function getEntryPlacementExport(entry) {
  const display = getEntryPlacementDisplay(entry);
  return display === "Not linked to a placement" ? "" : display;
}

function placementIncludesDate(placement, dateISO) {
  if (!placement || !placement.startDate || !placement.endDate || !dateISO) return false;
  return placement.startDate <= dateISO && placement.endDate >= dateISO;
}

function sortPlacementsForEntry(placements) {
  const referenceDate = todayISO();

  return [...placements].sort((a, b) => {
    const aActive = placementIncludesDate(a, referenceDate);
    const bActive = placementIncludesDate(b, referenceDate);

    if (aActive !== bActive) return aActive ? -1 : 1;

    const endCompare = (b.endDate || "").localeCompare(a.endDate || "");
    if (endCompare !== 0) return endCompare;

    const startCompare = (b.startDate || "").localeCompare(a.startDate || "");
    if (startCompare !== 0) return startCompare;

    return a.name.localeCompare(b.name);
  });
}

function setDraftPlacement(placement) {
  if (!placement) {
    draft.placementId = "";
    draft.placementName = "";
    draft.placementStartDate = "";
    draft.placementEndDate = "";
    return;
  }

  draft.placementId = placement.id;
  draft.placementName = placement.name;
  draft.placementStartDate = placement.startDate || "";
  draft.placementEndDate = placement.endDate || "";
}

function ensureStateShape() {
  state.entries = Array.isArray(state.entries) ? state.entries : [];
  state.hospitals = cleanArray(state.hospitals).sort((a, b) => a.localeCompare(b));
  state.placements = cleanPlacements(state.placements);
  state.procedureSettings = cleanProcedureSettings(state.procedureSettings);
  state.customOptions = cleanOptionStore(state.customOptions);
  state.hiddenDefaultOptions = cleanOptionStore(state.hiddenDefaultOptions);
  state.backup = state.backup || { lastBackupAt: null, changeCountSinceBackup: 0 };

  if (typeof state.backup.changeCountSinceBackup !== "number") {
    state.backup.changeCountSinceBackup = 0;
  }
}

function saveState() {
  ensureStateShape();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  let saved = null;

  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Unable to read saved data.", error);
    return;
  }

  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state = {
      entries: parsed.entries || [],
      hospitals: parsed.hospitals || [],
      placements: parsed.placements || [],
      procedureSettings: parsed.procedureSettings || emptyProcedureSettings(),
      customOptions: parsed.customOptions || emptyOptionStore(),
      hiddenDefaultOptions: parsed.hiddenDefaultOptions || emptyOptionStore(),
      backup: parsed.backup || { lastBackupAt: null, changeCountSinceBackup: 0 }
    };
    ensureStateShape();
  } catch (error) {
    console.error("There was a problem loading saved data.", error);
    showAppAlert("There was a problem loading saved data. The app will open with a blank local copy. Your existing browser data has not been deleted.");
  }
}

function markChanged() {
  state.backup.changeCountSinceBackup += 1;
  saveState();
  renderBackupStatus();
}

function markBackedUp() {
  state.backup.lastBackupAt = new Date().toISOString();
  state.backup.changeCountSinceBackup = 0;
  saveState();
  renderBackupStatus();
}

function showScreen(screenId) {
  activeHomeGuard = null;

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  const screen = document.getElementById(screenId);
  if (!screen) return;

  screen.classList.add("active");
  currentScreen = screenId;

  if (screenId === "logbookScreen") renderLogbook();
  if (screenId === "summariesScreen") renderSummaries();
  if (screenId === "placementsScreen") renderPlacements();
  if (screenId === "specialtiesProceduresScreen") renderSpecialtiesProceduresHome();
  if (screenId === "homeScreen") renderVersionLabel();
  if (screenId === "homeScreen" || screenId === "backupScreen") renderBackupStatus();

  updateFloatingNavigationControls();
}

function renderBackupStatus() {
  const changeCount = state.backup.changeCountSinceBackup;
  const needsBackup = changeCount > 0;
  const lastBackup = formatShortDateTime(state.backup.lastBackupAt);
  const title = needsBackup ? "Backup needed" : "Backup up to date";
  const changeWord = changeCount === 1 ? "change" : "changes";
  const text = needsBackup
    ? `${changeCount} ${changeWord} since last backup\nLast backup: ${lastBackup}`
    : `Last backup: ${lastBackup}`;

  const backupCard = document.getElementById("backupCard");
  const backupTitle = document.getElementById("backupTitle");
  const backupText = document.getElementById("backupText");
  const backupNowButton = document.getElementById("backupNowButton");

  if (backupCard && backupTitle && backupText && backupNowButton) {
    backupCard.classList.toggle("backup-ok", !needsBackup);
    backupCard.classList.toggle("backup-needed", needsBackup);
    backupTitle.textContent = title;
    backupText.textContent = text;
    backupNowButton.classList.toggle("hidden", !needsBackup);
  }

  const backupScreenStatus = document.getElementById("backupScreenStatus");
  const backupScreenTitle = document.getElementById("backupScreenTitle");
  const backupScreenText = document.getElementById("backupScreenText");

  if (backupScreenStatus && backupScreenTitle && backupScreenText) {
    backupScreenStatus.classList.toggle("backup-ok", !needsBackup);
    backupScreenStatus.classList.toggle("backup-needed", needsBackup);
    backupScreenTitle.textContent = title;
    backupScreenText.textContent = text;
  }
}

function getDefaultOptions(field, procedureName = "") {
  if (field === "site") return defaultSiteOptionsByProcedure[procedureName] || [];
  if (defaultProcedureOptions[field]) return defaultProcedureOptions[field];
  if (defaultCpdOptions[field]) return defaultCpdOptions[field];
  return [];
}

function getStoredOptionList(storeName, field, procedureName = "") {
  const store = state[storeName] || emptyOptionStore();

  if (field === "site") {
    store.siteByProcedure = store.siteByProcedure || {};
    return cleanArray(store.siteByProcedure[procedureName] || []);
  }

  return cleanArray(store[field] || []);
}

function setStoredOptionList(storeName, field, list, procedureName = "") {
  if (!state[storeName]) state[storeName] = emptyOptionStore();

  if (field === "site") {
    state[storeName].siteByProcedure = state[storeName].siteByProcedure || {};
    state[storeName].siteByProcedure[procedureName] = cleanArray(list);
    return;
  }

  state[storeName][field] = cleanArray(list);
}

function getDisplayedOptions(field, procedureName = "") {
  const defaults = getDefaultOptions(field, procedureName);
  const hiddenDefaults = getStoredOptionList("hiddenDefaultOptions", field, procedureName).map(normaliseText);
  const visibleDefaults = defaults.filter(option => !hiddenDefaults.includes(normaliseText(option)));
  const visibleKeys = new Set(visibleDefaults.map(normaliseText));
  const custom = getStoredOptionList("customOptions", field, procedureName)
    .filter(option => !visibleKeys.has(normaliseText(option)))
    .sort((a, b) => a.localeCompare(b));

  return [...visibleDefaults, ...custom];
}

function optionExists(field, value, procedureName = "") {
  const key = normaliseText(value);
  return getDisplayedOptions(field, procedureName).some(option => normaliseText(option) === key);
}

function addUserOption(field, value, procedureName = "") {
  const text = String(value || "").trim();

  if (!text) {
    showAppAlert("Please enter an option.");
    return false;
  }

  if (optionExists(field, text, procedureName)) {
    showAppAlert("This option already exists.");
    return false;
  }

  const defaults = getDefaultOptions(field, procedureName);
  const defaultMatch = defaults.find(option => normaliseText(option) === normaliseText(text));

  if (defaultMatch) {
    const hidden = getStoredOptionList("hiddenDefaultOptions", field, procedureName)
      .filter(option => normaliseText(option) !== normaliseText(defaultMatch));
    setStoredOptionList("hiddenDefaultOptions", field, hidden, procedureName);
  } else {
    const custom = getStoredOptionList("customOptions", field, procedureName);
    custom.push(text);
    setStoredOptionList("customOptions", field, custom, procedureName);
  }

  markChanged();
  return true;
}

function deleteUserOption(field, value, procedureName = "") {
  const defaults = getDefaultOptions(field, procedureName);
  const defaultMatch = defaults.find(option => normaliseText(option) === normaliseText(value));

  if (defaultMatch) {
    const hidden = getStoredOptionList("hiddenDefaultOptions", field, procedureName);
    hidden.push(defaultMatch);
    setStoredOptionList("hiddenDefaultOptions", field, hidden, procedureName);
  } else {
    const custom = getStoredOptionList("customOptions", field, procedureName)
      .filter(option => normaliseText(option) !== normaliseText(value));
    setStoredOptionList("customOptions", field, custom, procedureName);
  }

  if (normaliseText(draft[field]) === normaliseText(value)) delete draft[field];

  if (field === "procedure") {
    delete draft.site;
    delete draft.technique;
  }

  markChanged();
}

function fieldLabel(field) {
  const labels = {
    specialty: "Specialty",
    context: "Location",
    procedure: "Procedure",
    site: "Site",
    cpdType: "CPD type",
    cpdFormat: "Format",
    cpdTopic: "Topic area"
  };

  return labels[field] || "Option";
}

function isConfigurableField(field) {
  return configurableFields.includes(field);
}

function procedureSupportsSite(procedureName) {
  if (!procedureName) return false;

  const hasDefaultSites = Object.prototype.hasOwnProperty.call(defaultSiteOptionsByProcedure, procedureName);
  const hasCustomSites = getStoredOptionList("customOptions", "site", procedureName).length > 0;

  return hasDefaultSites || hasCustomSites;
}

function isStepRelevant(step) {
  if (step === "site") return currentEntryType === "procedure" && procedureSupportsSite(draft.procedure);
  if (step === "technique") return currentEntryType === "procedure" && draft.procedure === "Arterial line";
  return true;
}

function getRelevantWizardSteps() {
  return wizardSteps.filter(step => isStepRelevant(step));
}

function findNextRelevantIndex(startIndex, direction) {
  let index = startIndex + direction;

  while (index >= 0 && index < wizardSteps.length) {
    if (isStepRelevant(wizardSteps[index])) return index;
    index += direction;
  }

  return null;
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function startEntry(type) {
  currentEntryType = type;
  editingEntryId = null;
  editReturnScreen = null;
  editReturnScrollY = 0;
  editOriginalComparableData = null;
  draft = {
    id: makeId(),
    type,
    date: todayISO(),
    placementId: "",
    placementName: "",
    placementStartDate: "",
    placementEndDate: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  wizardSteps = type === "procedure" ? procedureSteps : cpdSteps;
  wizardIndex = 0;
  currentEntrySummaryExpanded = false;
  showScreen("wizardScreen");
  renderWizard();
}

function editEntry(entryId) {
  const entry = state.entries.find(item => item.id === entryId);

  if (!entry) {
    showAppAlert("Could not find this entry.");
    return;
  }

  editReturnScreen = currentScreen === "logbookScreen" ? "logbookScreen" : null;
  editReturnScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

  editingEntryId = entryId;
  currentEntryType = entry.type;
  draft = { ...entry };

  if (draft.type === "procedure" && !draft.context && draft.location) {
    draft.context = draft.location;
  }

  editOriginalComparableData = getComparableEntryData(draft);

  wizardSteps = entry.type === "procedure" ? procedureSteps : cpdSteps;
  wizardIndex = 0;
  currentEntrySummaryExpanded = false;
  showScreen("wizardScreen");
  renderWizard();
}

function goWizardBack() {
  const previousIndex = findNextRelevantIndex(wizardIndex, -1);

  if (previousIndex !== null) {
    wizardIndex = previousIndex;
    renderWizard();
    return;
  }

  if (editingEntryId && editReturnScreen === "logbookScreen") {
    showScreen("logbookScreen");
    requestAnimationFrame(() => {
      window.scrollTo(0, editReturnScrollY);
    });
    return;
  }

  showScreen("entryTypeScreen");
}

function nextWizardStep() {
  const nextIndex = findNextRelevantIndex(wizardIndex, 1);

  if (nextIndex !== null) {
    wizardIndex = nextIndex;
    renderWizard();
  }
}

function getOriginalEditingEntry() {
  if (!editingEntryId) return null;
  return state.entries.find(entry => entry.id === editingEntryId) || null;
}

function renderWizardStepLabel(stepLabel, text) {
  stepLabel.innerHTML = "";

  const stepText = document.createElement("span");
  stepText.textContent = text;
  stepLabel.appendChild(stepText);

  updateFloatingNavigationControls();
}

function formatAttemptText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text === "1") return "1 attempt";
  if (text === "2") return "2 attempts";
  if (text === "3+") return "3+ attempts";
  return text;
}

function valuesAreDifferent(currentValue, originalValue) {
  return String(currentValue || "").trim() !== String(originalValue || "").trim();
}

function getComparableEntryData(entry) {
  if (!entry) return null;

  const commonKeys = [
    "type",
    "date",
    "placementId",
    "placementName",
    "placementStartDate",
    "placementEndDate"
  ];

  const procedureKeys = [
    "specialty",
    "hospital",
    "context",
    "procedure",
    "site",
    "technique",
    "role",
    "supervision",
    "outcome",
    "attempts",
    "complication",
    "notes"
  ];

  const cpdKeys = [
    "cpdType",
    "cpdFormat",
    "cpdTopic",
    "cpdTitle",
    "cpdProvider",
    "cpdLocation",
    "cpdTime",
    "cpdReflection",
    "cpdEvidence"
  ];

  const keys = entry.type === "cpd"
    ? [...commonKeys, ...cpdKeys]
    : [...commonKeys, ...procedureKeys];

  return keys.reduce((result, key) => {
    result[key] = String(entry[key] ?? "").trim();
    return result;
  }, {});
}

function hasUnsavedEditChanges() {
  if (!editingEntryId || !draft || !editOriginalComparableData) return false;

  return JSON.stringify(getComparableEntryData(draft)) !== JSON.stringify(editOriginalComparableData);
}

function updateEditSaveShortcuts() {
  const shouldShow = hasUnsavedEditChanges();
  document.querySelectorAll(".edit-save-shortcut").forEach(button => {
    button.classList.toggle("hidden", !shouldShow);
  });
}

function syncDraftChange() {
  updateEditSaveShortcuts();
}

function renderWizard() {
  const step = wizardSteps[wizardIndex];

  if (!isStepRelevant(step)) {
    const nextIndex = findNextRelevantIndex(wizardIndex, 1);
    if (nextIndex !== null) {
      wizardIndex = nextIndex;
      renderWizard();
    }
    return;
  }

  const stepLabel = document.getElementById("stepLabel");
  const title = document.getElementById("wizardTitle");
  const help = document.getElementById("wizardHelp");
  const content = document.getElementById("wizardContent");
  const relevantSteps = getRelevantWizardSteps();
  const visibleStepNumber = relevantSteps.indexOf(step) + 1;

  renderWizardStepLabel(stepLabel, `Step ${visibleStepNumber} of ${relevantSteps.length}`);
  title.textContent = "";
  help.textContent = "";
  content.innerHTML = "";

  if (step !== "review" && step !== "date") {
    content.appendChild(makeCurrentEntrySummaryStrip());
  }

  if (step === "date") {
    title.textContent = currentEntryType === "procedure" ? "Date performed" : "Date completed";
    content.appendChild(makeDateScreen());
    return;
  }

  if (step === "placement") {
    title.textContent = "Placement";
    content.appendChild(makePlacementChoiceScreen());
    return;
  }

  if (step === "hospital") {
    title.textContent = "Hospital";
    content.appendChild(makeHospitalScreen());
    return;
  }

  if (step === "specialty") {
    title.textContent = "Specialty";
    content.appendChild(makeSpecialtyScreen());
    return;
  }

  if (step === "context") {
    title.textContent = "Location";
    content.appendChild(makeChoiceScreen("context"));
    return;
  }

  if (step === "procedure") {
    title.textContent = "Procedure";
    content.appendChild(makeChoiceScreen("procedure"));
    return;
  }

  if (step === "site") {
    title.textContent = "Site";
    content.appendChild(makeChoiceScreen("site", draft.procedure));
    return;
  }

  if (step === "technique") {
    title.textContent = "Technique";
    content.appendChild(makeChoiceScreen("technique"));
    return;
  }

  if (step === "role") {
    title.textContent = "Role";
    content.appendChild(makeChoiceScreen("role"));
    return;
  }

  if (step === "supervision") {
    title.textContent = "Supervision level";
    content.appendChild(makeChoiceScreen("supervision"));
    return;
  }

  if (step === "outcome") {
    title.textContent = "Outcome";
    content.appendChild(makeOutcomeScreen());
    return;
  }

  if (step === "attempts") {
    title.textContent = "Number of attempts";
    content.appendChild(makeAttemptsScreen());
    return;
  }

  if (step === "complication") {
    title.textContent = "Complication";
    content.appendChild(makeChoiceScreen("complication"));
    return;
  }

  if (step === "notes") {
    title.textContent = "Optional notes";
    content.appendChild(makeTextAreaScreen("notes", "Do not enter patient-identifiable information.", { showSkip: false }));
    return;
  }

  if (step === "cpdType") {
    title.textContent = "CPD type";
    content.appendChild(makeChoiceScreen("cpdType"));
    return;
  }

  if (step === "cpdFormat") {
    title.textContent = "Format";
    content.appendChild(makeChoiceScreen("cpdFormat"));
    return;
  }

  if (step === "cpdTopic") {
    title.textContent = "Topic area";
    content.appendChild(makeChoiceScreen("cpdTopic"));
    return;
  }

  if (step === "cpdDetails") {
    title.textContent = "Title / details";
    help.textContent = "For example: course title, provider, session name, or article title.";
    content.appendChild(makeDetailsScreen());
    return;
  }

  if (step === "cpdTime") {
    title.textContent = "Time claimed";
    content.appendChild(makeChoiceScreen("cpdTime"));
    return;
  }

  if (step === "cpdReflection") {
    title.textContent = "Optional reflection";
    help.textContent = "Optional, but useful for portfolio evidence.";
    content.appendChild(makeTextAreaScreen("cpdReflection", "What did you learn and how will this affect your practice?", { showSkip: false }));
    return;
  }

  if (step === "cpdEvidence") {
    title.textContent = "Evidence";
    content.appendChild(makeChoiceScreen("cpdEvidence"));
    return;
  }

  if (step === "review") {
    title.textContent = editingEntryId ? "Review & save changes" : "Review & save";
    content.appendChild(makeReviewScreen());
  }
}

function shouldShowSummaryField(stepName) {
  if (editingEntryId) return true;

  const stepIndex = wizardSteps.indexOf(stepName);
  return stepIndex >= 0 && wizardIndex > stepIndex;
}

function getCurrentEntrySummaryItems() {
  const items = [];
  const original = getOriginalEditingEntry();

  const add = (stepName, label, value, originalValue = undefined) => {
    if (!shouldShowSummaryField(stepName)) return;

    const text = String(value || "").trim();
    const originalText = originalValue === undefined ? "" : String(originalValue || "").trim();

    if (text || originalText) {
      items.push({
        label,
        value: text,
        originalValue: originalText,
        changed: editingEntryId && originalValue !== undefined && valuesAreDifferent(text, originalText)
      });
    }
  };

  add("date", "Date", formatDate(draft.date), original ? formatDate(original.date) : undefined);
  add("placement", "Placement", getEntryPlacementDisplay(draft), original ? getEntryPlacementDisplay(original) : undefined);

  if (currentEntryType === "procedure") {
    add("specialty", "Specialty", draft.specialty, original ? original.specialty : undefined);
    add("hospital", "Hospital", draft.hospital, original ? original.hospital : undefined);
    add("context", "Location", draft.context, original ? (original.context || original.location) : undefined);
    add("procedure", "Procedure", draft.procedure, original ? original.procedure : undefined);

    if (procedureSupportsSite(draft.procedure) || (original && procedureSupportsSite(original.procedure))) {
      add("site", "Site", draft.site, original ? original.site : undefined);
    }

    if (draft.procedure === "Arterial line" || (original && original.procedure === "Arterial line")) {
      add("technique", "Technique", draft.technique, original ? original.technique : undefined);
    }

    add("role", "Role", draft.role, original ? original.role : undefined);
    add("supervision", "Supervision", draft.supervision, original ? original.supervision : undefined);
    add("outcome", "Outcome", draft.outcome, original ? original.outcome : undefined);
    add("attempts", "Attempts", formatAttemptText(draft.attempts), original ? formatAttemptText(original.attempts) : undefined);
    add("complication", "Complication", draft.complication, original ? original.complication : undefined);
  } else {
    add("cpdType", "CPD type", draft.cpdType, original ? original.cpdType : undefined);
    add("cpdFormat", "Format", draft.cpdFormat, original ? original.cpdFormat : undefined);
    add("cpdTopic", "Topic", draft.cpdTopic, original ? original.cpdTopic : undefined);
    add("cpdDetails", "Title", draft.cpdTitle, original ? original.cpdTitle : undefined);
    add("cpdDetails", "Provider", draft.cpdProvider, original ? original.cpdProvider : undefined);
    add("cpdTime", "Time", draft.cpdTime, original ? original.cpdTime : undefined);
    add("cpdEvidence", "Evidence", draft.cpdEvidence, original ? original.cpdEvidence : undefined);
  }

  return items;
}
function makeCurrentEntrySummaryStrip() {
  const details = document.createElement("details");
  details.className = "current-entry-summary";
  details.open = currentEntrySummaryExpanded;

  details.addEventListener("toggle", () => {
    currentEntrySummaryExpanded = details.open;
  });

  const summary = document.createElement("summary");

  const label = document.createElement("span");
  label.className = "current-entry-summary-label";
  label.textContent = "Entry summary";

  const chevron = document.createElement("span");
  chevron.className = "current-entry-summary-chevron";
  chevron.textContent = "▾";

  summary.append(label, chevron);

  const body = document.createElement("div");
  body.className = "current-entry-summary-body";

  const items = getCurrentEntrySummaryItems();

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Nothing entered yet.";
    body.appendChild(empty);
  } else {
    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "current-entry-summary-row";

      const key = document.createElement("span");
      key.textContent = item.label;

      const val = document.createElement("strong");

      if (item.changed) {
        const originalValue = document.createElement("span");
        originalValue.className = "summary-change-original";
        originalValue.textContent = item.originalValue || "Not recorded";

        const arrow = document.createElement("span");
        arrow.className = "summary-change-arrow";
        arrow.textContent = " → ";

        const newValue = document.createElement("span");
        newValue.className = "summary-change-new";
        newValue.textContent = item.value || "Not recorded";

        val.append(originalValue, arrow, newValue);
      } else {
        val.textContent = item.value || item.originalValue || "Not recorded";
      }

      row.append(key, val);
      body.appendChild(row);
    });
  }

  details.append(summary, body);
  return details;
}

function cancelEntry() {
  editingEntryId = null;
  editReturnScreen = null;
  editReturnScrollY = 0;
  editOriginalComparableData = null;
  currentEntryType = null;
  wizardSteps = [];
  wizardIndex = 0;
  draft = {};
  currentEntrySummaryExpanded = false;
  showScreen("homeScreen");
}


function abandonEditToHome() {
  editingEntryId = null;
  editReturnScreen = null;
  editReturnScrollY = 0;
  editOriginalComparableData = null;
  currentEntryType = null;
  wizardSteps = [];
  wizardIndex = 0;
  draft = {};
  currentEntrySummaryExpanded = false;
  showScreen("homeScreen");
}

function saveCurrentEntryAsDraftAndGoHome() {
  if (!draft || !currentEntryType) {
    showScreen("homeScreen");
    return;
  }

  const now = new Date().toISOString();
  const draftEntry = {
    ...draft,
    id: draft.id || makeId(),
    type: currentEntryType,
    date: draft.date || todayISO(),
    isDraft: true,
    draftSavedAt: now,
    updatedAt: now,
    createdAt: draft.createdAt || now
  };

  state.entries.push(draftEntry);
  editingEntryId = null;
  editReturnScreen = null;
  editReturnScrollY = 0;
  editOriginalComparableData = null;
  currentEntryType = null;
  wizardSteps = [];
  wizardIndex = 0;
  draft = {};
  currentEntrySummaryExpanded = false;
  saveState();
  markChanged();
  showScreen("homeScreen");
}

function handleHomeShortcutRequest() {
  if (currentScreen === "homeScreen") return;

  if (currentScreen === "wizardScreen") {
    if (editingEntryId) {
      showAppChoiceDialog({
        title: "Leave edit?",
        message: "Unsaved changes to this entry will be lost.",
        actions: [
          { text: "Keep editing", className: "button secondary wizard-action-button", action: () => {} },
          { text: "Discard changes", className: "button danger-button wizard-action-button", action: abandonEditToHome }
        ]
      });
      return;
    }

    showAppChoiceDialog({
      title: "Leave entry?",
      message: "You can discard this entry, save it as a draft, or continue entering it.",
      actions: [
        { text: "Continue entry", className: "button secondary wizard-action-button", action: () => {} },
        { text: "Save as draft", className: "button primary wizard-action-button", action: saveCurrentEntryAsDraftAndGoHome },
        { text: "Discard entry", className: "button danger-button wizard-action-button", action: cancelEntry }
      ]
    });
    return;
  }

  if (typeof activeHomeGuard === "function") {
    activeHomeGuard();
    return;
  }

  showScreen("homeScreen");
}

function getActiveScreenElement() {
  return document.getElementById(currentScreen);
}

function getCurrentScreenBackAction() {
  if (currentScreen === "entryTypeScreen") return () => showScreen("homeScreen");
  if (currentScreen === "wizardScreen") return goWizardBack;
  if (currentScreen === "logbookScreen") return () => showScreen("homeScreen");
  if (currentScreen === "summariesScreen") return () => showScreen("homeScreen");
  if (currentScreen === "placementsScreen") return placementsBackAction;
  if (currentScreen === "specialtiesProceduresScreen") return specialtiesProceduresBackAction;
  if (currentScreen === "backupScreen") return () => showScreen("homeScreen");
  return null;
}

function updateFloatingNavigationControls() {
  document.querySelectorAll(".home-shortcut-button, .floating-back-button, .floating-cancel-button").forEach(button => button.remove());

  if (currentScreen === "homeScreen") return;

  const screen = getActiveScreenElement();
  if (!screen) return;

  const backAction = getCurrentScreenBackAction();
  if (backAction) {
    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "floating-back-button";
    backButton.setAttribute("aria-label", "Go back");
    backButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M17.5 18.5v-7.2c0-2.5-2-4.5-4.5-4.5H6.6" />
        <path d="M9.6 3.9 6.4 6.8l3.2 2.9" />
      </svg>
    `;
    backButton.addEventListener("click", () => {
      const action = getCurrentScreenBackAction();
      if (action) action();
    });
    screen.appendChild(backButton);
  }

  const shouldShowFloatingCancel = currentScreen === "wizardScreen" || typeof activeHomeGuard === "function";

  if (!shouldShowFloatingCancel) {
    const homeButton = document.createElement("button");
    homeButton.type = "button";
    homeButton.className = "home-shortcut-button";
    homeButton.setAttribute("aria-label", "Return home");
    homeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.8 11.2 12 4.4l8.2 6.8" />
        <path d="M6.5 10.7v8.1h4.1v-4.9h2.8v4.9h4.1v-8.1" />
      </svg>
    `;
    homeButton.addEventListener("click", handleHomeShortcutRequest);
    screen.appendChild(homeButton);
  }

  if (shouldShowFloatingCancel) {
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "floating-cancel-button";
    cancelButton.setAttribute("aria-label", currentScreen === "wizardScreen" ? (editingEntryId ? "Cancel edit" : "Cancel entry") : "Cancel");
    cancelButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 7l10 10" />
        <path d="M17 7 7 17" />
      </svg>
    `;
    cancelButton.addEventListener("click", () => {
      if (currentScreen === "wizardScreen") {
        handleHomeShortcutRequest();
        return;
      }

      if (typeof activeHomeGuard === "function") {
        activeHomeGuard();
      }
    });
    screen.appendChild(cancelButton);
  }
}

function setUnsavedFormHomeGuard(message = "Unsaved changes on this page will be lost.", leaveAction = null) {
  activeHomeGuard = () => {
    showAppChoiceDialog({
      title: "Return home?",
      message,
      actions: [
        { text: "Stay here", className: "button secondary wizard-action-button", action: () => {} },
        { text: "Return home", className: "button danger-button wizard-action-button", action: leaveAction || (() => showScreen("homeScreen")) }
      ]
    });
  };
  updateFloatingNavigationControls();
}

function cancelEdit() {
  editingEntryId = null;
  draft = {};

  if (editReturnScreen === "logbookScreen") {
    showScreen("logbookScreen");
    requestAnimationFrame(() => {
      window.scrollTo(0, editReturnScrollY);
    });
    return;
  }

  showScreen("homeScreen");
}

function saveEditedDraft() {
  if (!editingEntryId) return;

  const returnScreen = editReturnScreen;
  const returnScrollY = editReturnScrollY;

  draft.updatedAt = new Date().toISOString();
  state.entries = state.entries.map(entry => entry.id === editingEntryId ? { ...draft } : entry);

  editingEntryId = null;
  editReturnScreen = null;
  editReturnScrollY = 0;
  editOriginalComparableData = null;
  saveState();
  markChanged();

  if (returnScreen === "logbookScreen") {
    showScreen("logbookScreen");
    requestAnimationFrame(() => {
      window.scrollTo(0, returnScrollY);
    });
    return;
  }

  showScreen("homeScreen");
}

function appendEditSaveButton(wrapper) {
  if (!editingEntryId || !wrapper) return wrapper;

  const button = makeButton("Save changes", "button primary wizard-action-button edit-save-shortcut", saveEditedDraft);
  wrapper.appendChild(button);
  updateEditSaveShortcuts();
  return wrapper;
}

function makeDateScreen() {
  const wrapper = document.createElement("div");
  wrapper.className = "date-screen";

  const input = document.createElement("input");
  input.type = "date";
  input.className = "date-input";
  input.value = draft.date || todayISO();
  draft.date = input.value;

  input.addEventListener("change", () => {
    draft.date = input.value;
    syncDraftChange();
  });

  const nextButton = makeButton("Next", "button primary wizard-action-button date-confirm-button", () => {
    draft.date = input.value || todayISO();
    nextWizardStep();
  });

  if (editingEntryId) {
    wrapper.append(input, nextButton);
    return appendEditSaveButton(wrapper);
  }

  const quickSelectLabel = document.createElement("p");
  quickSelectLabel.className = "date-quick-label";
  quickSelectLabel.textContent = "Quick select";

  const setDate = value => {
    draft.date = value;
    input.value = value;
  };

  const todayButton = makeButton("Today", "button secondary wizard-action-button", () => {
    setDate(todayISO());
    nextWizardStep();
  });

  const yesterdayButton = makeButton("Yesterday", "button secondary wizard-action-button", () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = padNumber(date.getMonth() + 1);
    const day = padNumber(date.getDate());
    setDate(`${year}-${month}-${day}`);
    nextWizardStep();
  });

  wrapper.append(input, quickSelectLabel, makeActionRow([todayButton, yesterdayButton]), nextButton);
  return wrapper;
}

function makePlacementChoiceButton(placement, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "choice-button placement-choice-button";

  const name = document.createElement("span");
  name.className = "placement-choice-name";
  name.textContent = placement.name;

  const dates = document.createElement("span");
  dates.className = "placement-choice-dates";
  dates.textContent = formatPlacementRange(placement);

  button.append(name, dates);
  button.addEventListener("click", onClick);
  return button;
}

function makePlacementChoiceScreen() {
  const wrapper = document.createElement("div");
  const visiblePlacements = sortPlacementsForEntry(state.placements.filter(placement => !placement.hidden));

  if (editingEntryId) {
    wrapper.appendChild(makeButton(`Keep current: ${getEntryPlacementDisplay(draft)}`, "choice-button keep-current-button", () => {
      nextWizardStep();
    }));
  }

  wrapper.appendChild(makeButton("Not linked to a placement", "choice-button", () => {
    setDraftPlacement(null);
    nextWizardStep();
  }));

  if (visiblePlacements.length === 0) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = state.placements.length === 0
      ? "No placements added yet. You can add one now, or continue without linking this entry to a placement."
      : "All placements are currently hidden. You can show placements again below, or continue without linking this entry to a placement.";
    wrapper.appendChild(empty);
  }

  visiblePlacements.forEach(placement => {
    wrapper.appendChild(makePlacementChoiceButton(placement, () => {
      setDraftPlacement(placement);
      nextWizardStep();
    }));
  });

  wrapper.appendChild(makeActionRow([
    makeButton("Add placement", "button secondary wizard-action-button", () => renderAddPlacementFromWizard(wrapper)),
    makeButton("Show/hide placements", "button secondary wizard-action-button", () => renderShowHidePlacementsFromWizard(wrapper))
  ]));

  return appendEditSaveButton(wrapper);
}

function renderAddPlacementFromWizard(wrapper) {
  wrapper.innerHTML = "";

  const instructions = document.createElement("p");
  instructions.className = "help-text";
  instructions.textContent = "Add the name and date range for this placement.";

  const nameLabel = document.createElement("label");
  nameLabel.className = "field-label";
  nameLabel.textContent = "Placement name";

  const nameInput = document.createElement("input");
  nameInput.className = "text-input";
  nameInput.placeholder = "For example: ACCS Emergency Medicine";

  const startLabel = document.createElement("label");
  startLabel.className = "field-label";
  startLabel.textContent = "Start date";

  const startInput = document.createElement("input");
  startInput.type = "date";
  startInput.className = "text-input compact-date-input";

  const endLabel = document.createElement("label");
  endLabel.className = "field-label";
  endLabel.textContent = "End date";

  const endInput = document.createElement("input");
  endInput.type = "date";
  endInput.className = "text-input compact-date-input";

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderWizard);

  const saveButton = makeButton("Save placement", "button primary wizard-action-button", () => {
    const name = nameInput.value.trim();
    const startDate = startInput.value;
    const endDate = endInput.value;

    if (!name) {
      showAppAlert("Please enter a placement name.");
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      showAppAlert("The end date cannot be before the start date.");
      return;
    }

    const duplicate = state.placements.some(placement => {
      return normaliseText(placement.name) === normaliseText(name)
        && placement.startDate === startDate
        && placement.endDate === endDate;
    });

    if (duplicate) {
      showAppAlert("This placement already exists.");
      return;
    }

    const now = new Date().toISOString();
    const placement = {
      id: makeId(),
      name,
      startDate,
      endDate,
      hidden: false,
      createdAt: now,
      updatedAt: now
    };

    state.placements.push(placement);
    state.placements = cleanPlacements(state.placements);
    markChanged();
    renderWizard();
  });

  wrapper.append(
    instructions,
    nameLabel,
    nameInput,
    startLabel,
    startInput,
    endLabel,
    endInput,
    makeActionRow([cancelButton, saveButton])
  );
}

function makePlacementVisibilityButton(placement, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = placement.hidden
    ? "choice-button visibility-option hidden-option"
    : "choice-button visibility-option shown-option";

  const content = document.createElement("span");
  content.className = "visibility-option-content";

  const text = document.createElement("span");
  text.className = "visibility-option-text";

  const name = document.createElement("strong");
  name.textContent = placement.name;

  const dates = document.createElement("small");
  dates.textContent = formatPlacementRange(placement);

  text.append(name, dates);

  const status = document.createElement("span");
  status.className = placement.hidden ? "status-pill status-hidden" : "status-pill status-shown";
  status.textContent = placement.hidden ? "Hidden" : "Shown";

  content.append(text, status);
  button.appendChild(content);
  button.addEventListener("click", onClick);
  return button;
}

function renderShowHidePlacementsFromWizard(wrapper) {
  wrapper.innerHTML = "";

  const message = document.createElement("p");
  message.className = "help-text";
  message.textContent = "Tap a placement to switch it between shown and hidden.";
  wrapper.appendChild(message);

  if (state.placements.length === 0) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "No placements added yet.";
    wrapper.appendChild(empty);
  }

  sortPlacementsForEntry(state.placements).forEach(placement => {
    wrapper.appendChild(makePlacementVisibilityButton(placement, () => {
      placement.hidden = !placement.hidden;
      placement.updatedAt = new Date().toISOString();
      markChanged();
      renderShowHidePlacementsFromWizard(wrapper);
    }));
  });

  wrapper.appendChild(makeButton("Done", "button primary wizard-action-button", renderWizard));
}


function getSpecialtyIdByName(name) {
  const match = defaultSpecialties.find(specialty => normaliseText(specialty.name) === normaliseText(name));
  return match ? match.id : "";
}

function getSpecialtyNameById(id) {
  const match = defaultSpecialties.find(specialty => specialty.id === id);
  return match ? match.name : "";
}

function getProcedureById(id) {
  const defaultMatch = defaultProcedureLibrary.find(procedure => procedure.id === id);
  if (defaultMatch) return defaultMatch;
  return (state.procedureSettings.customProcedures || []).find(procedure => procedure.id === id) || null;
}


function isUserAddedProcedure(procedureId) {
  return (state.procedureSettings.customProcedures || []).some(procedure => procedure.id === procedureId);
}

function deleteUserAddedProcedure(procedureId) {
  if (!isUserAddedProcedure(procedureId)) return false;

  state.procedureSettings.customProcedures = (state.procedureSettings.customProcedures || [])
    .filter(procedure => procedure.id !== procedureId);

  state.procedureSettings.customAssignments = (state.procedureSettings.customAssignments || [])
    .filter(assignment => assignment.procedureId !== procedureId);

  state.procedureSettings.hiddenAssignments = (state.procedureSettings.hiddenAssignments || [])
    .filter(key => !key.endsWith(`|${procedureId}`));

  markChanged();
  return true;
}

function showDeleteProcedureDialog(procedure, specialtyId, categoryId) {
  if (!procedure || !isUserAddedProcedure(procedure.id)) return;

  showAppConfirm({
    title: "Delete procedure?",
    message: `Delete ${procedure.name}? This removes it from all specialties and categories. Existing saved logbook entries will not be changed.`,
    confirmText: "Delete",
    confirmClass: "button danger-button wizard-action-button",
    onConfirm: () => {
      deleteUserAddedProcedure(procedure.id);
      renderProceduresForCategory(specialtyId, categoryId);
    }
  });
}

function getProcedureCategoryName(categoryId) {
  const match = defaultProcedureCategories.find(category => category.id === categoryId);
  return match ? match.name : "Uncategorised";
}

function makeCategoryKey(specialtyId, categoryId) {
  return `${specialtyId}|${categoryId}`;
}

function makeAssignmentKey(specialtyId, categoryId, procedureId) {
  return `${specialtyId}|${categoryId}|${procedureId}`;
}

function isSpecialtyHiddenById(specialtyId) {
  const specialty = getSpecialtyNameById(specialtyId);
  if (!specialty) return false;
  return getStoredOptionList("hiddenDefaultOptions", "specialty")
    .map(normaliseText)
    .includes(normaliseText(specialty));
}

function isCategoryHidden(specialtyId, categoryId) {
  return (state.procedureSettings.hiddenCategories || []).includes(makeCategoryKey(specialtyId, categoryId));
}

function setCategoryHidden(specialtyId, categoryId, hidden) {
  const key = makeCategoryKey(specialtyId, categoryId);
  const current = state.procedureSettings.hiddenCategories || [];
  state.procedureSettings.hiddenCategories = hidden
    ? [...new Set([...current, key])]
    : current.filter(item => item !== key);
  markChanged();
}

function isProcedureAssignmentHidden(specialtyId, categoryId, procedureId) {
  return (state.procedureSettings.hiddenAssignments || []).includes(makeAssignmentKey(specialtyId, categoryId, procedureId));
}

function setProcedureAssignmentHidden(specialtyId, categoryId, procedureId, hidden) {
  const key = makeAssignmentKey(specialtyId, categoryId, procedureId);
  const current = state.procedureSettings.hiddenAssignments || [];
  state.procedureSettings.hiddenAssignments = hidden
    ? [...new Set([...current, key])]
    : current.filter(item => item !== key);
  markChanged();
}

function getAllProcedureLibraryItems() {
  const seen = new Set();
  return [...defaultProcedureLibrary, ...(state.procedureSettings.customProcedures || [])]
    .filter(procedure => {
      const key = procedure.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function isDefaultProcedureAssignedToCategory(specialtyId, categoryId, procedureId) {
  return (((defaultSpecialtyProcedureAssignments[specialtyId] || {})[categoryId]) || []).includes(procedureId);
}

function isProcedureAssignmentRemoved(specialtyId, categoryId, procedureId) {
  return (state.procedureSettings.removedAssignments || []).includes(makeAssignmentKey(specialtyId, categoryId, procedureId));
}

function setProcedureAssignmentRemoved(specialtyId, categoryId, procedureId, removed) {
  const key = makeAssignmentKey(specialtyId, categoryId, procedureId);
  const current = state.procedureSettings.removedAssignments || [];
  state.procedureSettings.removedAssignments = removed
    ? [...new Set([...current, key])]
    : current.filter(item => item !== key);
}

function isProcedureAssignedToCategory(specialtyId, categoryId, procedureId) {
  return getAssignedProcedureIds(specialtyId, categoryId).includes(procedureId);
}

function addProcedureAssignment(specialtyId, categoryId, procedureId) {
  if (!specialtyId || !categoryId || !procedureId) return false;
  if (isProcedureAssignedToCategory(specialtyId, categoryId, procedureId)) return false;

  if (isDefaultProcedureAssignedToCategory(specialtyId, categoryId, procedureId)) {
    setProcedureAssignmentRemoved(specialtyId, categoryId, procedureId, false);
    setProcedureAssignmentHidden(specialtyId, categoryId, procedureId, false);
    markChanged();
    return true;
  }

  state.procedureSettings.customAssignments.push({
    procedureId,
    specialtyId,
    categoryId
  });

  setProcedureAssignmentHidden(specialtyId, categoryId, procedureId, false);
  markChanged();
  return true;
}

function removeProcedureAssignment(specialtyId, categoryId, procedureId) {
  if (!specialtyId || !categoryId || !procedureId) return false;
  if (!isProcedureAssignedToCategory(specialtyId, categoryId, procedureId)) return false;

  if (isDefaultProcedureAssignedToCategory(specialtyId, categoryId, procedureId)) {
    setProcedureAssignmentRemoved(specialtyId, categoryId, procedureId, true);
  } else {
    state.procedureSettings.customAssignments = (state.procedureSettings.customAssignments || [])
      .filter(item => !(item.specialtyId === specialtyId && item.categoryId === categoryId && item.procedureId === procedureId));
  }

  setProcedureAssignmentHidden(specialtyId, categoryId, procedureId, false);
  markChanged();
  return true;
}

function makeProcedureIdFromName(name) {
  const base = normaliseText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "procedure";

  const existingIds = new Set(getAllProcedureLibraryItems().map(procedure => procedure.id));
  let candidate = base;
  let count = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${count}`;
    count += 1;
  }

  return candidate;
}

function getAssignedProcedureIds(specialtyId, categoryId) {
  const defaultIds = (((defaultSpecialtyProcedureAssignments[specialtyId] || {})[categoryId]) || [])
    .filter(procedureId => !isProcedureAssignmentRemoved(specialtyId, categoryId, procedureId));
  const customIds = (state.procedureSettings.customAssignments || [])
    .filter(item => item.specialtyId === specialtyId && item.categoryId === categoryId)
    .map(item => item.procedureId);
  return [...new Set([...defaultIds, ...customIds])];
}

function getCategoryRowsForSpecialty(specialtyId) {
  return defaultProcedureCategories
    .map(category => {
      const procedures = getAssignedProcedureIds(specialtyId, category.id)
        .map(getProcedureById)
        .filter(Boolean);
      return { ...category, procedures };
    })
    .filter(category => category.procedures.length > 0);
}

function getVisibleSpecialties() {
  const hidden = getStoredOptionList("hiddenDefaultOptions", "specialty").map(normaliseText);
  return defaultProcedureOptions.specialty.filter(specialty => !hidden.includes(normaliseText(specialty)));
}

function setSpecialtyHidden(specialty, hidden) {
  const currentHidden = getStoredOptionList("hiddenDefaultOptions", "specialty");
  const key = normaliseText(specialty);
  let nextHidden = currentHidden.filter(item => normaliseText(item) !== key);

  if (hidden) {
    nextHidden.push(specialty);
  }

  setStoredOptionList("hiddenDefaultOptions", "specialty", nextHidden);
  markChanged();
}

function makeSpecialtyScreen() {
  const wrapper = document.createElement("div");
  const specialties = getVisibleSpecialties();

  if (editingEntryId && draft.specialty) {
    wrapper.appendChild(makeButton(`Keep current: ${draft.specialty}`, "choice-button keep-current-button", () => {
      nextWizardStep();
    }));
  }

  if (specialties.length === 0) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "All specialties are currently hidden. Use Show/hide specialties below to make specialties visible again.";
    wrapper.appendChild(empty);
  }

  specialties.forEach(specialty => {
    wrapper.appendChild(makeButton(specialty, "choice-button", () => {
      draft.specialty = specialty;
      delete draft.procedure;
      delete draft.site;
      delete draft.technique;
      nextWizardStep();
    }));
  });

  wrapper.appendChild(makeButton("Show/hide specialties", "button secondary wizard-action-button", () => {
    renderShowHideSpecialtiesFromWizard(wrapper);
  }));

  return appendEditSaveButton(wrapper);
}

function makeSpecialtyVisibilityButton(specialty, hidden, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = hidden
    ? "choice-button visibility-option hidden-option"
    : "choice-button visibility-option shown-option";

  const content = document.createElement("span");
  content.className = "visibility-option-content";

  const text = document.createElement("span");
  text.className = "visibility-option-text";

  const name = document.createElement("strong");
  name.textContent = specialty;

  const description = document.createElement("small");
  description.textContent = hidden ? "Hidden from new entries" : "Shown when adding entries";

  text.append(name, description);

  const status = document.createElement("span");
  status.className = hidden ? "status-pill status-hidden" : "status-pill status-shown";
  status.textContent = hidden ? "Hidden" : "Shown";

  content.append(text, status);
  button.appendChild(content);
  button.addEventListener("click", onClick);
  return button;
}

function renderShowHideSpecialtiesFromWizard(wrapper) {
  wrapper.innerHTML = "";

  const message = document.createElement("p");
  message.className = "help-text";
  message.textContent = "Tap a specialty to switch it between shown and hidden.";
  wrapper.appendChild(message);

  const hidden = getStoredOptionList("hiddenDefaultOptions", "specialty").map(normaliseText);

  defaultProcedureOptions.specialty.forEach(specialty => {
    const isHidden = hidden.includes(normaliseText(specialty));
    wrapper.appendChild(makeSpecialtyVisibilityButton(specialty, isHidden, () => {
      setSpecialtyHidden(specialty, !isHidden);
      renderShowHideSpecialtiesFromWizard(wrapper);
    }));
  });

  wrapper.appendChild(makeButton("Done", "button primary wizard-action-button", renderWizard));
}

function makeHospitalScreen() {
  const wrapper = document.createElement("div");

  if (editingEntryId && draft.hospital) {
    wrapper.appendChild(makeButton(`Keep current: ${draft.hospital}`, "choice-button keep-current-button", () => {
      nextWizardStep();
    }));
  }

  if (state.hospitals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "No hospitals saved yet.";
    wrapper.appendChild(empty);
  }

  state.hospitals.forEach(hospital => {
    wrapper.appendChild(makeButton(hospital, "choice-button", () => {
      draft.hospital = hospital;
      nextWizardStep();
    }));
  });

  const rowButtons = [
    makeButton("Add hospital", "button secondary wizard-action-button", () => {
      renderAddHospitalScreen(wrapper);
    })
  ];

  if (state.hospitals.length > 0) {
    rowButtons.push(
      makeButton("Delete hospital", "button secondary wizard-action-button", () => {
        renderDeleteHospitalScreen(wrapper);
      })
    );
  }

  wrapper.appendChild(makeActionRow(rowButtons));

  return appendEditSaveButton(wrapper);
}

function renderAddHospitalScreen(wrapper) {
  wrapper.innerHTML = "";

  const input = document.createElement("input");
  input.className = "text-input";
  input.placeholder = "Hospital name";

  const saveButton = makeButton("Save hospital", "button primary wizard-action-button", () => {
    const name = input.value.trim();

    if (!name) {
      showAppAlert("Please enter a hospital name.");
      return;
    }

    const exists = state.hospitals.some(hospital => hospital.toLowerCase() === name.toLowerCase());

    if (exists) {
      showAppAlert("This hospital already exists.");
      return;
    }

    state.hospitals.push(name);
    state.hospitals.sort((a, b) => a.localeCompare(b));
    markChanged();
    renderWizard();
  });

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderWizard);
  wrapper.append(input, makeActionRow([cancelButton, saveButton]));
}

function renderDeleteHospitalScreen(wrapper) {
  wrapper.innerHTML = "";

  const message = document.createElement("div");
  message.className = "delete-message";
  message.textContent = "Which hospital do you want to delete?";
  wrapper.appendChild(message);

  state.hospitals.forEach(hospital => {
    wrapper.appendChild(makeButton(hospital, "choice-button danger", () => {
      showAppConfirm({
        title: "Delete hospital?",
        message: `Delete ${hospital} from your quick-select hospital list?\n\nExisting logbook records will not be changed.`,
        confirmText: "Delete",
        confirmClass: "button danger-button wizard-action-button",
        onConfirm: () => {
          state.hospitals = state.hospitals.filter(item => item !== hospital);
          if (draft.hospital === hospital) delete draft.hospital;
          markChanged();
          renderWizard();
        }
      });
    }));
  });

  wrapper.appendChild(makeButton("Cancel", "button secondary wizard-action-button", renderWizard));
}

function makeChoiceScreen(field, procedureName = "") {
  const wrapper = document.createElement("div");
  const options = getDisplayedOptions(field, procedureName);
  const configurable = isConfigurableField(field);
  const label = fieldLabel(field);

  if (editingEntryId && draft[field]) {
    wrapper.appendChild(makeButton(`Keep current: ${draft[field]}`, "choice-button keep-current-button", () => {
      nextWizardStep();
    }));
  }

  if (options.length === 0) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "No options available.";
    wrapper.appendChild(empty);
  }

  options.forEach(option => {
    wrapper.appendChild(makeButton(option, "choice-button", () => {
      if ((option === "Other" || option === "Custom") && !configurable) {
        renderOtherInput(wrapper, field, option);
        return;
      }

      draft[field] = option;

      if (field === "procedure") {
        delete draft.site;
        delete draft.technique;
      }

      nextWizardStep();
    }));
  });

  if (configurable) {
    const rowButtons = [
      makeButton(`Add ${label}`, "button secondary wizard-action-button", () => {
        renderAddOptionScreen(wrapper, field, procedureName);
      })
    ];

    if (options.length > 0) {
      rowButtons.push(
        makeButton(`Delete ${label}`, "button secondary wizard-action-button", () => {
          renderDeleteOptionScreen(wrapper, field, procedureName);
        })
      );
    }

    wrapper.appendChild(makeActionRow(rowButtons));
  }

  return appendEditSaveButton(wrapper);
}

function renderAddOptionScreen(wrapper, field, procedureName = "") {
  wrapper.innerHTML = "";

  const label = fieldLabel(field);
  const input = document.createElement("input");
  input.className = "text-input";
  input.placeholder = `New ${label}`;

  const saveButton = makeButton(`Save ${label}`, "button primary wizard-action-button", () => {
    const saved = addUserOption(field, input.value, procedureName);
    if (saved) renderWizard();
  });

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderWizard);
  wrapper.append(input, makeActionRow([cancelButton, saveButton]));
}

function renderDeleteOptionScreen(wrapper, field, procedureName = "") {
  wrapper.innerHTML = "";

  const label = fieldLabel(field);
  const options = getDisplayedOptions(field, procedureName);

  const message = document.createElement("div");
  message.className = "delete-message";
  message.textContent = `Which ${label} do you want to delete?`;
  wrapper.appendChild(message);

  options.forEach(option => {
    wrapper.appendChild(makeButton(option, "choice-button danger", () => {
      showAppConfirm({
        title: `Delete ${label}?`,
        message: `Delete "${option}" from the ${label} quick-select list?\n\nExisting logbook records will not be changed.`,
        confirmText: "Delete",
        confirmClass: "button danger-button wizard-action-button",
        onConfirm: () => {
          deleteUserOption(field, option, procedureName);
          renderWizard();
        }
      });
    }));
  });

  wrapper.appendChild(makeButton("Cancel", "button secondary wizard-action-button", renderWizard));
}

function renderOtherInput(wrapper, field, option) {
  wrapper.innerHTML = "";

  const input = document.createElement("input");
  input.className = "text-input";
  input.placeholder = option === "Custom" ? "Enter custom value" : "Enter other value";
  input.value = draft[field] || "";

  const saveButton = makeButton("Save", "button primary wizard-action-button", () => {
    const value = input.value.trim();

    if (!value) {
      showAppAlert("Please enter a value.");
      return;
    }

    draft[field] = value;

    if (field === "procedure") {
      delete draft.site;
      delete draft.technique;
    }

    nextWizardStep();
  });

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderWizard);
  wrapper.append(input, makeActionRow([cancelButton, saveButton]));
}

function makeOutcomeScreen() {
  const wrapper = document.createElement("div");

  if (editingEntryId && draft.outcome) {
    wrapper.appendChild(makeButton(`Keep current: ${draft.outcome}`, "choice-button keep-current-button", () => {
      nextWizardStep();
    }));
  }

  wrapper.appendChild(makeButton("Successful", "choice-button", () => {
    draft.outcome = "Successful";
    nextWizardStep();
  }));

  wrapper.appendChild(makeButton("Unsuccessful", "choice-button", () => {
    draft.outcome = "Unsuccessful";
    nextWizardStep();
  }));

  return appendEditSaveButton(wrapper);
}

function makeAttemptsScreen() {
  const wrapper = document.createElement("div");

  if (editingEntryId && draft.attempts) {
    wrapper.appendChild(makeButton(`Keep current: ${formatAttemptText(draft.attempts)}`, "choice-button keep-current-button", () => {
      nextWizardStep();
    }));
  }

  ["1", "2", "3+"].forEach(attempts => {
    wrapper.appendChild(makeButton(attempts, "choice-button", () => {
      draft.attempts = attempts;
      nextWizardStep();
    }));
  });

  return appendEditSaveButton(wrapper);
}

function makeTextAreaScreen(field, placeholder, options = {}) {
  const wrapper = document.createElement("div");
  const showSkip = options.showSkip !== false;

  const textarea = document.createElement("textarea");
  textarea.className = "textarea-input";
  textarea.placeholder = placeholder;
  textarea.value = draft[field] || "";
  textarea.addEventListener("input", () => {
    draft[field] = textarea.value.trim();
    syncDraftChange();
  });

  const saveButton = makeButton("Next", "button primary wizard-action-button", () => {
    draft[field] = textarea.value.trim();
    nextWizardStep();
  });

  wrapper.append(textarea, saveButton);

  if (showSkip) {
    const skipButton = makeButton("Skip", "button secondary wizard-action-button", () => {
      draft[field] = "";
      nextWizardStep();
    });

    wrapper.appendChild(skipButton);
  }

  return appendEditSaveButton(wrapper);
}

function makeDetailsScreen() {
  const wrapper = document.createElement("div");

  const titleInput = document.createElement("input");
  titleInput.className = "text-input";
  titleInput.placeholder = "Title";
  titleInput.value = draft.cpdTitle || "";

  const providerInput = document.createElement("input");
  providerInput.className = "text-input";
  providerInput.placeholder = "Provider / organisation";
  providerInput.value = draft.cpdProvider || "";

  const locationInput = document.createElement("input");
  locationInput.className = "text-input";
  locationInput.placeholder = "Location or website, optional";
  locationInput.value = draft.cpdLocation || "";

  const syncDetailsDraft = () => {
    draft.cpdTitle = titleInput.value.trim();
    draft.cpdProvider = providerInput.value.trim();
    draft.cpdLocation = locationInput.value.trim();
  };

  const handleDetailsInput = () => {
    syncDetailsDraft();
    syncDraftChange();
  };

  titleInput.addEventListener("input", handleDetailsInput);
  providerInput.addEventListener("input", handleDetailsInput);
  locationInput.addEventListener("input", handleDetailsInput);

  const nextButton = makeButton("Next", "button primary wizard-action-button", () => {
    draft.cpdTitle = titleInput.value.trim();
    draft.cpdProvider = providerInput.value.trim();
    draft.cpdLocation = locationInput.value.trim();

    if (!draft.cpdTitle) {
      showAppAlert("Please enter a title.");
      return;
    }

    nextWizardStep();
  });

  wrapper.append(titleInput, providerInput, locationInput, nextButton);
  return appendEditSaveButton(wrapper);
}

function makeReviewScreen() {
  const wrapper = document.createElement("div");
  const review = document.createElement("div");
  review.className = "review-list";

  const procedureRows = [
    ["Date", formatDate(draft.date)],
    ["Placement", getEntryPlacementDisplay(draft)],
    ["Specialty", draft.specialty],
    ["Hospital", draft.hospital || "Not recorded"],
    ["Location", draft.context],
    ["Procedure", draft.procedure],
    ["Site", draft.site || "Not applicable"],
    ["Technique", draft.technique || "Not applicable"],
    ["Role", draft.role],
    ["Supervision", draft.supervision],
    ["Outcome", draft.outcome],
    ["Attempts", draft.attempts],
    ["Complication", draft.complication],
    ["Notes", draft.notes || "None"]
  ];

  const cpdRows = [
    ["Date", formatDate(draft.date)],
    ["Placement", getEntryPlacementDisplay(draft)],
    ["CPD type", draft.cpdType],
    ["Format", draft.cpdFormat],
    ["Topic", draft.cpdTopic],
    ["Title", draft.cpdTitle],
    ["Provider", draft.cpdProvider || "Not recorded"],
    ["Location", draft.cpdLocation || "Not recorded"],
    ["Time", draft.cpdTime],
    ["Evidence", draft.cpdEvidence],
    ["Reflection", draft.cpdReflection || "None"]
  ];

  const rows = currentEntryType === "procedure" ? procedureRows : cpdRows;

  rows.forEach(([label, value]) => {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    p.append(strong, document.createTextNode(value || "Not recorded"));
    review.appendChild(p);
  });

  wrapper.appendChild(review);

  if (!editingEntryId || hasUnsavedEditChanges()) {
    const saveButtonText = editingEntryId ? "Save changes" : "Save entry";
    wrapper.appendChild(makeButton(saveButtonText, "button primary wizard-action-button", () => {
      if (editingEntryId) {
        saveEditedDraft();
        return;
      }

      draft.updatedAt = new Date().toISOString();
      state.entries.push({ ...draft });

      editingEntryId = null;
      editReturnScreen = null;
      editReturnScrollY = 0;
      editOriginalComparableData = null;
      saveState();
      markChanged();
      showScreen("homeScreen");
    }));
  }

  return wrapper;
}


function setSpecialtiesProceduresBackAction(action) {
  specialtiesProceduresBackAction = typeof action === "function" ? action : () => showScreen("homeScreen");
}

function setSpecialtiesProceduresTitle(text) {
  const title = document.querySelector("#specialtiesProceduresScreen h2");
  if (title) title.textContent = text;
}

function renderVersionLabel() {
  const label = document.getElementById("appVersionLabel");
  if (label) label.textContent = APP_VERSION;
}

function renderSpecialtiesProceduresHome() {
  const container = document.getElementById("specialtiesProceduresContent");
  if (!container) return;
  activeHomeGuard = null;

  setSpecialtiesProceduresTitle("Specialties & procedures");
  setSpecialtiesProceduresBackAction(() => showScreen("homeScreen"));
  container.innerHTML = "";

  const message = document.createElement("p");
  message.className = "help-text";
  message.textContent = "Tap a specialty to manage its categories and procedures. Use the Shown/Hidden capsule to control whether it appears when adding entries.";
  container.appendChild(message);

  const list = document.createElement("div");
  list.className = "management-list";

  defaultSpecialties.forEach(specialty => {
    const hidden = isSpecialtyHiddenById(specialty.id);
    list.appendChild(makeManagementCard({
      title: specialty.name,
      subtitle: hidden ? "Hidden from new entries" : "Shown when adding entries",
      hidden,
      onOpen: () => renderProcedureCategoriesForSpecialty(specialty.id),
      onToggle: () => {
        setSpecialtyHidden(specialty.name, !hidden);
        renderSpecialtiesProceduresHome();
      }
    }));
  });

  container.appendChild(list);
}

function renderProcedureCategoriesForSpecialty(specialtyId) {
  const container = document.getElementById("specialtiesProceduresContent");
  if (!container) return;
  activeHomeGuard = null;

  const specialtyName = getSpecialtyNameById(specialtyId) || "Specialty";
  setSpecialtiesProceduresTitle(specialtyName);
  setSpecialtiesProceduresBackAction(renderSpecialtiesProceduresHome);
  container.innerHTML = "";

  const message = document.createElement("p");
  message.className = "help-text";
  message.textContent = "Tap a category to manage its procedures. Use the Shown/Hidden capsule to control whether the category appears when adding entries.";
  container.appendChild(message);

  const list = document.createElement("div");
  list.className = "management-list";

  defaultProcedureCategories.forEach(category => {
    const hidden = isCategoryHidden(specialtyId, category.id);
    const count = getAssignedProcedureIds(specialtyId, category.id).length;
    const subtitle = `${count} ${count === 1 ? "procedure" : "procedures"}`;

    list.appendChild(makeManagementCard({
      title: category.name,
      subtitle: hidden ? `${subtitle} • Hidden from new entries` : `${subtitle} • Shown when adding entries`,
      hidden,
      onOpen: () => renderProceduresForCategory(specialtyId, category.id),
      onToggle: () => {
        setCategoryHidden(specialtyId, category.id, !hidden);
        renderProcedureCategoriesForSpecialty(specialtyId);
      }
    }));
  });

  container.appendChild(list);
}

function renderProceduresForCategory(specialtyId, categoryId) {
  const container = document.getElementById("specialtiesProceduresContent");
  if (!container) return;
  activeHomeGuard = null;

  const specialtyName = getSpecialtyNameById(specialtyId) || "Specialty";
  const categoryName = getProcedureCategoryName(categoryId);
  setSpecialtiesProceduresTitle(categoryName);
  setSpecialtiesProceduresBackAction(() => renderProcedureCategoriesForSpecialty(specialtyId));
  container.innerHTML = "";

  const context = document.createElement("p");
  context.className = "help-text";
  context.textContent = `${specialtyName} • ${categoryName}`;
  container.appendChild(context);

  const allAssignedProcedures = getAssignedProcedureIds(specialtyId, categoryId)
    .map(getProcedureById)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  let search = null;

  if (allAssignedProcedures.length > 10) {
    search = document.createElement("input");
    search.className = "search-input";
    search.type = "search";
    search.placeholder = "Search procedures";
    container.appendChild(search);
  }

  const list = document.createElement("div");
  list.className = "management-list";
  container.appendChild(list);

  const renderProcedureList = () => {
    list.innerHTML = "";
    const query = search ? normaliseText(search.value) : "";
    const procedures = allAssignedProcedures
      .filter(procedure => !query || normaliseText(procedure.name).includes(query));

    if (procedures.length === 0) {
      const empty = document.createElement("p");
      empty.className = "help-text";
      empty.textContent = "No procedures found in this category.";
      list.appendChild(empty);
      return;
    }

    procedures.forEach(procedure => {
      const hidden = isProcedureAssignmentHidden(specialtyId, categoryId, procedure.id);
      const isCustom = isUserAddedProcedure(procedure.id);
      const card = makeManagementCard({
        title: procedure.name,
        subtitle: isCustom
          ? (hidden ? "User-added • Hidden from new entries" : "User-added • Shown when adding entries")
          : (hidden ? "Default • Hidden from new entries" : "Default • Shown when adding entries"),
        hidden,
        onOpen: null,
        onToggle: () => {
          setProcedureAssignmentHidden(specialtyId, categoryId, procedure.id, !hidden);
          renderProcedureList();
        }
      });

      list.appendChild(card);
    });
  };

  if (search) search.addEventListener("input", renderProcedureList);
  renderProcedureList();

  container.appendChild(makeButton("Add/Remove procedures", "button secondary wizard-action-button", () => {
    renderAddRemoveProceduresForCategory(specialtyId, categoryId);
  }));
}

function renderAddRemoveProceduresForCategory(specialtyId, categoryId) {
  const container = document.getElementById("specialtiesProceduresContent");
  if (!container) return;
  activeHomeGuard = null;

  const specialtyName = getSpecialtyNameById(specialtyId) || "Specialty";
  const categoryName = getProcedureCategoryName(categoryId);
  const proceduresToAdd = new Set();
  const proceduresToRemove = new Set();

  setSpecialtiesProceduresTitle("Add/remove procedures");
  setSpecialtiesProceduresBackAction(() => renderProceduresForCategory(specialtyId, categoryId));
  container.innerHTML = "";

  const context = document.createElement("p");
  context.className = "help-text";
  context.textContent = `${specialtyName} • ${categoryName}\nSearch all procedures, then choose which should be added to or removed from this category.`;
  container.appendChild(context);

  const makeChangesButton = makeButton("Make changes", "button primary wizard-action-button", () => {
    const addIds = Array.from(proceduresToAdd);
    const removeIds = Array.from(proceduresToRemove);
    if (addIds.length === 0 && removeIds.length === 0) return;

    addIds.forEach(procedureId => {
      addProcedureAssignment(specialtyId, categoryId, procedureId);
    });

    removeIds.forEach(procedureId => {
      removeProcedureAssignment(specialtyId, categoryId, procedureId);
    });

    renderProceduresForCategory(specialtyId, categoryId);
  });
  makeChangesButton.disabled = true;
  makeChangesButton.classList.add("disabled-action-button");

  const createNewButton = makeButton("Create new procedure", "button secondary wizard-action-button", () => {
    renderCreateProcedureScreen(specialtyId, categoryId);
  });

  const actions = document.createElement("div");
  actions.className = "stacked-buttons procedure-top-actions";
  actions.append(makeChangesButton, createNewButton);
  container.appendChild(actions);

  const search = document.createElement("input");
  search.className = "search-input";
  search.type = "search";
  search.placeholder = "Search all procedures";
  container.appendChild(search);

  const list = document.createElement("div");
  list.className = "management-list";
  container.appendChild(list);

  const updateMakeChangesButton = () => {
    const changeCount = proceduresToAdd.size + proceduresToRemove.size;
    makeChangesButton.disabled = changeCount === 0;
    makeChangesButton.classList.toggle("disabled-action-button", changeCount === 0);
    makeChangesButton.textContent = changeCount === 0
      ? "Make changes"
      : `Make ${changeCount} ${changeCount === 1 ? "change" : "changes"}`;

    if (changeCount > 0) {
      setUnsavedFormHomeGuard("Unapplied procedure changes will be lost.");
    } else {
      activeHomeGuard = null;
      updateFloatingNavigationControls();
    }
  };

  const makeSelectableProcedureCard = procedure => {
    const currentlyAdded = isProcedureAssignedToCategory(specialtyId, categoryId, procedure.id);
    const flaggedForAdd = proceduresToAdd.has(procedure.id);
    const flaggedForRemove = proceduresToRemove.has(procedure.id);

    const card = document.createElement("div");
    card.className = "management-card procedure-selection-card";
    if (flaggedForAdd) card.classList.add("procedure-change-add");
    if (flaggedForRemove) card.classList.add("procedure-change-remove");

    const text = document.createElement("div");
    text.className = "management-card-text";

    const heading = document.createElement("h3");
    heading.textContent = procedure.name;

    const detail = document.createElement("p");
    if (flaggedForAdd) {
      detail.textContent = "Will be added to this category";
    } else if (flaggedForRemove) {
      detail.textContent = "Will be removed from this category";
    } else if (currentlyAdded) {
      detail.textContent = "Currently in this category";
    } else if (isUserAddedProcedure(procedure.id)) {
      detail.textContent = "Custom procedure";
    } else {
      detail.textContent = "App procedure";
    }

    text.append(heading, detail);

    const capsule = document.createElement("button");
    capsule.type = "button";
    capsule.className = "procedure-select-pill";

    if (currentlyAdded) {
      capsule.classList.add(flaggedForRemove ? "procedure-remove-selected-pill" : "procedure-remove-pill");
      capsule.textContent = flaggedForRemove ? "Keep" : "Remove";
    } else {
      capsule.classList.add(flaggedForAdd ? "procedure-selected-pill" : "procedure-add-pill");
      capsule.textContent = flaggedForAdd ? "Selected" : "Add";
    }

    capsule.addEventListener("click", event => {
      event.stopPropagation();

      if (currentlyAdded) {
        if (proceduresToRemove.has(procedure.id)) {
          proceduresToRemove.delete(procedure.id);
        } else {
          proceduresToRemove.add(procedure.id);
          proceduresToAdd.delete(procedure.id);
        }
      } else if (proceduresToAdd.has(procedure.id)) {
        proceduresToAdd.delete(procedure.id);
      } else {
        proceduresToAdd.add(procedure.id);
        proceduresToRemove.delete(procedure.id);
      }

      updateMakeChangesButton();
      renderSearchResults();
    });

    card.append(text, capsule);
    return card;
  };

  const renderSearchResults = () => {
    list.innerHTML = "";
    const query = normaliseText(search.value);
    const procedures = getAllProcedureLibraryItems()
      .filter(procedure => !query || normaliseText(procedure.name).includes(query))
      .sort((a, b) => {
        const aAdded = isProcedureAssignedToCategory(specialtyId, categoryId, a.id);
        const bAdded = isProcedureAssignedToCategory(specialtyId, categoryId, b.id);
        if (aAdded !== bAdded) return aAdded ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    if (procedures.length === 0) {
      const empty = document.createElement("p");
      empty.className = "help-text";
      empty.textContent = "No matching procedures found.";
      list.appendChild(empty);
      return;
    }

    procedures.forEach(procedure => {
      list.appendChild(makeSelectableProcedureCard(procedure));
    });
  };

  search.addEventListener("input", renderSearchResults);
  updateMakeChangesButton();
  renderSearchResults();
}

function renderCreateProcedureScreen(specialtyId, categoryId) {
  const container = document.getElementById("specialtiesProceduresContent");
  if (!container) return;
  setUnsavedFormHomeGuard("Unsaved procedure details will be lost.");

  setSpecialtiesProceduresTitle("Create new procedure");
  setSpecialtiesProceduresBackAction(() => renderAddRemoveProceduresForCategory(specialtyId, categoryId));
  container.innerHTML = "";

  const instructions = document.createElement("p");
  instructions.className = "help-text";
  instructions.textContent = "Create a new procedure and add it to this specialty/category.";

  const nameInput = document.createElement("input");
  nameInput.className = "text-input";
  nameInput.placeholder = "Procedure name";

  const siteLabel = makeCheckboxRow("Show Site page for this procedure", false);
  const techniqueLabel = makeCheckboxRow("Show Technique page for this procedure", false);

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", () => {
    renderAddRemoveProceduresForCategory(specialtyId, categoryId);
  });

  const createButton = makeButton("Create procedure", "button primary wizard-action-button", () => {
    const name = nameInput.value.trim();

    if (!name) {
      showAppAlert("Please enter a procedure name.");
      return;
    }

    const existing = getAllProcedureLibraryItems().find(procedure => normaliseText(procedure.name) === normaliseText(name));

    if (existing) {
      addProcedureAssignment(specialtyId, categoryId, existing.id);
      renderProceduresForCategory(specialtyId, categoryId);
      return;
    }

    const now = new Date().toISOString();
    const procedure = {
      id: makeProcedureIdFromName(name),
      name,
      needsSite: siteLabel.input.checked,
      needsTechnique: techniqueLabel.input.checked,
      createdAt: now,
      updatedAt: now
    };

    state.procedureSettings.customProcedures.push(procedure);
    state.procedureSettings.customAssignments.push({
      procedureId: procedure.id,
      specialtyId,
      categoryId
    });
    markChanged();
    renderProceduresForCategory(specialtyId, categoryId);
  });

  container.append(
    instructions,
    nameInput,
    siteLabel.row,
    techniqueLabel.row,
    makeActionRow([cancelButton, createButton])
  );
}

function makeCheckboxRow(text, checked) {
  const row = document.createElement("label");
  row.className = "checkbox-row";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);

  const label = document.createElement("span");
  label.textContent = text;

  row.append(input, label);
  return { row, input };
}

function makeManagementCard({ title, subtitle, hidden, onOpen, onToggle }) {
  const card = document.createElement("div");
  card.className = hidden ? "management-card management-hidden" : "management-card";

  if (typeof onOpen === "function") {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", onOpen);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen();
      }
    });
  }

  const text = document.createElement("div");
  text.className = "management-card-text";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const detail = document.createElement("p");
  detail.textContent = subtitle || "";

  text.append(heading, detail);

  const status = document.createElement("button");
  status.type = "button";
  status.className = hidden ? "status-pill status-hidden" : "status-pill status-shown";
  status.textContent = hidden ? "Hidden" : "Shown";
  status.addEventListener("click", event => {
    event.stopPropagation();
    if (typeof onToggle === "function") onToggle();
  });

  card.append(text, status);
  return card;
}

function closeAppDialog() {
  const existingDialog = document.querySelector(".dialog-overlay");
  if (existingDialog) existingDialog.remove();
}

function showAppAlert(message, title = "Notice", onClose = null) {
  closeAppDialog();

  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  overlay.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "app-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const heading = document.createElement("h3");
  heading.textContent = title;

  const body = document.createElement("p");
  body.className = "app-dialog-message";
  body.textContent = String(message || "");

  const okButton = makeButton("OK", "button primary wizard-action-button", () => {
    closeAppDialog();
    if (typeof onClose === "function") onClose();
  });

  const actionRow = document.createElement("div");
  actionRow.className = "action-row single-action dialog-action-row";
  actionRow.appendChild(okButton);

  dialog.append(heading, body, actionRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  okButton.focus();
}

function showAppConfirm({
  title = "Confirm",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmClass = "button primary wizard-action-button",
  onConfirm = null,
  onCancel = null,
  content = null
} = {}) {
  closeAppDialog();

  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  overlay.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "app-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const heading = document.createElement("h3");
  heading.textContent = title;

  const body = document.createElement("p");
  body.className = "app-dialog-message";
  body.textContent = String(message || "");

  const cancelButton = makeButton(cancelText, "button secondary wizard-action-button", () => {
    closeAppDialog();
    if (typeof onCancel === "function") onCancel();
  });

  const confirmButton = makeButton(confirmText, confirmClass, () => {
    closeAppDialog();
    if (typeof onConfirm === "function") onConfirm();
  });

  const actionRow = document.createElement("div");
  actionRow.className = "action-row dialog-action-row";
  actionRow.append(cancelButton, confirmButton);

  dialog.append(heading, body);
  if (content) dialog.appendChild(content);
  dialog.appendChild(actionRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  cancelButton.focus();
}


function showAppChoiceDialog({ title = "Choose an option", message = "", actions = [] } = {}) {
  closeAppDialog();

  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  overlay.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "app-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");

  const heading = document.createElement("h3");
  heading.textContent = title;

  const body = document.createElement("p");
  body.className = "app-dialog-message";
  body.textContent = String(message || "");

  const actionRow = document.createElement("div");
  actionRow.className = actions.length > 2 ? "dialog-stacked-actions" : "action-row dialog-action-row";

  actions.forEach(item => {
    const button = makeButton(item.text, item.className || "button secondary wizard-action-button", () => {
      closeAppDialog();
      if (typeof item.action === "function") item.action();
    });
    actionRow.appendChild(button);
  });

  dialog.append(heading, body, actionRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const firstButton = actionRow.querySelector("button");
  if (firstButton) firstButton.focus();
}

function makeButton(text, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;

  const label = document.createElement("span");
  label.className = "button-label";
  label.textContent = text;
  button.appendChild(label);

  button.addEventListener("click", onClick);
  return button;
}

function makeActionRow(buttons) {
  const row = document.createElement("div");
  row.className = buttons.length === 1 ? "action-row single-action" : "action-row";
  buttons.forEach(button => row.appendChild(button));
  return row;
}


function setPlacementsBackAction(action) {
  placementsBackAction = typeof action === "function" ? action : () => showScreen("homeScreen");
}

function setPlacementsTitle(text) {
  const title = document.querySelector("#placementsScreen h2");
  if (title) title.textContent = text;
}

function togglePlacementVisibility(placement) {
  placement.hidden = !placement.hidden;
  placement.updatedAt = new Date().toISOString();
  markChanged();
  renderPlacements();
}

function renderPlacements() {
  const container = document.getElementById("placementsContent");
  if (!container) return;
  activeHomeGuard = null;

  setPlacementsTitle("Placements");
  setPlacementsBackAction(() => showScreen("homeScreen"));
  container.innerHTML = "";

  if (state.placements.length === 0) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "No placements added yet.";
    container.appendChild(empty);
  } else {
    const list = document.createElement("div");
    list.className = "placement-list";

    state.placements.forEach(placement => {
      const card = document.createElement("div");
      card.className = placement.hidden ? "placement-card placement-hidden" : "placement-card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.addEventListener("click", () => renderEditPlacementScreen(placement.id));
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          renderEditPlacementScreen(placement.id);
        }
      });

      const text = document.createElement("div");
      text.className = "placement-card-text";

      const name = document.createElement("h3");
      name.textContent = placement.name;

      const dates = document.createElement("p");
      dates.textContent = formatPlacementRange(placement);

      text.append(name, dates);

      const status = document.createElement("button");
      status.type = "button";
      status.className = placement.hidden ? "status-pill status-hidden" : "status-pill status-shown";
      status.textContent = placement.hidden ? "Hidden" : "Shown";
      status.setAttribute("aria-label", `${placement.hidden ? "Show" : "Hide"} ${placement.name}`);
      status.addEventListener("click", event => {
        event.stopPropagation();
        togglePlacementVisibility(placement);
      });

      card.append(text, status);
      list.appendChild(card);
    });

    container.appendChild(list);
  }

  container.appendChild(makeActionRow([
    makeButton("Add placement", "button secondary wizard-action-button", renderAddPlacementScreen)
  ]));
}

function renderAddPlacementScreen() {
  const container = document.getElementById("placementsContent");
  if (!container) return;
  setUnsavedFormHomeGuard("Unsaved placement details will be lost.");

  setPlacementsTitle("Add placement");
  setPlacementsBackAction(renderPlacements);
  container.innerHTML = "";

  const instructions = document.createElement("p");
  instructions.className = "help-text";
  instructions.textContent = "Add the name and date range for this placement.";

  const nameInput = document.createElement("input");
  nameInput.className = "text-input";
  nameInput.placeholder = "Placement name, e.g. ACCS Emergency Medicine";

  const startLabel = makeFieldLabel("Start date");
  const startInput = document.createElement("input");
  startInput.type = "date";
  startInput.className = "date-input compact-date-input";

  const endLabel = makeFieldLabel("End date");
  const endInput = document.createElement("input");
  endInput.type = "date";
  endInput.className = "date-input compact-date-input";

  const saveButton = makeButton("Save placement", "button primary wizard-action-button", () => {
    const name = nameInput.value.trim();
    const startDate = startInput.value;
    const endDate = endInput.value;

    if (!name) {
      showAppAlert("Please enter a placement name.");
      return;
    }

    if (!startDate || !endDate) {
      showAppAlert("Please enter both a start date and an end date.");
      return;
    }

    if (endDate < startDate) {
      showAppAlert("The end date cannot be before the start date.");
      return;
    }

    const duplicate = state.placements.some(placement => {
      return normaliseText(placement.name) === normaliseText(name)
        && placement.startDate === startDate
        && placement.endDate === endDate;
    });

    if (duplicate) {
      showAppAlert("This placement already exists.");
      return;
    }

    const now = new Date().toISOString();
    state.placements.push({
      id: makeId(),
      name,
      startDate,
      endDate,
      hidden: false,
      createdAt: now,
      updatedAt: now
    });

    markChanged();
    renderPlacements();
  });

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderPlacements);

  const actionRow = document.createElement("div");
  actionRow.className = "action-row";
  actionRow.append(cancelButton, saveButton);

  container.append(
    instructions,
    nameInput,
    startLabel,
    startInput,
    endLabel,
    endInput,
    actionRow
  );
}

function renderEditPlacementScreen(placementId) {
  const container = document.getElementById("placementsContent");
  if (!container) return;
  setUnsavedFormHomeGuard("Unsaved changes to this placement will be lost.");

  const placement = state.placements.find(item => item.id === placementId);

  if (!placement) {
    renderPlacements();
    return;
  }

  setPlacementsTitle("Edit placement");
  setPlacementsBackAction(renderPlacements);
  container.innerHTML = "";

  const instructions = document.createElement("p");
  instructions.className = "help-text";
  instructions.textContent = "Update the name and date range for this placement.";

  const nameInput = document.createElement("input");
  nameInput.className = "text-input";
  nameInput.placeholder = "Placement name, e.g. ACCS Emergency Medicine";
  nameInput.value = placement.name || "";

  const startLabel = makeFieldLabel("Start date");
  const startInput = document.createElement("input");
  startInput.type = "date";
  startInput.className = "date-input compact-date-input";
  startInput.value = placement.startDate || "";

  const endLabel = makeFieldLabel("End date");
  const endInput = document.createElement("input");
  endInput.type = "date";
  endInput.className = "date-input compact-date-input";
  endInput.value = placement.endDate || "";

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderPlacements);

  const saveButton = makeButton("Save placement", "button primary wizard-action-button", () => {
    const name = nameInput.value.trim();
    const startDate = startInput.value;
    const endDate = endInput.value;

    if (!name) {
      showAppAlert("Please enter a placement name.");
      return;
    }

    if (!startDate || !endDate) {
      showAppAlert("Please enter both a start date and an end date.");
      return;
    }

    if (endDate < startDate) {
      showAppAlert("The end date cannot be before the start date.");
      return;
    }

    const duplicate = state.placements.some(item => {
      return item.id !== placement.id
        && normaliseText(item.name) === normaliseText(name)
        && item.startDate === startDate
        && item.endDate === endDate;
    });

    if (duplicate) {
      showAppAlert("This placement already exists.");
      return;
    }

    placement.name = name;
    placement.startDate = startDate;
    placement.endDate = endDate;
    placement.updatedAt = new Date().toISOString();

    markChanged();
    renderPlacements();
  });

  const actionRow = document.createElement("div");
  actionRow.className = "action-row";
  actionRow.append(cancelButton, saveButton);

  const deleteButton = makeButton("Delete placement", "button danger-button wizard-action-button full-width-action", () => {
    showDeletePlacementDialog(placement.id);
  });

  container.append(
    instructions,
    nameInput,
    startLabel,
    startInput,
    endLabel,
    endInput,
    actionRow,
    deleteButton
  );
}

function closePlacementDialog() {
  closeAppDialog();
}

function showDeletePlacementDialog(placementId) {
  const placement = state.placements.find(item => item.id === placementId);
  if (!placement) return;

  const placementName = document.createElement("div");
  placementName.className = "dialog-placement-name";

  const placementTitle = document.createElement("h4");
  placementTitle.textContent = placement.name;

  const placementDates = document.createElement("p");
  placementDates.textContent = formatPlacementRange(placement);

  placementName.append(placementTitle, placementDates);

  showAppConfirm({
    title: "Delete placement?",
    message: "Are you sure you want to delete this placement?",
    confirmText: "Delete",
    confirmClass: "button danger-button wizard-action-button",
    content: placementName,
    onConfirm: () => {
      state.placements = state.placements.filter(item => item.id !== placement.id);
      markChanged();
      renderPlacements();
    }
  });
}

function makeFieldLabel(text) {
  const label = document.createElement("label");
  label.className = "field-label";
  label.textContent = text;
  return label;
}

function renderLogbook() {
  const searchInput = document.getElementById("searchInput");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const list = document.getElementById("entryList");

  if (!list) return;

  list.innerHTML = "";

  const entries = state.entries
    .filter(entry => logbookFilter === "all" || entry.type === logbookFilter)
    .filter(entry => JSON.stringify(entry).toLowerCase().includes(searchTerm))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "help-text";
    empty.textContent = "No entries found.";
    list.appendChild(empty);
    return;
  }

  entries.forEach(entry => {
    const card = document.createElement("div");
    card.className = "entry-card";

    const text = document.createElement("div");
    text.className = "entry-card-text";

    const title = document.createElement("h3");
    title.textContent = entry.type === "procedure"
      ? entry.procedure || "Procedure"
      : entry.cpdTitle || "CPD entry";

    const date = document.createElement("p");
    date.className = "entry-card-date";
    date.textContent = formatDate(entry.date);

    const subtitle = document.createElement("p");
    subtitle.className = "entry-card-subtitle";
    subtitle.textContent = entry.type === "procedure"
      ? `${entry.hospital || "Hospital not recorded"} • ${entry.specialty || ""}`
      : `${entry.cpdType || "CPD"} • ${entry.cpdTime || ""}`;

    text.append(title, date, subtitle);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    actions.appendChild(makeButton("View", "small-button", () => {
      showAppAlert(entrySummary(entry));
    }));

    actions.appendChild(makeButton("Edit", "small-button", () => {
      editEntry(entry.id);
    }));

    actions.appendChild(makeButton("Delete", "small-button delete", () => {
      showAppConfirm({
        title: "Delete entry?",
        message: "Delete this entry? This cannot be undone.",
        confirmText: "Delete",
        confirmClass: "button danger-button wizard-action-button",
        onConfirm: () => {
          state.entries = state.entries.filter(item => item.id !== entry.id);
          saveState();
          markChanged();
          renderLogbook();
        }
      });
    }));

    card.append(text, actions);
    list.appendChild(card);
  });
}

function entrySummary(entry) {
  if (entry.type === "procedure") {
    return [
      `Date: ${formatDate(entry.date)}`,
      `Placement: ${getEntryPlacementDisplay(entry)}`,
      `Specialty: ${entry.specialty || "Not recorded"}`,
      `Hospital: ${entry.hospital || "Not recorded"}`,
      `Location: ${entry.context || "Not recorded"}`,
      `Procedure: ${entry.procedure || "Not recorded"}`,
      `Site: ${entry.site || "Not applicable"}`,
      `Technique: ${entry.technique || "Not applicable"}`,
      `Role: ${entry.role || "Not recorded"}`,
      `Supervision: ${entry.supervision || "Not recorded"}`,
      `Outcome: ${entry.outcome || "Not recorded"}`,
      `Attempts: ${entry.attempts || "Not recorded"}`,
      `Complication: ${entry.complication || "Not recorded"}`,
      `Notes: ${entry.notes || "None"}`
    ].join("\n");
  }

  return [
    `Date: ${formatDate(entry.date)}`,
    `Placement: ${getEntryPlacementDisplay(entry)}`,
    `Type: ${entry.cpdType || "Not recorded"}`,
    `Format: ${entry.cpdFormat || "Not recorded"}`,
    `Topic: ${entry.cpdTopic || "Not recorded"}`,
    `Title: ${entry.cpdTitle || "Not recorded"}`,
    `Provider: ${entry.cpdProvider || "Not recorded"}`,
    `Location: ${entry.cpdLocation || "Not recorded"}`,
    `Time: ${entry.cpdTime || "Not recorded"}`,
    `Evidence: ${entry.cpdEvidence || "Not recorded"}`,
    `Reflection: ${entry.cpdReflection || "None"}`
  ].join("\n");
}

function renderSummaries() {
  const container = document.getElementById("summaryContent");
  if (!container) return;

  container.innerHTML = "";

  const procedures = state.entries.filter(entry => entry.type === "procedure");
  const cpd = state.entries.filter(entry => entry.type === "cpd");

  container.appendChild(summaryCard("Overall", [
    `Total entries: ${state.entries.length}`,
    `Procedures: ${procedures.length}`,
    `CPD entries: ${cpd.length}`
  ]));

  container.appendChild(summaryCard("Procedures by type", countBy(procedures, "procedure")));
  container.appendChild(summaryCard("Procedures by hospital", countBy(procedures, "hospital")));
  container.appendChild(summaryCard("Procedures by location", countBy(procedures, "context")));
  container.appendChild(summaryCard("Procedures by supervision", countBy(procedures, "supervision")));
  container.appendChild(summaryCard("CPD by type", countBy(cpd, "cpdType")));
  container.appendChild(summaryCard("CPD by topic", countBy(cpd, "cpdTopic")));
  container.appendChild(summaryCard("CPD by time claimed", countBy(cpd, "cpdTime")));
}

function countBy(entries, field) {
  if (entries.length === 0) return ["None recorded."];

  const counts = {};

  entries.forEach(entry => {
    const key = entry[field] || "Not recorded";
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `${key}: ${count}`);
}

function countByAsObjects(entries, field, labelName) {
  const counts = {};

  entries.forEach(entry => {
    const key = entry[field] || "Not recorded";
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ [labelName]: key, Count: count }));
}

function summaryCard(title, rows) {
  const card = document.createElement("div");
  card.className = "summary-card";

  const heading = document.createElement("h3");
  heading.textContent = title;
  card.appendChild(heading);

  rows.forEach(row => {
    const p = document.createElement("p");
    p.textContent = row;
    card.appendChild(p);
  });

  return card;
}

function buildBackupObject() {
  return {
    app: "Procedure & CPD Logbook",
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
    hospitals: state.hospitals,
    placements: state.placements,
    procedureSettings: state.procedureSettings,
    customOptions: state.customOptions,
    hiddenDefaultOptions: state.hiddenDefaultOptions,
    backup: state.backup
  };
}

async function downloadJsonBackup() {
  const backup = buildBackupObject();
  const filename = `Logbook Backup ${formatFileDateTime()}.json`;
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  if (navigator.share && navigator.canShare && typeof File !== "undefined") {
    try {
      const file = new File([json], filename, { type: "application/json" });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Logbook Backup",
          text: "Procedure & CPD Logbook backup",
          files: [file]
        });

        markBackedUp();
        return;
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }

      console.log("File sharing failed; falling back to standard download.", error);
    }
  }

  downloadBlob(blob, filename);

  setTimeout(() => {
    showAppConfirm({
      title: "Backup saved?",
      message: "The backup file should now have downloaded or opened the save prompt.\n\nIf you saved the backup file successfully, tap Mark as backed up.\n\nIf you cancelled or are not sure, tap Cancel.",
      confirmText: "Mark as backed up",
      onConfirm: markBackedUp
    });
  }, 1500);
}

function downloadExcelWorkbook() {
  if (typeof XLSX === "undefined") {
    showAppAlert("The Excel export library has not loaded.\nPlease refresh the app and try again.");
    return;
  }

  const workbook = XLSX.utils.book_new();
  const allEntriesRows = state.entries.map(entryToAllEntriesRow);
  const procedureRows = state.entries.filter(entry => entry.type === "procedure").map(entryToProcedureRow);
  const cpdRows = state.entries.filter(entry => entry.type === "cpd").map(entryToCpdRow);

  addSheet(workbook, "All entries", allEntriesRows, allEntriesHeaders());
  addSheet(workbook, "Procedures", procedureRows, procedureHeaders());
  addSheet(workbook, "CPD", cpdRows, cpdHeaders());
  addSheet(workbook, "Procedure summary", buildProcedureSummaryRows(), ["Summary", "Value"]);
  addSheet(workbook, "CPD summary", buildCpdSummaryRows(), ["Summary", "Value"]);
  addSheet(workbook, "Hospital summary", countByAsObjects(procedureRows, "Hospital", "Hospital"), ["Hospital", "Count"]);
  addSheet(workbook, "Location summary", countByAsObjects(procedureRows, "Location", "Location"), ["Location", "Count"]);
  addSheet(workbook, "Supervision summary", countByAsObjects(procedureRows, "Supervision", "Supervision"), ["Supervision", "Count"]);
  addSheet(workbook, "Procedure type summary", countByAsObjects(procedureRows, "Procedure", "Procedure"), ["Procedure", "Count"]);
  addSheet(workbook, "Technique summary", countByAsObjects(procedureRows, "Technique", "Technique"), ["Technique", "Count"]);
  addSheet(workbook, "CPD topic summary", countByAsObjects(cpdRows, "Topic", "Topic"), ["Topic", "Count"]);

  const filename = `Procedure and CPD Logbook ${formatFileDateTime()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

function addSheet(workbook, sheetName, rows, headers) {
  const safeRows = rows.length > 0 ? rows : [emptyRow(headers)];
  const worksheet = XLSX.utils.json_to_sheet(safeRows, { header: headers });

  worksheet["!cols"] = headers.map(header => ({
    wch: Math.max(14, Math.min(35, header.length + 4))
  }));

  const lastRow = safeRows.length;
  const lastCol = headers.length - 1;

  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastRow, c: lastCol }
    })
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function emptyRow(headers) {
  const row = {};
  headers.forEach(header => {
    row[header] = "";
  });
  return row;
}

function allEntriesHeaders() {
  return [
    "Type",
    "Date",
    "Placement",
    "Hospital",
    "Specialty",
    "Location",
    "Procedure",
    "Site",
    "Technique",
    "Role",
    "Supervision",
    "Outcome",
    "Attempts",
    "Complication",
    "Notes",
    "CPD type",
    "CPD format",
    "Topic",
    "Title",
    "Provider",
    "CPD location",
    "Time claimed",
    "Evidence",
    "Reflection",
    "Created at",
    "Updated at"
  ];
}

function procedureHeaders() {
  return [
    "Date",
    "Placement",
    "Hospital",
    "Specialty",
    "Location",
    "Procedure",
    "Site",
    "Technique",
    "Role",
    "Supervision",
    "Outcome",
    "Attempts",
    "Complication",
    "Notes",
    "Created at",
    "Updated at"
  ];
}

function cpdHeaders() {
  return [
    "Date",
    "Placement",
    "CPD type",
    "CPD format",
    "Topic",
    "Title",
    "Provider",
    "Location",
    "Time claimed",
    "Evidence",
    "Reflection",
    "Created at",
    "Updated at"
  ];
}

function entryToAllEntriesRow(entry) {
  return {
    "Type": entry.type || "",
    "Date": entry.date || "",
    "Placement": getEntryPlacementExport(entry),
    "Hospital": entry.hospital || "",
    "Specialty": entry.specialty || "",
    "Location": entry.context || "",
    "Procedure": entry.procedure || "",
    "Site": entry.site || "",
    "Technique": entry.technique || "",
    "Role": entry.role || "",
    "Supervision": entry.supervision || "",
    "Outcome": entry.outcome || "",
    "Attempts": entry.attempts || "",
    "Complication": entry.complication || "",
    "Notes": entry.notes || "",
    "CPD type": entry.cpdType || "",
    "CPD format": entry.cpdFormat || "",
    "Topic": entry.cpdTopic || "",
    "Title": entry.cpdTitle || "",
    "Provider": entry.cpdProvider || "",
    "CPD location": entry.cpdLocation || "",
    "Time claimed": entry.cpdTime || "",
    "Evidence": entry.cpdEvidence || "",
    "Reflection": entry.cpdReflection || "",
    "Created at": entry.createdAt || "",
    "Updated at": entry.updatedAt || ""
  };
}

function entryToProcedureRow(entry) {
  return {
    "Date": entry.date || "",
    "Placement": getEntryPlacementExport(entry),
    "Hospital": entry.hospital || "",
    "Specialty": entry.specialty || "",
    "Location": entry.context || "",
    "Procedure": entry.procedure || "",
    "Site": entry.site || "",
    "Technique": entry.technique || "",
    "Role": entry.role || "",
    "Supervision": entry.supervision || "",
    "Outcome": entry.outcome || "",
    "Attempts": entry.attempts || "",
    "Complication": entry.complication || "",
    "Notes": entry.notes || "",
    "Created at": entry.createdAt || "",
    "Updated at": entry.updatedAt || ""
  };
}

function entryToCpdRow(entry) {
  return {
    "Date": entry.date || "",
    "Placement": getEntryPlacementExport(entry),
    "CPD type": entry.cpdType || "",
    "CPD format": entry.cpdFormat || "",
    "Topic": entry.cpdTopic || "",
    "Title": entry.cpdTitle || "",
    "Provider": entry.cpdProvider || "",
    "Location": entry.cpdLocation || "",
    "Time claimed": entry.cpdTime || "",
    "Evidence": entry.cpdEvidence || "",
    "Reflection": entry.cpdReflection || "",
    "Created at": entry.createdAt || "",
    "Updated at": entry.updatedAt || ""
  };
}

function buildProcedureSummaryRows() {
  const procedures = state.entries.filter(entry => entry.type === "procedure");

  return [
    { Summary: "Total procedures", Value: procedures.length },
    { Summary: "Successful procedures", Value: procedures.filter(entry => entry.outcome === "Successful").length },
    { Summary: "Unsuccessful procedures", Value: procedures.filter(entry => entry.outcome === "Unsuccessful").length },
    { Summary: "Procedures with recorded complications", Value: procedures.filter(entry => entry.complication && entry.complication !== "None").length },
    { Summary: "Independent procedures", Value: procedures.filter(entry => entry.supervision === "Independent").length },
    { Summary: "Directly supervised procedures", Value: procedures.filter(entry => entry.supervision === "Direct supervision").length },
    { Summary: "Indirectly supervised procedures", Value: procedures.filter(entry => entry.supervision === "Indirect supervision").length },
    { Summary: "Arterial lines using ultrasound", Value: procedures.filter(entry => entry.procedure === "Arterial line" && entry.technique === "Ultrasound").length },
    { Summary: "Arterial lines using landmark technique", Value: procedures.filter(entry => entry.procedure === "Arterial line" && entry.technique === "Landmark").length }
  ];
}

function buildCpdSummaryRows() {
  const cpd = state.entries.filter(entry => entry.type === "cpd");

  return [
    { Summary: "Total CPD entries", Value: cpd.length },
    { Summary: "Entries with certificate available", Value: cpd.filter(entry => entry.cpdEvidence === "Certificate available").length },
    { Summary: "Entries with attendance recorded", Value: cpd.filter(entry => entry.cpdEvidence === "Attendance recorded").length },
    { Summary: "Reflection-only entries", Value: cpd.filter(entry => entry.cpdEvidence === "Reflection only").length },
    { Summary: "Entries with no evidence recorded", Value: cpd.filter(entry => entry.cpdEvidence === "No evidence").length }
  ];
}

function importJsonBackup(file) {
  const reader = new FileReader();

  reader.onload = event => {
    try {
      const imported = JSON.parse(event.target.result);

      if (!Array.isArray(imported.entries)) {
        showAppAlert("This does not look like a valid logbook backup.");
        return;
      }

      showAppConfirm({
        title: "Import backup?",
        message: "This will replace the current entries, hospital list, placements, and custom option lists on this device.",
        confirmText: "Import",
        confirmClass: "button danger-button wizard-action-button",
        onConfirm: () => {
          state.entries = imported.entries || [];
          state.hospitals = imported.hospitals || [];
          state.placements = imported.placements || [];
          state.procedureSettings = imported.procedureSettings || emptyProcedureSettings();
          state.customOptions = imported.customOptions || emptyOptionStore();
          state.hiddenDefaultOptions = imported.hiddenDefaultOptions || emptyOptionStore();
          state.backup = {
            lastBackupAt: new Date().toISOString(),
            changeCountSinceBackup: 0
          };

          ensureStateShape();
          saveState();
          renderBackupStatus();
          showScreen("homeScreen");
          showAppAlert("Backup imported successfully.", "Backup imported");
        }
      });
    } catch {
      showAppAlert("Could not import this file.");
    }
  };

  reader.readAsText(file);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Missing element #${id}`);
    return;
  }
  element.addEventListener("click", handler);
}

function attachEvents() {
  bindClick("addEntryButton", () => {
    showScreen("entryTypeScreen");
  });

  bindClick("viewLogbookButton", () => {
    showScreen("logbookScreen");
  });

  bindClick("viewSummariesButton", () => {
    showScreen("summariesScreen");
  });

  bindClick("managePlacementsButton", () => {
    showScreen("placementsScreen");
  });

  bindClick("manageSpecialtiesProceduresButton", () => {
    showScreen("specialtiesProceduresScreen");
  });

  bindClick("viewBackupButton", () => {
    showScreen("backupScreen");
  });

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showScreen(button.dataset.go));
  });

  document.querySelectorAll("[data-entry-type]").forEach(button => {
    button.addEventListener("click", () => startEntry(button.dataset.entryType));
  });

  bindClick("backupNowButton", downloadJsonBackup);
  bindClick("downloadJsonButton", downloadJsonBackup);
  bindClick("downloadExcelButton", downloadExcelWorkbook);

  bindClick("importJsonButton", () => {
    const input = document.getElementById("importFileInput");
    if (input) input.click();
  });

  const importFileInput = document.getElementById("importFileInput");
  if (importFileInput) {
    importFileInput.addEventListener("change", event => {
      const file = event.target.files[0];
      if (file) importJsonBackup(file);
      event.target.value = "";
    });
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", renderLogbook);
  }

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      logbookFilter = button.dataset.filter;

      document.querySelectorAll(".filter-button").forEach(filterButton => {
        filterButton.classList.remove("active");
      });

      button.classList.add("active");
      renderLogbook();
    });
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(error => {
      console.log("Service worker registration failed:", error);
    });
  });
}

function init() {
  attachEvents();

  try {
    loadState();
    ensureStateShape();
  } catch (error) {
    console.error("App initialisation failed while preparing saved data.", error);
    showAppAlert("There was a problem preparing saved data. The app has still loaded so you can export or inspect what is available.");
  }

  try {
    renderBackupStatus();
    showScreen("homeScreen");
  } catch (error) {
    console.error("App initialisation failed while rendering the home screen.", error);
  }
}

init();

// DELIBERATE SYNTAX TEST - REMOVE BEFORE MERGE
const deliberateSyntaxError = ;
