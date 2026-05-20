const STORAGE_KEY = "procedureLogbookData_v1";

let state = {
  entries: [],
  hospitals: [],
  placements: [],
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
let placementsBackAction = () => showScreen("homeScreen");

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

const defaultProcedureOptions = {
  specialty: [
    "Critical Care",
    "Anaesthetics",
    "Emergency Medicine",
    "Acute Medicine"
  ],
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
      customOptions: parsed.customOptions || emptyOptionStore(),
      hiddenDefaultOptions: parsed.hiddenDefaultOptions || emptyOptionStore(),
      backup: parsed.backup || { lastBackupAt: null, changeCountSinceBackup: 0 }
    };
    ensureStateShape();
  } catch (error) {
    console.error("There was a problem loading saved data.", error);
    alert("There was a problem loading saved data. The app will open with a blank local copy. Your existing browser data has not been deleted.");
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
  if (screenId === "homeScreen" || screenId === "backupScreen") renderBackupStatus();
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
    alert("Please enter an option.");
    return false;
  }

  if (optionExists(field, text, procedureName)) {
    alert("This option already exists.");
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
    alert("Could not find this entry.");
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

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";

  if (editingEntryId) {
    cancelButton.className = "cancel-edit-link";
    cancelButton.textContent = "Cancel edit";
    cancelButton.addEventListener("click", cancelEdit);
  } else {
    cancelButton.className = "cancel-entry-link";
    cancelButton.textContent = "Cancel entry";
    cancelButton.addEventListener("click", cancelEntry);
  }

  stepLabel.appendChild(cancelButton);
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

  if (step !== "review") {
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
  currentEntryType = null;
  wizardSteps = [];
  wizardIndex = 0;
  draft = {};
  currentEntrySummaryExpanded = false;
  showScreen("homeScreen");
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

  wrapper.appendChild(makeButton("Save changes", "button primary wizard-action-button edit-save-shortcut", saveEditedDraft));
  return wrapper;
}

function makeCancelEditButton() {
  return makeButton("Cancel edit", "button danger-button cancel-edit-button", cancelEdit);
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
      alert("Please enter a placement name.");
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      alert("The end date cannot be before the start date.");
      return;
    }

    const duplicate = state.placements.some(placement => {
      return normaliseText(placement.name) === normaliseText(name)
        && placement.startDate === startDate
        && placement.endDate === endDate;
    });

    if (duplicate) {
      alert("This placement already exists.");
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
      alert("Please enter a hospital name.");
      return;
    }

    const exists = state.hospitals.some(hospital => hospital.toLowerCase() === name.toLowerCase());

    if (exists) {
      alert("This hospital already exists.");
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
      const confirmed = confirm(
        `Delete ${hospital} from your quick-select hospital list?\n\nExisting logbook records will not be changed.`
      );

      if (!confirmed) return;

      state.hospitals = state.hospitals.filter(item => item !== hospital);
      if (draft.hospital === hospital) delete draft.hospital;
      markChanged();
      renderWizard();
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
      const confirmed = confirm(
        `Delete "${option}" from the ${label} quick-select list?\n\nExisting logbook records will not be changed.`
      );

      if (!confirmed) return;

      deleteUserOption(field, option, procedureName);
      renderWizard();
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
      alert("Please enter a value.");
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

  titleInput.addEventListener("input", syncDetailsDraft);
  providerInput.addEventListener("input", syncDetailsDraft);
  locationInput.addEventListener("input", syncDetailsDraft);

  const nextButton = makeButton("Next", "button primary wizard-action-button", () => {
    draft.cpdTitle = titleInput.value.trim();
    draft.cpdProvider = providerInput.value.trim();
    draft.cpdLocation = locationInput.value.trim();

    if (!draft.cpdTitle) {
      alert("Please enter a title.");
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
    saveState();
    markChanged();
    showScreen("homeScreen");
  }));

  return wrapper;
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

function makePlacementCancelLink() {
  const wrapper = document.createElement("div");
  wrapper.className = "placement-top-action";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "cancel-edit-link placement-cancel-link";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", renderPlacements);

  wrapper.appendChild(cancelButton);
  return wrapper;
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
      alert("Please enter a placement name.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please enter both a start date and an end date.");
      return;
    }

    if (endDate < startDate) {
      alert("The end date cannot be before the start date.");
      return;
    }

    const duplicate = state.placements.some(placement => {
      return normaliseText(placement.name) === normaliseText(name)
        && placement.startDate === startDate
        && placement.endDate === endDate;
    });

    if (duplicate) {
      alert("This placement already exists.");
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
      alert("Please enter a placement name.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please enter both a start date and an end date.");
      return;
    }

    if (endDate < startDate) {
      alert("The end date cannot be before the start date.");
      return;
    }

    const duplicate = state.placements.some(item => {
      return item.id !== placement.id
        && normaliseText(item.name) === normaliseText(name)
        && item.startDate === startDate
        && item.endDate === endDate;
    });

    if (duplicate) {
      alert("This placement already exists.");
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
  const existingDialog = document.querySelector(".dialog-overlay");
  if (existingDialog) {
    existingDialog.remove();
  }
}

function showDeletePlacementDialog(placementId) {
  const placement = state.placements.find(item => item.id === placementId);
  if (!placement) return;

  closePlacementDialog();

  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay";
  overlay.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "app-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "deletePlacementDialogTitle");

  const title = document.createElement("h3");
  title.id = "deletePlacementDialogTitle";
  title.textContent = "Delete placement?";

  const message = document.createElement("p");
  message.textContent = "Are you sure you want to delete this placement?";

  const placementName = document.createElement("div");
  placementName.className = "dialog-placement-name";

  const placementTitle = document.createElement("h4");
  placementTitle.textContent = placement.name;

  const placementDates = document.createElement("p");
  placementDates.textContent = formatPlacementRange(placement);

  placementName.append(placementTitle, placementDates);

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", closePlacementDialog);

  const deleteButton = makeButton("Delete", "button danger-button wizard-action-button", () => {
    state.placements = state.placements.filter(item => item.id !== placement.id);
    markChanged();
    closePlacementDialog();
    renderPlacements();
  });

  const actionRow = document.createElement("div");
  actionRow.className = "action-row dialog-action-row";
  actionRow.append(cancelButton, deleteButton);

  dialog.append(title, message, placementName, actionRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  cancelButton.focus();
}


function renderDeletePlacementsScreen(selectedIds = []) {
  const container = document.getElementById("placementsContent");
  if (!container) return;

  const selectedPlacementIds = new Set(selectedIds);

  setPlacementsTitle("Delete placements");
  setPlacementsBackAction(renderPlacements);
  container.innerHTML = "";

  const message = document.createElement("p");
  message.className = "help-text";
  message.textContent = "Select one or more placements to delete.";

  const list = document.createElement("div");
  list.className = "delete-placement-list";

  state.placements.forEach(placement => {
    const isSelected = selectedPlacementIds.has(placement.id);
    const button = makeButton(
      formatPlacementLabel(placement),
      isSelected ? "choice-button delete-select-button selected" : "choice-button delete-select-button",
      () => {
        if (selectedPlacementIds.has(placement.id)) {
          selectedPlacementIds.delete(placement.id);
        } else {
          selectedPlacementIds.add(placement.id);
        }

        renderDeletePlacementsScreen(Array.from(selectedPlacementIds));
      }
    );

    list.appendChild(button);
  });

  const deleteSelectedButton = makeButton(
    "Delete selected placements",
    selectedPlacementIds.size > 0
      ? "button danger-button wizard-action-button"
      : "button secondary wizard-action-button disabled-action-button",
    () => {
      if (selectedPlacementIds.size === 0) return;
      renderConfirmDeletePlacementsScreen(Array.from(selectedPlacementIds));
    }
  );
  deleteSelectedButton.disabled = selectedPlacementIds.size === 0;

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderPlacements);

  const actionRow = document.createElement("div");
  actionRow.className = "action-row";
  actionRow.append(cancelButton, deleteSelectedButton);

  container.append(
    message,
    list,
    actionRow
  );
}

function renderConfirmDeletePlacementsScreen(selectedIds = []) {
  const container = document.getElementById("placementsContent");
  if (!container) return;

  const selectedPlacementIds = new Set(selectedIds);
  const selectedPlacements = state.placements.filter(placement => selectedPlacementIds.has(placement.id));

  if (selectedPlacements.length === 0) {
    renderDeletePlacementsScreen();
    return;
  }

  setPlacementsTitle("Confirm deletion");
  setPlacementsBackAction(() => renderDeletePlacementsScreen(selectedIds));
  container.innerHTML = "";

  const message = document.createElement("p");
  message.className = "help-text";
  message.textContent = "These placements will be deleted. Existing logbook records will not be changed.";

  const list = document.createElement("div");
  list.className = "delete-confirm-list";

  selectedPlacements.forEach(placement => {
    const item = document.createElement("div");
    item.className = "delete-confirm-item";

    const name = document.createElement("h3");
    name.textContent = placement.name;

    const dates = document.createElement("p");
    dates.textContent = formatPlacementRange(placement);

    item.append(name, dates);
    list.appendChild(item);
  });

  const confirmButton = makeButton("Confirm deletion", "button danger-button wizard-action-button", () => {
    state.placements = state.placements.filter(placement => !selectedPlacementIds.has(placement.id));
    markChanged();
    renderPlacements();
  });

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderPlacements);

  const actionRow = document.createElement("div");
  actionRow.className = "action-row";
  actionRow.append(cancelButton, confirmButton);

  container.append(
    message,
    list,
    actionRow
  );
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
      alert(entrySummary(entry));
    }));

    actions.appendChild(makeButton("Edit", "small-button", () => {
      editEntry(entry.id);
    }));

    actions.appendChild(makeButton("Delete", "small-button delete", () => {
      const confirmed = confirm("Delete this entry? This cannot be undone.");
      if (!confirmed) return;

      state.entries = state.entries.filter(item => item.id !== entry.id);
      saveState();
      markChanged();
      renderLogbook();
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
    const saved = confirm(
      "The backup file should now have downloaded or opened the save prompt.\n\nIf you saved the backup file successfully, tap OK to mark your backup as up to date.\n\nIf you cancelled or are not sure, tap Cancel."
    );

    if (saved) markBackedUp();
  }, 1500);
}

