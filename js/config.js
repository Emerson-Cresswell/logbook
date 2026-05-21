(() => {
  window.AppConfig = {
    STORAGE_KEY: "procedureLogbookData_v1",
    APP_VERSION: "v52",
    procedureSteps: [
      "date","placement","specialty","hospital","context","procedure","site","technique","role","supervision","outcome","attempts","complication","notes","review"
    ],
    cpdSteps: [
      "date","placement","cpdType","cpdFormat","cpdTopic","cpdDetails","cpdTime","cpdReflection","cpdEvidence","review"
    ],
    defaultSpecialties: [
      { id: "critical-care", name: "Critical Care" },
      { id: "anaesthetics", name: "Anaesthetics" },
      { id: "emergency-medicine", name: "Emergency Medicine" },
      { id: "acute-medicine", name: "Acute Medicine" }
    ],
    defaultProcedureCategories: [
      { id: "vascular-access", name: "Line insertion" },
      { id: "airway", name: "Airway" },
      { id: "ultrasound", name: "Ultrasound" },
      { id: "drains", name: "Drains" },
      { id: "halo", name: "HALO procedures" },
      { id: "other", name: "Other procedures" }
    ],
    defaultProcedureLibrary: [
      { id: "central-venous-catheter", name: "Central venous catheter", needsSite: true, needsTechnique: false },
      { id: "arterial-line", name: "Arterial line", needsSite: true, needsTechnique: true },
      { id: "intubation", name: "Intubation", needsSite: false, needsTechnique: false },
      { id: "chest-drain", name: "Chest drain", needsSite: true, needsTechnique: false },
      { id: "lumbar-puncture", name: "Lumbar puncture", needsSite: false, needsTechnique: false },
      { id: "ascitic-drain", name: "Ascitic drain", needsSite: true, needsTechnique: false },
      { id: "bronchoscopy", name: "Bronchoscopy", needsSite: false, needsTechnique: false },
      { id: "tracheostomy-related-procedure", name: "Tracheostomy-related procedure", needsSite: false, needsTechnique: false },
      { id: "other", name: "Other", needsSite: false, needsTechnique: false }
    ],
    defaultSpecialtyProcedureAssignments: {
      "critical-care": {"vascular-access": ["central-venous-catheter", "arterial-line"],"airway": ["intubation", "tracheostomy-related-procedure", "bronchoscopy"],"drains": ["chest-drain", "ascitic-drain"],"other": ["lumbar-puncture", "other"]},
      "anaesthetics": {"airway": ["intubation"],"vascular-access": ["arterial-line", "central-venous-catheter"],"other": ["other"]},
      "emergency-medicine": {"halo": ["intubation", "chest-drain"],"vascular-access": ["arterial-line", "central-venous-catheter"],"other": ["lumbar-puncture", "other"]},
      "acute-medicine": {"drains": ["ascitic-drain", "chest-drain"],"other": ["lumbar-puncture", "other"]}
    },
    defaultProcedureOptions: {
      specialty: ["Critical Care", "Anaesthetics", "Emergency Medicine", "Acute Medicine"],
      procedure: ["Central venous catheter", "Arterial line", "Intubation", "Chest drain", "Lumbar puncture", "Ascitic drain", "Bronchoscopy", "Tracheostomy-related procedure", "Other"],
      context: ["ICU", "Theatre", "Emergency Department", "Ward", "Transfer", "Clinic", "Other"],
      technique: ["Ultrasound", "Landmark"],
      role: ["Observed", "Assisted", "Primary operator", "Supervisor"],
      supervision: ["Direct supervision", "Indirect supervision", "Independent", "Supervising another clinician"],
      outcome: ["Successful", "Unsuccessful"],
      complication: ["None", "Failed procedure", "Bleeding", "Arterial puncture", "Pneumothorax", "Malposition", "Other"]
    },
    defaultSiteOptionsByProcedure: {
      "Central venous catheter": ["Right IJ", "Left IJ", "Right femoral", "Left femoral", "Right subclavian", "Left subclavian", "Other"],
      "Arterial line": ["Right radial", "Left radial", "Right femoral", "Left femoral", "Right brachial", "Left brachial", "Dorsalis pedis", "Other"],
      "Chest drain": ["Right chest", "Left chest", "Other"],
      "Ascitic drain": ["Right abdomen", "Left abdomen", "Midline", "Other"]
    },
    defaultCpdOptions: {
      cpdType: ["Course", "Conference", "Teaching session", "Simulation", "E-learning", "Podcast", "Journal/article", "Guideline review", "Departmental teaching", "Self-directed learning", "Other"],
      cpdFormat: ["In person", "Online live", "Online recorded", "Podcast/audio", "Reading", "Practical/simulation", "Other"],
      cpdTopic: ["ICU", "Anaesthetics", "Emergency Medicine", "Acute Medicine", "PHEM/Retrieval", "Governance/QI", "Teaching/Education", "Leadership/Management", "Other"],
      cpdTime: ["15 minutes", "30 minutes", "1 hour", "2 hours", "Half day", "Full day", "Custom"],
      cpdEvidence: ["Certificate available", "Attendance recorded", "Reflection only", "No evidence", "Other"]
    },
    configurableFields: ["context", "procedure", "site", "cpdType", "cpdFormat", "cpdTopic"]
  };
})();
