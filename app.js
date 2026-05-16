const STORAGE_KEY = "procedureLogbookData_v1";

let state = {
  entries: [],
  hospitals: [],
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

const procedureSteps = [
  "date",
  "hospital",
  "specialty",
  "procedure",
  "site",
  "context",
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

const procedureOptions = {
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

const siteOptionsByProcedure = {
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
    "Dorsalis pedis",
    "Other"
  ],
  "Intubation": [
    "Oral",
    "Nasal",
    "Tracheostomy",
    "Other"
  ],
  "Chest drain": [
    "Right chest",
    "Left chest",
    "Seldinger",
    "Open/surgical",
    "Other"
  ],
  "Lumbar puncture": [
    "Diagnostic",
    "Therapeutic",
    "Other"
  ],
  "Ascitic drain": [
    "Diagnostic tap",
    "Therapeutic drain",
    "Other"
  ],
  "Bronchoscopy": [
    "Diagnostic",
    "Therapeutic",
    "Airway toilet",
    "Other"
  ],
  "Tracheostomy-related procedure": [
    "Change",
    "Insertion assistance",
    "Troubleshooting",
    "Other"
  ],
  "Other": [
    "Other"
  ]
};

const cpdOptions = {
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

function saveState() {
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
      backup: parsed.backup || {
        lastBackupAt: null,
        changeCountSinceBackup: 0
      }
    };
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

function startEntry(type) {
  currentEntryType = type;
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

function goWizardBack() {
  if (wizardIndex > 0) {
    wizardIndex -= 1;
    renderWizard();
  } else {
    showScreen("entryTypeScreen");
  }
}

function nextWizardStep() {
  if (wizardIndex < wizardSteps.length - 1) {
    wizardIndex += 1;
    renderWizard();
  }
}

function renderWizard() {
  const step = wizardSteps[wizardIndex];
  const stepLabel = document.getElementById("stepLabel");
  const title = document.getElementById("wizardTitle");
  const help = document.getElementById("wizardHelp");
  const content = document.getElementById("wizardContent");

  stepLabel.textContent = `Step ${wizardIndex + 1} of ${wizardSteps.length}`;
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
    title.textContent = "Specialty / area";
    content.appendChild(makeChoiceScreen("specialty", procedureOptions.specialty));
    return;
  }

  if (step === "procedure") {
    title.textContent = "Procedure";
    content.appendChild(makeChoiceScreen("procedure", procedureOptions.procedure));
    return;
  }

  if (step === "site") {
    title.textContent = "Site / subtype";
    const procedure = draft.procedure || "Other";
    const options = siteOptionsByProcedure[procedure] || ["Other"];
    content.appendChild(makeChoiceScreen("site", options));
    return;
  }

  if (step === "context") {
    title.textContent = "Context";
    content.appendChild(makeChoiceScreen("context", procedureOptions.context));
    return;
  }

  if (step === "role") {
    title.textContent = "Role";
    content.appendChild(makeChoiceScreen("role", procedureOptions.role));
    return;
  }

  if (step === "supervision") {
    title.textContent = "Supervision level";
    content.appendChild(makeChoiceScreen("supervision", procedureOptions.supervision));
    return;
  }

  if (step === "outcome") {
    title.textContent = "Outcome";
    content.appendChild(makeOutcomeScreen());
    return;
  }

  if (step === "complication") {
    title.textContent = "Complication";
    content.appendChild(makeChoiceScreen("complication", procedureOptions.complication));
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
    content.appendChild(makeChoiceScreen("cpdType", cpdOptions.cpdType));
    return;
  }

  if (step === "cpdFormat") {
    title.textContent = "Format";
    content.appendChild(makeChoiceScreen("cpdFormat", cpdOptions.cpdFormat));
    return;
  }

  if (step === "cpdTopic") {
    title.textContent = "Topic area";
    content.appendChild(makeChoiceScreen("cpdTopic", cpdOptions.cpdTopic));
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
    content.appendChild(makeChoiceScreen("cpdTime", cpdOptions.cpdTime));
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
    content.appendChild(makeChoiceScreen("cpdEvidence", cpdOptions.cpdEvidence));
    return;
  }

  if (step === "review") {
    title.textContent = "Review & save";
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

  const todayButton = makeButton("Today", "choice-button", () => {
    draft.date = todayISO();
    nextWizardStep();
  });

  const yesterdayButton = makeButton("Yesterday", "choice-button", () => {
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

  wrapper.appendChild(makeButton("Add hospital", "button secondary", () => {
    renderAddHospitalScreen(wrapper);
  }));

  if (state.hospitals.length > 0) {
    wrapper.appendChild(makeButton("Delete hospital", "button secondary", () => {
      renderDeleteHospitalScreen(wrapper);
    }));
  }

  wrapper.appendChild(makeButton("Skip / not recorded", "button secondary", () => {
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

  const saveButton = makeButton("Save hospital", "button primary", () => {
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
    saveState();
    draft.hospital = name;
    nextWizardStep();
  });

  const cancelButton = makeButton("Cancel", "button secondary", renderWizard);

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
      saveState();
      renderWizard();
    }));
  });

  wrapper.appendChild(makeButton("Cancel", "button secondary", renderWizard));
}

function makeChoiceScreen(field, options) {
  const wrapper = document.createElement("div");

  options.forEach(option => {
    wrapper.appendChild(makeButton(option, "choice-button", () => {
      if (option === "Other" || option === "Custom") {
        renderOtherInput(wrapper, field, option);
        return;
      }

      draft[field] = option;
      nextWizardStep();
    }));
  });

  return wrapper;
}

function renderOtherInput(wrapper, field, option) {
  wrapper.innerHTML = "";

  const input = document.createElement("input");
  input.className = "text-input";
  input.placeholder = option === "Custom" ? "Enter custom value" : "Enter other value";

  const saveButton = makeButton("Save", "button primary", () => {
    const value = input.value.trim();
    if (!value) {
      alert("Please enter a value.");
      return;
    }

    draft[field] = value;
    nextWizardStep();
  });

  const cancelButton = makeButton("Cancel", "button secondary", renderWizard);

  wrapper.append(input, saveButton, cancelButton);
}

function makeOutcomeScreen() {
  const wrapper = document.createElement("div");

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

  const saveButton = makeButton("Next", "button primary", () => {
    draft[field] = textarea.value.trim();
    nextWizardStep();
  });

  const skipButton = makeButton("Skip", "button secondary", () => {
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

  const providerInput = document.createElement("input");
  providerInput.className = "text-input";
  providerInput.placeholder = "Provider / organisation";

  const locationInput = document.createElement("input");
  locationInput.className = "text-input";
  locationInput.placeholder = "Location or website, optional";

  const nextButton = makeButton("Next", "button primary", () => {
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

  const rows = currentEntryType === "procedure"
    ? [
        ["Date", formatDate(draft.date)],
        ["Hospital", draft.hospital || "Not recorded"],
        ["Specialty", draft.specialty],
        ["Procedure", draft.procedure],
        ["Site/subtype", draft.site],
        ["Context", draft.context],
        ["Role", draft.role],
        ["Supervision", draft.supervision],
        ["Outcome", draft.outcome],
        ["Attempts", draft.attempts],
        ["Complication", draft.complication],
        ["Notes", draft.notes || "None"]
      ]
    : [
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

  rows.forEach(([label, value]) => {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "Not recorded")}`;
    review.appendChild(p);
  });

  wrapper.appendChild(review);

  wrapper.appendChild(makeButton("Save entry", "button primary", () => {
    draft.updatedAt = new Date().toISOString();
    state.entries.push({ ...draft });
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
      `Specialty: ${entry.specialty || "Not recorded"}`,
      `Procedure: ${entry.procedure || "Not recorded"}`,
      `Site/subtype: ${entry.site || "Not recorded"}`,
      `Context: ${entry.context || "Not recorded"}`,
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
    app: "Procedure Logbook & CPD",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
    hospitals: state.hospitals,
    backup: state.backup
  };
}

function downloadJsonBackup() {
  const backup = buildBackupObject();
  const filename = `procedure-logbook-backup-${new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "")}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });

  downloadBlob(blob, filename);

  const saved = confirm("If the backup file saved successfully, tap OK to mark your backup as up to date.");
  if (saved) markBackedUp();
}

function downloadCsvExport() {
  const rows = [
    [
      "type",
      "date",
      "hospital",
      "specialty",
      "procedure",
      "site",
      "context",
      "role",
      "supervision",
      "outcome",
      "attempts",
      "complication",
      "notes",
      "cpdType",
      "cpdFormat",
      "cpdTopic",
      "cpdTitle",
      "cpdProvider",
      "cpdLocation",
      "cpdTime",
      "cpdEvidence",
      "cpdReflection"
    ]
  ];

  state.entries.forEach(entry => {
    rows.push([
      entry.type,
      entry.date,
      entry.hospital,
      entry.specialty,
      entry.procedure,
      entry.site,
      entry.context,
      entry.role,
      entry.supervision,
      entry.outcome,
      entry.attempts,
      entry.complication,
      entry.notes,
      entry.cpdType,
      entry.cpdFormat,
      entry.cpdTopic,
      entry.cpdTitle,
      entry.cpdProvider,
      entry.cpdLocation,
      entry.cpdTime,
      entry.cpdEvidence,
      entry.cpdReflection
    ].map(value => value || ""));
  });

  const csv = rows.map(row => row.map(csvEscape).join(",")).join("\n");
  const filename = `procedure-logbook-export-${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([csv], { type: "text/csv" });

  downloadBlob(blob, filename);
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
        "Import this backup?\n\nThis will replace the current entries and hospital list on this device."
      );

      if (!confirmed) return;

      state.entries = imported.entries || [];
      state.hospitals = imported.hospitals || [];
      state.backup = imported.backup || {
        lastBackupAt: null,
        changeCountSinceBackup: 0
      };

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

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
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
  document.getElementById("downloadCsvButton").addEventListener("click", downloadCsvExport);

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

function init() {
  loadState();
  attachEvents();
  renderBackupStatus();
  showScreen("homeScreen");
}

init();
