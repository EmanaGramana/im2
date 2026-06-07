// --- CITY DATA ---
const cities = {
  bern:     { name: "Bärn",    latitude: 46.94, longitude: 7.44 },
  zurich:   { name: "Züri",    latitude: 47.37, longitude: 8.54 },
  basel:    { name: "Basu",    latitude: 47.56, longitude: 7.59 },
  geneva:   { name: "Gänf",    latitude: 46.20, longitude: 6.15 },
  lausanne: { name: "Losanne", latitude: 46.52, longitude: 6.63 },
  lucerne:  { name: "Luzärn",  latitude: 47.05, longitude: 8.31 }
};

const DEFAULT_CITY = "bern";
let isTestMode = false;
let currentRequestId = 0;

const dropdown = document.getElementById("city-select");

//  API URL 
function buildApiUrl(city) {
  return "https://api.open-meteo.com/v1/forecast"
    + "?latitude="  + city.latitude
    + "&longitude=" + city.longitude
    + "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,rain";
}

//  WMO CODE TO BASIC WEATHER 
function getBasicWeather(weatherCode) {
  if (weatherCode === 0 || weatherCode === 1)                            return "Es isch sunnig";
  if (weatherCode === 2)                                                  return "Es isch chle bewölkt";
  if ([3, 45, 48].includes(weatherCode))                                 return "Es isch Bewölkt";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(weatherCode))  return "Es rägnet";
  if ([95, 96, 99].includes(weatherCode))                                return "Es isch am tue";
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode))                   return "Es schneeielet";
  return "Weiss ni bro, lug seuber usem Fänster:)";
}

//  PLANT WATERING ADVICE 
function getPlantAdvice(basicWeather, temp, humidity, windSpeed) {
  if (basicWeather === "Es isch sunnig") {
    if (temp < 0)       return "Ke Wasser gä. Dr Bodä isch gfrohre. Schütz dini Pflanzä vorem Frost.";
    if (temp > 35)      return "Am Morgä oder am Abä Wasser gä. Nid düre Tag giessä.";
    if (humidity < 25)  return "Dini Pflanzä brucht chle meh Wasser aus süsch. Di trochnigi Luft suugt z Wasser us dä Bletter.";
    if (humidity > 80)  return "Es biiizeli Wasser gä. D'Luftfüechtigkeit bhautet dr Bodä füecht.";
    return "Ar Planzä normau Wasser gä, wie süsch ou!:)";
  }

  if (basicWeather === "Es isch chle bewölkt") {
    if (temp < 0)       return "Di Nacht chönnts gfrühre. Ke Wasser gä. Lug ds d'Pflanzä gschützt isch.";
    if (windSpeed > 40) return "Dr Wind tröchnet dini Pflanzä us. Chle meh Wasser gä aus süsch.";
    if (temp >= 15 && temp <= 25) return "Perfekti Wätterkonditionä. Ar Planzä normau Wasser gä, wie süsch ou!:)";
    return "Ar Planzä normau Wasser gä, wie süsch ou!:)";
  }

  if (basicWeather === "Es isch Bewölkt") {
    if (humidity > 80)  return "Muesch ke Wasser gä. Dr Härd isch füecht vor Luftfüechtigkeit.";
    if (humidity < 25)  return "D'Luft isch troche. Numä es biiizeli Wasser gä.";
    if (temp > 30)      return "Es isch heiss u Tüppig. Numä am Abä Wasser gä. Muesch chle luege ds dini Pflanzä nid schimmlet.";
    return "Chasch dirä Pflanze es biiizeli Wasser gä!:)";
  }

  if (basicWeather === "Es rägnet" || basicWeather === "Es isch am tue") {
    if (temp < 0)       return "Gloub ds isch eh Schneesturm! Gib dim Pflänzli jah ke Wasser. Schütz dini Pflanzä vorem Frost.";
    if (windSpeed > 40) return "Es tuet uu huerä! Gib ke Wasser. Lug ds z Rägewasser guet cha abloufä u ds dini Pflanzä nid kaputt geit vom Wind!";
    if (temp > 25)      return "Eh Summerräge. Wes nume chle rägnet muesch villech glich no chle Wasser gä.";
    if (humidity > 90)  return "La d'Natur dini Arbeit la machä. Muesch ke Wasser gä!:)";
    return "Wes nume so schüüch rägnet, muesch scho no chle Wasser gä.:)";
  }

  if (basicWeather === "Es schneeielet") {
    if (temp >= -2 && temp <= 2) return "Dr Schnee isoliert dr Härd. Muesch ke Wasser gä.";
    if (temp < -10)     return "Es isch uu huere chaut. Muesch ke Wasser gä, es gfrührt nume. Lug ds d'Wurzle vo dire Pflanze gschützt si.";
    return "Es isch z chaut zum Wasser gä. Lug ds dini Pflanzä nid kaputt geit.";
  }

  return "Bro bruch dini Fingerli u lug säuber öb dr Härd troche isch, wenn ja de gisch däm armä Pflänzli chle Wasser!:)";
}

