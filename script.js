window.onload = () => {
  const button = document.querySelector("#btn");
  const resetBtn = document.querySelector("#reset");

  button.addEventListener("click", calculateBMI);
  resetBtn.addEventListener("click", resetForm);
};

function calculateBMI() {
  let height = parseFloat(document.querySelector("#height").value);
  let weight = parseFloat(document.querySelector("#weight").value);
  let heightUnit = document.querySelector("#height-unit").value;
  let weightUnit = document.querySelector("#weight-unit").value;
  let result = document.querySelector("#result");

  if (!height || height <= 0) {
    result.innerHTML = "<p style='color:red;'>⚠ Provide a valid Height!</p>";
    return;
  }

  if (!weight || weight <= 0) {
    result.innerHTML = "<p style='color:red;'>⚠ Provide a valid Weight!</p>";
    return;
  }

  // Convert height to cm
  if (heightUnit === "ft") {
    height = height * 30.48; // 1 ft = 30.48 cm
  }

  // Convert weight to kg
  if (weightUnit === "lbs") {
    weight = weight * 0.453592; // 1 lb = 0.453592 kg
  }

  let bmi = (weight / ((height * height) / 10000)).toFixed(2);
  let category = "";
  let advice = "";
  let cssClass = "";

  if (bmi < 18.5) {
    category = "Underweight";
    advice = "You should consider gaining some healthy weight.";
    cssClass = "underweight";
  } else if (bmi >= 18.5 && bmi < 24.9) {
    category = "Normal";
    advice = "Great! Keep maintaining your lifestyle.";
    cssClass = "normal";
  } else if (bmi >= 25 && bmi < 29.9) {
    category = "Overweight";
    advice = "Try exercising regularly and watch your diet.";
    cssClass = "overweight";
  } else {
    category = "Obese";
    advice = "It’s advisable to consult a doctor and adopt a healthier routine.";
    cssClass = "obese";
  }

  result.innerHTML = `
    <div class="result-box ${cssClass}">
      <p>BMI: <strong>${bmi}</strong></p>
      <p>Category: <strong>${category}</strong></p>
      <p>${advice}</p>
    </div>
  `;
}

function resetForm() {
  document.querySelector("#height").value = "";
  document.querySelector("#weight").value = "";
  document.querySelector("#result").innerHTML = "";
}
