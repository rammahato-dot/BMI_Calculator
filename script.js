const categories = [
  {
    max: 18.5,
    label: "Underweight",
    message: "A balanced diet and strength-building exercises can help you move toward a healthier range.",
    cssClass: "underweight"
  },
  {
    max: 24.9,
    label: "Normal",
    message: "Nicely done! Keep reinforcing those healthy habits—you’re right where you should be.",
    cssClass: "normal"
  },
  {
    max: 29.9,
    label: "Overweight",
    message: "Consider weaving in more movement and mindful nutrition; small daily wins add up fast.",
    cssClass: "overweight"
  },
  {
    max: Infinity,
    label: "Obese",
    message: "Chat with a healthcare professional to craft a safe plan tailored to you.",
    cssClass: "obese"
  }
];

const wellnessTips = [
  "Aim for 150 minutes of moderate exercise a week—five 30-minute brisk walks can do the trick.",
  "Stay hydrated and listen to your hunger cues; your body is a brilliant communicator.",
  "Sleep is your silent superhero. Most adults thrive on 7–9 hours each night.",
  "Swap one sugary drink a day for water or herbal tea—you’ll be amazed at the impact.",
  "Plan your meals when you’re not hungry; future you will say thank you."
];

const MAX_HISTORY = 5;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#bmi-form");
  const unitRadios = document.querySelectorAll("input[name='unit']");
  const resetBtn = document.querySelector("#reset");
  const clearHistoryBtn = document.querySelector("#clear-history");

  const resultContainer = document.querySelector("#result");
  const historySection = document.querySelector("#history");
  const historyList = document.querySelector("#history-list");

  let history = loadHistory();
  renderHistory();

  unitRadios.forEach((radio) =>
    radio.addEventListener("change", updateUnitVisibility)
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const unitSystem = document.querySelector("input[name='unit']:checked").value;
    const inputData = readInputs(unitSystem);

    if (!inputData.isValid) {
      displayError(resultContainer, inputData.error);
      return;
    }

    const { heightM, weightKg, summary } = inputData;
    const bmi = weightKg / (heightM ** 2);
    const formattedBMI = Number(bmi.toFixed(2));

    const category = categories.find((cat) => formattedBMI <= cat.max);
    const idealWeight = computeIdealWeightRange(heightM);

    displayResult({
      container: resultContainer,
      bmi: formattedBMI,
      category,
      summary,
      idealWeight,
      heightM,
      weightKg
    });

    history = updateHistory(history, {
      bmi: formattedBMI,
      category: category.label,
      summary,
      timestamp: new Date().toISOString()
    });
    saveHistory(history);
    renderHistory();
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    resultContainer.innerHTML = "";
    historySection.classList.toggle("hidden", history.length === 0);
    // default back to metric after reset
    document.querySelector("input[name='unit'][value='metric']").checked = true;
    updateUnitVisibility();
  });

  clearHistoryBtn.addEventListener("click", () => {
    history = [];
    saveHistory(history);
    renderHistory();
  });

  updateUnitVisibility();

  function updateUnitVisibility() {
    const unit = document.querySelector("input[name='unit']:checked").value;
    document.querySelectorAll("[data-unit]").forEach((group) => {
      const shouldShow = group.getAttribute("data-unit") === unit;
      group.classList.toggle("hidden", !shouldShow);
    });

    if (unit === "imperial") {
      document.querySelector("#height-ft").focus();
    } else {
      document.querySelector("#height-cm").focus();
    }
  }

  function readInputs(unit) {
    if (unit === "metric") {
      const heightCm = parseFloat(document.querySelector("#height-cm").value);
      const weightKg = parseFloat(document.querySelector("#weight-kg").value);

      if (!isPositive(heightCm)) {
        return { isValid: false, error: "Please enter a valid height in centimeters (greater than zero)." };
      }
      if (!isPositive(weightKg)) {
        return { isValid: false, error: "Please enter a valid weight in kilograms (greater than zero)." };
      }

      return {
        isValid: true,
        heightM: heightCm / 100,
        weightKg,
        summary: `${heightCm.toFixed(1)} cm · ${weightKg.toFixed(1)} kg`
      };
    } else {
      const heightFt = parseFloat(document.querySelector("#height-ft").value);
      const heightIn = parseFloat(document.querySelector("#height-in").value) || 0;
      const weightLbs = parseFloat(document.querySelector("#weight-lbs").value);

      if (!isPositive(heightFt)) {
        return { isValid: false, error: "Height in feet must be greater than zero." };
      }
      if (heightIn < 0 || heightIn >= 12) {
        return { isValid: false, error: "Inches must be between 0 and 11.9." };
      }
      if (!isPositive(weightLbs)) {
        return { isValid: false, error: "Weight in pounds must be greater than zero." };
      }

      const totalInches = (heightFt * 12) + heightIn;
      const heightM = totalInches * 0.0254;
      const weightKg = weightLbs * 0.453592;

      return {
        isValid: true,
        heightM,
        weightKg,
        summary: `${heightFt} ft ${heightIn.toFixed(1)} in · ${weightLbs.toFixed(1)} lbs`
      };
    }
  }

  function displayError(container, message) {
    container.innerHTML = `<p class="error-message">⚠ ${message}</p>`;
  }

  function displayResult({ container, bmi, category, summary, idealWeight }) {
    const progressWidth = Math.min((bmi / 40) * 100, 100);
    const tip = wellnessTips[Math.floor(Math.random() * wellnessTips.length)];

    container.innerHTML = `
      <div class="result-box ${category.cssClass}">
        <div class="result-header">
          <h3>Your Results</h3>
          <span>${summary}</span>
        </div>

        <div class="bmi-value">${bmi.toFixed(2)}</div>

        <span class="category-tag ${category.cssClass}">${category.label}</span>

        <div class="bmi-progress">
          <div class="progress-track">
            <div class="progress-bar ${category.cssClass}" style="width: ${progressWidth}%;"></div>
          </div>
          <div class="scale">
            <span>Under</span>
            <span>Normal</span>
            <span>Over</span>
            <span>Obese</span>
          </div>
        </div>

        <p>${category.message}</p>
        <p class="ideal-range"><strong>Ideal weight (BMI 18.5–24.9):</strong> ${idealWeight.lower} – ${idealWeight.upper} kg</p>
        <p class="tip">💡 ${tip}</p>
      </div>
    `;
  }

  function computeIdealWeightRange(heightM) {
    const lower = (18.5 * heightM ** 2).toFixed(1);
    const upper = (24.9 * heightM ** 2).toFixed(1);
    return { lower, upper };
  }

  function isPositive(value) {
    return Number.isFinite(value) && value > 0;
  }

  function loadHistory() {
    try {
      const stored = localStorage.getItem("bmiHistory");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem("bmiHistory", JSON.stringify(list));
    } catch {
      // If storage is unavailable, silently ignore.
    }
  }

  function updateHistory(existingHistory, entry) {
    const updated = [entry, ...existingHistory].slice(0, MAX_HISTORY);
    return updated;
  }

  function renderHistory() {
    historyList.innerHTML = "";
    if (history.length === 0) {
      historySection.classList.add("hidden");
      return;
    }

    historySection.classList.remove("hidden");

    history.forEach((item) => {
      const li = document.createElement("li");
      li.className = "history-item";
      const date = new Date(item.timestamp).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      });

      li.innerHTML = `
        <span>${item.bmi.toFixed(2)} BMI (${item.category})</span>
        <span>${date}</span>
      `;
      historyList.appendChild(li);
    });
  }
});