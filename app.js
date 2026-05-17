const STORAGE_KEY = "procedureLogbookData_v1";

let state = {
  entries: [],
  hospitals: [],
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
let logbookFilter = "all";
let editingEntryId = null;

const procedureSteps = [
  "date",
  "hospital",
  "specialty",
  "context",
  "procedure",
  "site",
  "technique",
  "role",
  "supervision",
  "outcome",
  "complication",
  "notes",
  "review"
];

const cpdSteps = [
  "date",
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
    "ICU",
    "Anaesthetics",
    "Emergency Medicine",
    "Acute Medicine",
    "Surgery",
    "Other"
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
  technique: [
    "Ultrasound",
    "Landmark"
  ],
  role: [
    "Observed",
    "Assisted",
    "Primary operator",
    "Supervisor"
  ],
  supervision: [
    "Direct supervision",
    "Indirect supervision",
    "Independent",
    "Supervising another clinician"
  ],
  outcome: [
    "Successful",
    "Unsuccessful"
  ],
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
  "Chest drain": [
    "Right chest",
    "Left chest",
    "Other"
  ],
  "Ascitic drain": [
    "Right abdomen",
    "Left abdomen",
    "Midline",
    "Other"
  ]
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
  cpdTime: [
    "15 minutes",
    "30 minutes",
    "1 hour",
    "2 hours",
    "Half day",
    "Full day",
    "Custom"
  ],
  cpdEvidence: [
    "Certificate available",
    "Attendance recorded",
    "Reflection only",
    "No evidence",
    "Other"
  ]
};

const configurableFields = [
  "specialty",
  "context",
  "procedure",
  "site",
  "cpdType",
  "cpdFormat",
  "cpdTopic"
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return "Not recorded";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
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

function ensureStateShape() {
  state.entries = Array.isArray(state.entries) ? state.entries : [];
  state.hospitals = cleanArray(state.hospitals).sort();
  state.customOptions = cleanOptionStore(state.customOptions);
  state.hiddenDefaultOptions = cleanOptionStore(state.hiddenDefaultOptions);

  state.backup = state.backup || {
    lastBackupAt: null,
    changeCountSinceBackup: 0
  };

  if (typeof state.backup.changeCountSinceBackup !== "number") {
    state.backup.changeCountSinceBackup = 0;
  }
}

function saveState() {
  ensureStateShape();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    state = {
      entries: parsed.entries || [],
      hospitals: parsed.hospitals || [],
      customOptions: parsed.customOptions || emptyOptionStore(),
      hiddenDefaultOptions: parsed.hiddenDefaultOptions || emptyOptionStore(),
      backup: parsed.backup || {
        lastBackupAt: null,
        changeCountSinceBackup: 0
      }
    };

    ensureStateShape();
  } catch {
    alert("There was a problem loading saved data.");
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

  document.getElementById(screenId).classList.add("active");
  currentScreen = screenId;

  if (screenId === "logbookScreen") renderLogbook();
  if (screenId === "summariesScreen") renderSummaries();
  if (screenId === "homeScreen" || screenId === "backupScreen") renderBackupStatus();
}

function renderBackupStatus() {
  const needsBackup = state.backup.changeCountSinceBackup > 0;
  const lastBackup = state.backup.lastBackupAt
    ? new Date(state.backup.lastBackupAt).toLocaleString("en-GB")
    : "Never";

  const title = needsBackup ? "Backup needed" : "Backup up to date";
  const text = needsBackup
    ? `${state.backup.changeCountSinceBackup} change(s) since last backup. Last backup: ${lastBackup}.`
    : `No changes since last backup. Last backup: ${lastBackup}.`;

  const backupCard = document.getElementById("backupCard");
  const backupTitle = document.getElementById("backupTitle");
  const backupText = document.getElementById("backupText");
  const backupNowButton = document.getElementById("backupNowButton");

  backupCard.classList.toggle("backup-ok", !needsBackup);
  backupCard.classList.toggle("backup-needed", needsBackup);
  backupTitle.textContent = title;
  backupText.textContent = text;
  backupNowButton.classList.toggle("hidden", !needsBackup);

  const backupScreenStatus = document.getElementById("backupScreenStatus");
  const backupScreenTitle = document.getElementById("backupScreenTitle");
  const backupScreenText = document.getElementById("backupScreenText");

  if (backupScreenStatus) {
    backupScreenStatus.classList.toggle("backup-ok", !needsBackup);
    backupScreenStatus.classList.toggle("backup-needed", needsBackup);
    backupScreenTitle.textContent = title;
    backupScreenText.textContent = text;
  }
}

function getDefaultOptions(field, procedureName = "") {
  if (field === "site") {
    return defaultSiteOptionsByProcedure[procedureName] || [];
  }

  if (defaultProcedureOptions[field]) {
    return defaultProcedureOptions[field];
  }

  if (defaultCpdOptions[field]) {
    return defaultCpdOptions[field];
  }

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
  const hiddenDefaults = getStoredOptionList("hiddenDefaultOptions", field, procedureName)
    .map(normaliseText);

  const visibleDefaults = defaults.filter(option =>
    !hiddenDefaults.includes(normaliseText(option))
  );

  const visibleKeys = new Set(visibleDefaults.map(normaliseText));

  const custom = getStoredOptionList("customOptions", field, procedureName)
    .filter(option => !visibleKeys.has(normaliseText(option)))
    .sort((a, b) => a.localeCompare(b));

  return [...visibleDefaults, ...custom];
}

function optionExists(field, value, procedureName = "") {
  const key = normaliseText(value);
  return getDisplayedOptions(field, procedureName)
    .some(option => normaliseText(option) === key);
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

  if (normaliseText(draft[field]) === normaliseText(value)) {
    delete draft[field];
  }

  if (field === "procedure") {
    delete draft.site;
    delete draft.technique;
  }

  markChanged();
}

function fieldLabel(field) {
  const labels = {
    specialty: "Specialty / Placement",
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
  if (step === "site") {
    return currentEntryType === "procedure" && procedureSupportsSite(draft.procedure);
  }

  if (step === "technique") {
    return currentEntryType === "procedure" && draft.procedure === "Arterial line";
  }

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

function startEntry(type) {
  currentEntryType = type;
  editingEntryId = null;

  draft = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    type,
    date: todayISO(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  wizardSteps = type === "procedure" ? procedureSteps : cpdSteps;
  wizardIndex = 0;

  showScreen("wizardScreen");
  renderWizard();
}

function editEntry(entryId) {
  const entry = state.entries.find(item => item.id === entryId);

  if (!entry) {
    alert("Could not find this entry.");
    return;
  }

  editingEntryId = entryId;
  currentEntryType = entry.type;
  draft = { ...entry };

  if (draft.type === "procedure" && !draft.context && draft.location) {
    draft.context = draft.location;
  }

  wizardSteps = entry.type === "procedure" ? procedureSteps : cpdSteps;
  wizardIndex = 0;

  showScreen("wizardScreen");
  renderWizard();
}

function goWizardBack() {
  const previousIndex = findNextRelevantIndex(wizardIndex, -1);

  if (previousIndex !== null) {
    wizardIndex = previousIndex;
    renderWizard();
  } else {
    showScreen("entryTypeScreen");
  }
}

function nextWizardStep() {
  const nextIndex = findNextRelevantIndex(wizardIndex, 1);

  if (nextIndex !== null) {
    wizardIndex = nextIndex;
    renderWizard();
  }
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

  stepLabel.textContent = `Step ${visibleStepNumber} of ${relevantSteps.length}`;
  help.textContent = "";
  content.innerHTML = "";

  if (step === "date") {
    title.textContent = currentEntryType === "procedure" ? "Date performed" : "Date completed";
    content.appendChild(makeDateScreen());
    return;
  }

  if (step === "hospital") {
    title.textContent = "Hospital";
    help.textContent = "Choose a saved hospital or add a new one.";
    content.appendChild(makeHospitalScreen());
    return;
  }

  if (step === "specialty") {
    title.textContent = "Specialty / Placement";
    content.appendChild(makeChoiceScreen("specialty"));
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

  if (step === "complication") {
    title.textContent = "Complication";
    content.appendChild(makeChoiceScreen("complication"));
    return;
  }

  if (step === "notes") {
    title.textContent = "Notes";
    help.textContent = "Optional. Do not enter patient-identifiable information.";
    content.appendChild(makeTextAreaScreen("notes", "Non-identifying notes only"));
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
    title.textContent = "Reflection";
    help.textContent = "Optional, but useful for portfolio evidence.";
    content.appendChild(makeTextAreaScreen("cpdReflection", "What did you learn and how will this affect your practice?"));
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

function makeDateScreen() {
  const wrapper = document.createElement("div");

  const input = document.createElement("input");
  input.type = "date";
  input.className = "date-input";
  input.value = draft.date || todayISO();
  input.addEventListener("change", () => {
    draft.date = input.value;
  });

  const todayButton = makeButton("Today", "choice-button centered-choice", () => {
    draft.date = todayISO();
    nextWizardStep();
  });

  const yesterdayButton = makeButton("Yesterday", "choice-button centered-choice", () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    draft.date = date.toISOString().slice(0, 10);
    nextWizardStep();
  });

  const nextButton = makeButton("Next", "button primary", () => {
    draft.date = input.value;
    nextWizardStep();
  });

  wrapper.append(input, todayButton, yesterdayButton, nextButton);
  return wrapper;
}

function makeHospitalScreen() {
  const wrapper = document.createElement("div");

  if (draft.hospital) {
    wrapper.appendChild(makeButton(`Keep current: ${draft.hospital}`, "choice-button", () => {
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

  wrapper.appendChild(makeButton("Add hospital", "button secondary wizard-action-button", () => {
    renderAddHospitalScreen(wrapper);
  }));

  if (state.hospitals.length > 0) {
    wrapper.appendChild(makeButton("Delete hospital", "button secondary wizard-action-button", () => {
      renderDeleteHospitalScreen(wrapper);
    }));
  }

  wrapper.appendChild(makeButton("Skip / not recorded", "button secondary wizard-action-button", () => {
    draft.hospital = "";
    nextWizardStep();
  }));

  return wrapper;
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

    const exists = state.hospitals.some(h => h.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert("This hospital already exists.");
      return;
    }

    state.hospitals.push(name);
    state.hospitals.sort();
    markChanged();
    renderWizard();
  });

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderWizard);

  wrapper.append(input, saveButton, cancelButton);
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

      state.hospitals = state.hospitals.filter(h => h !== hospital);

      if (draft.hospital === hospital) {
        delete draft.hospital;
      }

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

  if (draft[field]) {
    wrapper.appendChild(makeButton(`Keep current: ${draft[field]}`, "choice-button", () => {
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
    wrapper.appendChild(makeButton(`Add ${label}`, "button secondary wizard-action-button", () => {
      renderAddOptionScreen(wrapper, field, procedureName);
    }));

    if (options.length > 0) {
      wrapper.appendChild(makeButton(`Delete ${label}`, "button secondary wizard-action-button", () => {
        renderDeleteOptionScreen(wrapper, field, procedureName);
      }));
    }
  }

  return wrapper;
}

function renderAddOptionScreen(wrapper, field, procedureName = "") {
  wrapper.innerHTML = "";

  const label = fieldLabel(field);

  const input = document.createElement("input");
  input.className = "text-input";
  input.placeholder = `New ${label}`;

  const saveButton = makeButton(`Save ${label}`, "button primary wizard-action-button", () => {
    const saved = addUserOption(field, input.value, procedureName);

    if (saved) {
      renderWizard();
    }
  });

  const cancelButton = makeButton("Cancel", "button secondary wizard-action-button", renderWizard);

  wrapper.append(input, saveButton, cancelButton);
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

  wrapper.append(input, saveButton, cancelButton);
}

function makeOutcomeScreen() {
  const wrapper = document.createElement("div");

  if (draft.outcome) {
    const currentText = draft.attempts
      ? `Keep current: ${draft.outcome}, ${draft.attempts} attempt(s)`
      : `Keep current: ${draft.outcome}`;

    wrapper.appendChild(makeButton(currentText, "choice-button", () => {
      nextWizardStep();
    }));
  }

  wrapper.appendChild(makeButton("Successful", "choice-button", () => {
    draft.outcome = "Successful";
    renderAttemptsScreen(wrapper);
  }));

  wrapper.appendChild(makeButton("Unsuccessful", "choice-button", () => {
    draft.outcome = "Unsuccessful";
    renderAttemptsScreen(wrapper);
  }));

  return wrapper;
}

function renderAttemptsScreen(wrapper) {
  wrapper.innerHTML = "";

  const label = document.createElement("p");
  label.className = "help-text";
  label.textContent = "Number of attempts";
  wrapper.appendChild(label);

  ["1", "2", "3+"].forEach(attempts => {
    wrapper.appendChild(makeButton(attempts, "choice-button", () => {
      draft.attempts = attempts;
      nextWizardStep();
    }));
  });
}

function makeTextAreaScreen(field, placeholder) {
  const wrapper = document.createElement("div");

  const textarea = document.createElement("textarea");
  textarea.className = "textarea-input";
  textarea.placeholder = placeholder;
  textarea.value = draft[field] || "";

  const saveButton = makeButton("Next", "button primary wizard-action-button", () => {
    draft[field] = textarea.value.trim();
    nextWizardStep();
  });

  const skipButton = makeButton("Skip", "button secondary wizard-action-button", () => {
    draft[field] = "";
    nextWizardStep();
  });

  wrapper.append(textarea, saveButton, skipButton);
  return wrapper;
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
  return wrapper;
}

function makeReviewScreen() {
  const wrapper = document.createElement("div");
  const review = document.createElement("div");
  review.className = "review-list";

  const procedureRows = [
    ["Date", formatDate(draft.date)],
    ["Hospital", draft.hospital || "Not recorded"],
    ["Specialty / Placement", draft.specialty],
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
    p.innerHTML = `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "Not recorded")}`;
    review.appendChild(p);
  });

  wrapper.appendChild(review);

  const saveButtonText = editingEntryId ? "Save changes" : "Save entry";

  wrapper.appendChild(makeButton(saveButtonText, "button primary wizard-action-button", () => {
    draft.updatedAt = new Date().toISOString();

    if (editingEntryId) {
      state.entries = state.entries.map(entry =>
        entry.id === editingEntryId ? { ...draft } : entry
      );
    } else {
      state.entries.push({ ...draft });
    }

    editingEntryId = null;
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
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function renderLogbook() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const list = document.getElementById("entryList");
  list.innerHTML = "";

  const entries = state.entries
    .filter(entry => logbookFilter === "all" || entry.type === logbookFilter)
    .filter(entry => JSON.stringify(entry).toLowerCase().includes(searchTerm))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (entries.length === 0) {
    list.innerHTML = "<p>No entries found.</p>";
    return;
  }

  entries.forEach(entry => {
    const card = document.createElement("div");
    card.className = "entry-card";

    const title = entry.type === "procedure"
      ? entry.procedure || "Procedure"
      : entry.cpdTitle || "CPD entry";

    const subtitle = entry.type === "procedure"
      ? `${entry.hospital || "Hospital not recorded"} • ${entry.specialty || ""}`
      : `${entry.cpdType || "CPD"} • ${entry.cpdTime || ""}`;

    card.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(formatDate(entry.date))}</p>
      <p>${escapeHtml(subtitle)}</p>
    `;

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

    card.appendChild(actions);
    list.appendChild(card);
  });
}

function entrySummary(entry) {
  if (entry.type === "procedure") {
    return [
      `Date: ${formatDate(entry.date)}`,
      `Hospital: ${entry.hospital || "Not recorded"}`,
      `Specialty / Placement: ${entry.specialty || "Not recorded"}`,
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
    .map(([key, count]) => ({
      [labelName]: key,
      Count: count
    }));
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
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
    hospitals: state.hospitals,
    customOptions: state.customOptions,
    hiddenDefaultOptions: state.hiddenDefaultOptions,
    backup: state.backup
  };
}

function downloadJsonBackup() {
  const backup = buildBackupObject();
  const filename = `procedure-logbook-backup-${new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "")}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });

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
    alert("The Excel export library has not loaded. Please refresh the app and try again.");
    return;
  }

  const workbook = XLSX.utils.book_new();

  const allEntriesRows = state.entries.map(entryToAllEntriesRow);
  const procedureRows = state.entries
    .filter(entry => entry.type === "procedure")
    .map(entryToProcedureRow);
  const cpdRows = state.entries
    .filter(entry => entry.type === "cpd")
    .map(entryToCpdRow);

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

  const filename = `procedure-logbook-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    "Hospital",
    "Specialty / Placement",
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
    "Hospital",
    "Specialty / Placement",
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
    "Hospital": entry.hospital || "",
    "Specialty / Placement": entry.specialty || "",
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
    "Hospital": entry.hospital || "",
    "Specialty / Placement": entry.specialty || "",
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
      state.customOptions = imported.customOptions || emptyOptionStore();
      state.hiddenDefaultOptions = imported.hiddenDefaultOptions || emptyOptionStore();
      state.backup = imported.backup || {
        lastBackupAt: null,
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function attachEvents() {
  document.getElementById("addEntryButton").addEventListener("click", () => {
    showScreen("entryTypeScreen");
  });

  document.getElementById("viewLogbookButton").addEventListener("click", () => {
    showScreen("logbookScreen");
  });

  document.getElementById("viewSummariesButton").addEventListener("click", () => {
    showScreen("summariesScreen");
  });

  document.getElementById("viewBackupButton").addEventListener("click", () => {
    showScreen("backupScreen");
  });

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showScreen(button.dataset.go));
  });

  document.querySelectorAll("[data-entry-type]").forEach(button => {
    button.addEventListener("click", () => startEntry(button.dataset.entryType));
  });

  document.getElementById("wizardBackButton").addEventListener("click", goWizardBack);

  document.getElementById("backupNowButton").addEventListener("click", downloadJsonBackup);
  document.getElementById("downloadJsonButton").addEventListener("click", downloadJsonBackup);
  document.getElementById("downloadExcelButton").addEventListener("click", downloadExcelWorkbook);

  document.getElementById("importJsonButton").addEventListener("click", () => {
    document.getElementById("importFileInput").click();
  });

  document.getElementById("importFileInput").addEventListener("change", event => {
    const file = event.target.files[0];
    if (file) importJsonBackup(file);
    event.target.value = "";
  });

  document.getElementById("searchInput").addEventListener("input", renderLogbook);

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      logbookFilter = button.dataset.filter;

      document.querySelectorAll(".filter-button").forEach(btn => {
        btn.classList.remove("active");
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
  loadState();
  ensureStateShape();
  attachEvents();
  renderBackupStatus();
  showScreen("homeScreen");
}

init();