//  THEME UPDATER 
function updateWeatherTheme(basicWeather) {
  const classMap = {
    "Es isch sunnig":       "weather-clear",
    "Es isch chle bewölkt": "weather-partly-cloudy",
    "Es isch Bewölkt":      "weather-cloudy",
    "Es rägnet":            "weather-rain",
    "Es isch am tue":       "weather-thunderstorm",
    "Es schneeielet":       "weather-snow"
  };

  const themeClass = classMap[basicWeather] || "weather-clear";

  document.body.classList.remove(
    "weather-clear", "weather-partly-cloudy", "weather-cloudy",
    "weather-rain",  "weather-thunderstorm",  "weather-snow"
  );
  document.body.classList.add(themeClass);

  // Update lottie animation based on theme
  updateLottieAnimation(themeClass);
}

//  UPDATE NAVBAR WEATHER STATS 
function updateNavWeather(temp, humidity, wind, rain) {
  document.getElementById("stat-temp").textContent     = `Temperatur: ${temp}°C`;
  document.getElementById("stat-humidity").textContent = `Luftfüechtigkeit: ${humidity}%`;
  document.getElementById("stat-wind").textContent     = `Wind: ${wind} km/h`;
  document.getElementById("stat-rain").textContent     = `Räge: ${rain} mm`;
}

