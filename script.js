(() => {
  const DOM = {
    settingsToggle: document.querySelector("#settings-toggle"),
    settingsPanel: document.querySelector("#settings-panel"),
    darkModeToggle: document.querySelector("#dark-mode-toggle"),
    tipsToggle: document.querySelector("#tips-toggle"),
    tabs: document.querySelectorAll("[role='tab']"),
    panels: {
      bmi: document.querySelector("#bmi-panel"),
      bmr: document.querySelector("#bmr-panel")
    },
    form: document.querySelector("#metric-form"),
    bmiButton: document.querySelector("#calculate-bmi"),
    resetButton: document.querySelector("#reset-form"),
    bmrButton: document.querySelector("#calculate-bmr"),
    resultArea: document.querySelector("#result-area"),
    resultTitle: document.querySelector("#result-title"),
    historyCard: document.querySelector("#history-card"),
    historyList: document.querySelector("#history-list"),
    clearHistory: document.querySelector("#clear-history"),
    announcer: document.querySelector("#announce")
  };

  const selectors = {
    unitRadios: "input[name='unit']",
    sexRadios: "input[name='sex']",
    bmrSexRadios: "input[name='bmr-sex']"
  };

  const wellnessTips = [
    "Keep a water bottle handy—hydration boosts focus and energy.",
    "Aim for colorful plates. Veggies and fruits love photobombing your meals.",
    "Micro-breaks during desk time keep your spine and sanity aligned.",
    "Sleep is a performance enhancer. Guard those 7–9 hours like treasure.",
    "Consistency wins over perfection. Tiny habits stack up."
  ];

  const BMI_CATEGORIES = [
    { max: 18.4, label: "Underweight", tone: "yellow", message: "Add nourishing calories and strength-building movement." },
    { max: 24.9, label: "Normal", tone: "green", message: "You’re on track—keep your balanced routine humming." },
    { max: 29.9, label: "Overweight", tone: "yellow", message: "Ramp up daily activity and prioritize whole foods." },
    { max: Infinity, label: "Obese", tone: "red", message: "Partner with a healthcare pro for a personalized plan." }
  ];

  let history = [];

  init();

  function init() {
    loadPreferences();
    loadHistory();
    bindEvents();
    announce("Wellness metrics dashboard ready.");
  }

  function bindEvents() {
    DOM.settingsToggle.addEventListener("click", toggleSettings);
    DOM.darkModeToggle.addEventListener("change", toggleTheme);
    DOM.tipsToggle.addEventListener("change", () => savePreference("tipsEnabled", DOM.tipsToggle.checked));

    document.querySelectorAll(selectors.unitRadios).forEach((radio) =>
      radio.addEventListener("change", handleUnitSwap)
    );

    DOM.tabs.forEach((tab) => tab.addEventListener("click", handleTabs));

    DOM.form.addEventListener("submit", handleBMISubmit);
    DOM.resetButton.addEventListener("click", resetForm);

    DOM.bmrButton.addEventListener("click", handleBMR);
    DOM.clearHistory.addEventListener("click", clearHistory);

    document.addEventListener("click", (event) => {
      if (!DOM.settingsPanel.contains(event.target) && !DOM.settingsToggle.contains(event.target)) {
        closeSettings();
      }
    });
  }

  function handleTabs(event) {
    const target = event.currentTarget;
    const selected = target.getAttribute("aria-controls");

    DOM.tabs.forEach((tab) => {
      const isActive = tab === target;
      tab.setAttribute("aria-selected", String(isActive));
      const panelId = tab.getAttribute("aria-controls");
      DOM.panels[panelId.replace("-panel", "")].hidden = !isActive;
    });

    DOM.resultTitle.textContent = selected === "bmi-panel" ? "Your Insights" : "Your BMR Insights";
    DOM.resultArea.innerHTML = `<p class="placeholder">Ready when you are! Fill in the ${selected === "bmi-panel" ? "BMI" : "BMR"} form.</p>`;
  }

  function handleUnitSwap() {
    const selectedUnit = document.querySelector(`${selectors.unitRadios}:checked`).value;
    document.querySelectorAll("[data-unit]").forEach((group) => {
      const shouldShow = group.dataset.unit === selectedUnit;
      group.classList.toggle("hidden", !shouldShow);
    });
  }

  function handleBMISubmit(event) {
    event.preventDefault();
    const unit = document.querySelector(`${selectors.unitRadios}:checked`).value;

    const inputs = readBMIInputs(unit);
    if (!inputs.valid) {
      showError(inputs.error);
      return;
    }

    const { heightM, weightKg, age, sex } = inputs;
    const bmi = weightKg / (heightM ** 2);
    const category = findCategory(bmi);
    const idealRange = idealWeightRange(heightM);
    const tip = DOM.tipsToggle.checked ? randomTip() : null;

    const bodyFat = estimateBodyFat({ ...inputs, heightM, sex });
    renderBMIResult({ bmi, category, inputs, idealRange, tip, bodyFat });

    pushHistory({
      type: "BMI",
      bmi,
      category: category.label,
      timestamp: new Date().toISOString(),
      summary: inputs.summary
    });
  }

  function handleBMR() {
    const age = parseFloat(document.querySelector("#bmr-age").value);
    const height = parseFloat(document.querySelector("#bmr-height").value);
    const weight = parseFloat(document.querySelector("#bmr-weight").value);
    const sex = document.querySelector(`${selectors.bmrSexRadios}:checked`).value;
    const activity = parseFloat(document.querySelector("#activity-level").value);

    if (!allPositive([age, height, weight])) {
      showError("Please provide valid age, height, and weight for BMR.");
      return;
    }

    const bmr = calculateBMR({ age, height, weight, sex });
    const dailyNeeds = Math.round(bmr * activity);

    renderBMRResult({ bmr, dailyNeeds, activity });

    pushHistory({
      type: "BMR",
      bmr,
      dailyNeeds,
      timestamp: new Date().toISOString(),
      summary: `${weight.toFixed(1)} kg · ${height.toFixed(1)} cm · ${age} yrs`
    });
  }

  function readBMIInputs(unit) {
    const age = parseFloat(document.querySelector("#age").value);
    const sex = document.querySelector(`${selectors.sexRadios}:checked`).value;

    let heightM;
    let weightKg;
    let summary;

    if (unit === "metric") {
      const heightCm = parseFloat(document.querySelector("#metric-height").value);
      const weight = parseFloat(document.querySelector("#metric-weight").value);

      if (!allPositive([heightCm, weight, age])) {
        return { valid: false, error: "Please fill in height, weight, and age with positive values." };
      }

      heightM = heightCm / 100;
      weightKg = weight;
      summary = `${heightCm.toFixed(1)} cm · ${weightKg.toFixed(1)} kg`;
    } else {
      const feet = parseFloat(document.querySelector("#height-ft").value);
      const inches = parseFloat(document.querySelector("#height-in").value) || 0;
      const weight = parseFloat(document.querySelector("#weight-lbs").value);

      if (!allPositive([feet, weight, age])) {
        return { valid: false, error: "Feet, pounds, and age must be valid numbers greater than zero." };
      }
      if (inches < 0 || inches >= 12) {
        return { valid: false, error: "Inches must be between 0 and 11.9." };
      }

      const totalInches = (feet * 12) + inches;
      heightM = totalInches * 0.0254;
      weightKg = weight * 0.453592;
      summary = `${feet}′ ${inches.toFixed(1)}″ · ${weight.toFixed(1)} lbs`;
    }

    const waist = parseFloat(document.querySelector("#waist").value);
    const neck = parseFloat(document.querySelector("#neck").value);
    const hip = parseFloat(document.querySelector("#hip").value);

    return {
      valid: true,
      heightM,
      weightKg,
      age,
      sex,
      waist,
      neck,
      hip,
      summary
    };
  }

  function calculateBMR({ age, height, weight, sex }) {
    if (sex === "male") {
      return Math.round(88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age));
    }
    return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age));
  }

  function estimateBodyFat({ waist, neck, hip, heightM, sex }) {
    if (!waist || !neck || (sex === "female" && !hip)) {
      return null;
    }

    const heightCm = heightM * 100;
    if (sex === "male") {
      const bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
      return clamp(bodyFat, 2, 70);
    } else {
      const bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(heightCm)) - 450;
      return clamp(bodyFat, 5, 70);
    }
  }

  function findCategory(bmi) {
    return BMI_CATEGORIES.find((category) => bmi <= category.max);
  }

  function renderBMIResult({ bmi, category, inputs, idealRange, tip, bodyFat }) {
    const { heightM, weightKg, age, sex, summary } = inputs;
    const percent = Math.min((bmi / 40) * 100, 100);
    const toneClass = toneToClass(category.tone);
    const fatMarkup = bodyFat
      ? `<p><strong>Body fat estimate:</strong> ${bodyFat.toFixed(1)}% (${bodyFatDescriptor(bodyFat, sex)})</p>`
      : `<p class="muted">Add body measurements for a body fat estimate.</p>`;

    DOM.resultArea.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <h3>BMI</h3>
          <span class="tag ${toneClass}">${category.label}</span>
        </div>

        <p class="muted">${summary} · ${age} yrs · ${capitalize(sex)}</p>

        <div class="bmi-value">${bmi.toFixed(2)}</div>
        <p>${category.message}</p>

        <div class="progress">
          <div class="progress-bar">
            <span style="width: ${percent}%"></span>
          </div>
          <div class="scale">
            <span>Under</span>
            <span>Normal</span>
            <span>Over</span>
            <span>Obese</span>
          </div>
        </div>

        <p><strong>Ideal weight range:</strong> ${idealRange.min.toFixed(1)} – ${idealRange.max.toFixed(1)} kg</p>
        ${fatMarkup}
        <p><strong>Weight change to normal BMI:</strong> ${weightChangeToNormal(bmi, weightKg, heightM)}</p>
        ${tip ? `<p class="tip">💡 ${tip}</p>` : ""}
      </div>
    `;
    announce(`BMI result is ${bmi.toFixed(2)}, category ${category.label}.`);
  }

  function renderBMRResult({ bmr, dailyNeeds, activity }) {
    DOM.resultArea.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <h3>BMR</h3>
          <span class="tag green">Resting energy</span>
        </div>
        <p class="bmi-value">${bmr} kcal</p>
        <p>Your estimated daily calories to maintain weight with this activity level: <strong>${dailyNeeds} kcal</strong></p>
        <p class="muted">Activity multiplier used: ${activity}</p>
        <p class="tip">💡 Adjust calories by ±500 kcal/day to lose or gain roughly 0.45 kg (1 lb) per week.</p>
      </div>
    `;
    announce(`BMR result is ${bmr} calories per day.`);
  }

  function pushHistory(entry) {
    history = [entry, ...history].slice(0, 7);
    renderHistory();
    saveHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      DOM.historyCard.classList.add("hidden");
      DOM.historyList.innerHTML = "";
      return;
    }

    DOM.historyCard.classList.remove("hidden");
    DOM.historyList.innerHTML = history
      .map((item) => {
        const date = new Date(item.timestamp).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short"
        });
        const primary = item.type === "BMI" ? `BMI ${item.bmi.toFixed(1)} (${item.category})` : `BMR ${item.bmr} kcal`;
        const secondary = item.type === "BMI" ? item.summary : `Needs: ${item.dailyNeeds} kcal`;

        return `
          <li class="history-item">
            <span>${primary}</span>
            <span>${secondary}</span>
            <span>${date}</span>
          </li>
        `;
      })
      .join("");
  }

  function clearHistory() {
    history = [];
    saveHistory();
    renderHistory();
    DOM.resultArea.innerHTML = `<p class="placeholder">History cleared. Ready for a fresh start! 🌈</p>`;
    announce("History cleared.");
  }

  function idealWeightRange(heightM) {
    return {
      min: 18.5 * heightM ** 2,
      max: 24.9 * heightM ** 2
    };
  }

  function weightChangeToNormal(bmi, weightKg, heightM) {
    if (bmi >= 18.5 && bmi <= 24.9) return "You're already in the normal range.";
    const ideal = clamp(weightKg, 18.5 * heightM ** 2, 24.9 * heightM ** 2);
    const diff = ideal - weightKg;
    const direction = diff > 0 ? "gain" : "lose";
    return `You’d need to ${direction} ${Math.abs(diff).toFixed(1)} kg to sit at BMI ${diff > 0 ? "18.5" : "24.9"}.`;
  }

  function toneToClass(tone) {
    return tone === "green" ? "green" : tone === "yellow" ? "yellow" : "red";
  }

  function bodyFatDescriptor(bodyFat, sex) {
    const ranges = sex === "male"
      ? [
          { max: 5, label: "Essential fat" },
          { max: 13, label: "Athletes" },
          { max: 17, label: "Fitness" },
          { max: 24, label: "Average" },
          { max: Infinity, label: "Above average" }
        ]
      : [
          { max: 13, label: "Essential fat" },
          { max: 20, label: "Athletes" },
          { max: 24, label: "Fitness" },
          { max: 31, label: "Average" },
          { max: Infinity, label: "Above average" }
        ];

    return ranges.find((range) => bodyFat <= range.max).label;
  }

  function resetForm() {
    DOM.form.reset();
    handleUnitSwap();
    DOM.resultArea.innerHTML = `<p class="placeholder">All cleared! Enter fresh numbers to continue.</p>`;
    announce("Form reset.");
  }

  function randomTip() {
    return wellnessTips[Math.floor(Math.random() * wellnessTips.length)];
  }

  function showError(message) {
    DOM.resultArea.innerHTML = `<p class="result-card" style="background: rgba(220, 38, 38, 0.1); border-color: rgba(220,38,38,0.3);">${message}</p>`;
    announce(`Error: ${message}`);
  }

  function toggleSettings() {
    const isOpen = DOM.settingsPanel.classList.toggle("hidden");
    DOM.settingsToggle.setAttribute("aria-expanded", String(!isOpen));
  }

  function closeSettings() {
    DOM.settingsPanel.classList.add("hidden");
    DOM.settingsToggle.setAttribute("aria-expanded", "false");
  }

  function toggleTheme(event) {
    const isDark = event.target.checked;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    savePreference("theme", isDark ? "dark" : "light");
  }

  function savePreference(key, value) {
    const prefs = loadPreferences(true);
    prefs[key] = value;
    localStorage.setItem("wellnessPrefs", JSON.stringify(prefs));
  }

  function loadPreferences(returnOnly = false) {
    const prefs = JSON.parse(localStorage.getItem("wellnessPrefs") || "{}");
    if (returnOnly) return prefs;

    if (prefs.theme) {
      document.documentElement.dataset.theme = prefs.theme;
      DOM.darkModeToggle.checked = prefs.theme === "dark";
    }

    const tipsEnabled = prefs.tipsEnabled !== undefined ? prefs.tipsEnabled : true;
    DOM.tipsToggle.checked = tipsEnabled;
  }

  function saveHistory() {
    localStorage.setItem("wellnessHistory", JSON.stringify(history));
  }

  function loadHistory() {
    history = JSON.parse(localStorage.getItem("wellnessHistory") || "[]");
    renderHistory();
  }

  function announce(message) {
    DOM.announcer.textContent = "";
    setTimeout(() => {
      DOM.announcer.textContent = message;
    }, 50);
  }

  function allPositive(values) {
    return values.every((value) => Number.isFinite(value) && value > 0);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
})();