function downloadExcelWorkbook() {
  if (typeof XLSX === "undefined") {
    alert("The Excel export library has not loaded.\nPlease refresh the app and try again.");
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
        alert("This does not look like a valid logbook backup.");
        return;
      }

      const confirmed = confirm(
        "Import this backup?\n\nThis will replace the current entries, hospital list, and custom option lists on this device."
      );

      if (!confirmed) return;

      state.entries = imported.entries || [];
      state.hospitals = imported.hospitals || [];
      state.placements = imported.placements || [];
      state.customOptions = imported.customOptions || emptyOptionStore();
      state.hiddenDefaultOptions = imported.hiddenDefaultOptions || emptyOptionStore();
      state.backup = {
        lastBackupAt: new Date().toISOString(),
        changeCountSinceBackup: 0
      };

      ensureStateShape();
      saveState();
      renderBackupStatus();
      alert("Backup imported successfully.");
      showScreen("homeScreen");
    } catch {
      alert("Could not import this file.");
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

  bindClick("placementsBackButton", () => {
    placementsBackAction();
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

  bindClick("wizardBackButton", goWizardBack);
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
    alert("There was a problem preparing saved data. The app has still loaded so you can export or inspect what is available.");
  }

  try {
    renderBackupStatus();
    showScreen("homeScreen");
  } catch (error) {
    console.error("App initialisation failed while rendering the home screen.", error);
  }
}

init();