//  FETCH & DISPLAY WEATHER 
function fetchWeather(cityKey) {
  const requestId = ++currentRequestId;
  const city = cities[cityKey];
  const refreshBtn = document.getElementById("refresh-btn");

  dropdown.disabled = true;
  refreshBtn.disabled = true;
  refreshBtn.classList.add("spinning");

  document.getElementById("weather-display").textContent =
    `Z'Wätter für ${city.name} ladet...`;
  document.getElementById("plant-advice").innerHTML =
    `<p class="loading">Vorschlag ladet...</p>`;

  fetch(buildApiUrl(city))
    .then(function(response) {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then(function(data) {
      if (requestId !== currentRequestId) return;

      const weatherCode = data.current.weather_code ?? data.current.weathercode ?? 0;
      const temp        = data.current.temperature_2m;
      const humidity    = data.current.relative_humidity_2m;
      const wind        = data.current.wind_speed_10m;
      const rain        = data.current.rain ?? 0;

      const basicWeather = getBasicWeather(weatherCode);

      updateWeatherTheme(basicWeather);
      updateNavWeather(temp, humidity, wind, rain);

      const advice = getPlantAdvice(basicWeather, temp, humidity, wind);

      document.getElementById("weather-display").textContent =
        `${city.name}: ${basicWeather}`;
      document.getElementById("plant-advice").innerHTML = `
        <h2>Vorschlag für dini Pflanzä:</h2>
        <p>${advice}</p>
      `;
    })
    .catch(function(error) {
      if (requestId !== currentRequestId) return;
      console.error("Error fetching weather data:", error);
      document.getElementById("weather-display").textContent =
        "Sorry! Z'Wätter ladet grad nid.";
      document.getElementById("plant-advice").innerHTML = ``;
      updateNavWeather("--", "--", "--", "--");
    })
    .finally(function() {
      if (requestId === currentRequestId) {
        dropdown.disabled = false;
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("spinning");
      }
    });
}

// REFRESH WEATHER
function refreshWeather() {
  if (isTestMode) {
    isTestMode = false;
    document.getElementById("test-panel").style.display = "none";
    document.getElementById("open-test-btn").style.display = "block";
  }
  fetchWeather(dropdown.value);
}

// EVENT LISTENERS & INITIALIZATION
dropdown.addEventListener("change", function() {
  if (!isTestMode) fetchWeather(dropdown.value);
});

dropdown.value = DEFAULT_CITY;
fetchWeather(DEFAULT_CITY);

// Only show dev button on localhost
if (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1") {
  document.getElementById("open-test-btn").style.display = "block";
}

// =============================================
//  TEST MODE FUNCTIONS
// =============================================

function openTestPanel() {
  document.getElementById("test-panel").style.display = "block";
  document.getElementById("open-test-btn").style.display = "none";
}

function returnToLive() {
  isTestMode = false;
  document.getElementById("test-panel").style.display = "none";
  document.getElementById("open-test-btn").style.display = "block";
  fetchWeather(dropdown.value);
}

function simulateWeather(basicWeather) {
  isTestMode = true;

  const mockData = {
    "Es isch sunnig":       { temp: 28,  humidity: 20, wind: 10, rain: 0.0  },
    "Es isch chle bewölkt": { temp: 22,  humidity: 45, wind: 18, rain: 0.0  },
    "Es isch Bewölkt":      { temp: 16,  humidity: 65, wind: 12, rain: 0.0  },
    "Es rägnet":            { temp: 14,  humidity: 91, wind: 25, rain: 8.5  },
    "Es isch am tue":       { temp: 19,  humidity: 92, wind: 55, rain: 15.0 },
    "Es schneeielet":       { temp: -3,  humidity: 70, wind: 15, rain: 0.0  }
  };

  const data = mockData[basicWeather] || mockData["Es isch sunnig"];
  const advice = getPlantAdvice(basicWeather, data.temp, data.humidity, data.wind);

  updateWeatherTheme(basicWeather);
  updateNavWeather(data.temp, data.humidity, data.wind, data.rain);

  document.getElementById("weather-display").textContent =
    `${basicWeather} (TEST MODE)`;
  document.getElementById("plant-advice").innerHTML = `
    <h2>Test Vorschlag:</h2>
    <p>${advice}</p>
  `;
}


//  LOTTIE ANIMATION SETUP

// Animation file paths for each theme
const lottieAnimations = {
  "weather-partly-cloudy": "/img/animations/flower.json",
  "weather-cloudy":        "/img/animations/flower.json",
  "weather-rain":          "/img/animations/flower.json",
  "weather-clear":        "/img/animations/flower_sunnig.json",
  "weather-thunderstorm": "/img/animations/flower_storm.json",
};

// Themes that should show the lottie animation
const lottieThemes = Object.keys(lottieAnimations);

let currentLottieAnim = null;
let currentLottieTheme = null;

function updateLottieAnimation(themeClass) {
  const container = document.getElementById("lottie-flower");

  // If this theme has no animation, hide and clean up
  if (!lottieThemes.includes(themeClass)) {
    container.classList.remove("visible");

    // Destroy after fade out
    setTimeout(function () {
      if (currentLottieAnim) {
        currentLottieAnim.destroy();
        currentLottieAnim = null;
        currentLottieTheme = null;
      }
    }, 600);
    return;
  }

  // If showing the correct animation, do nothing
  if (currentLottieTheme === themeClass) return;

  // Destroy previous animation if exists
  if (currentLottieAnim) {
    currentLottieAnim.destroy();
    currentLottieAnim = null;
  }

  // Clear container
  container.innerHTML = "";

  // Load new animation
  currentLottieAnim = lottie.loadAnimation({
    container: container,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: lottieAnimations[themeClass]
  });

  currentLottieTheme = themeClass;

  // Show with fade in
  requestAnimationFrame(function () {
    container.classList.add("visible");
  });
}