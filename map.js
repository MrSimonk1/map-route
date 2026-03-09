const map = L.map("map").setView([54.6872, 25.2797], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

const progressEl = document.getElementById("progress");
const modal = document.getElementById("modal");

let places = [];
let markers = {};
let activePlace = null;

function loadProgress() {
  return JSON.parse(localStorage.getItem("placesProgress") || "{}");
}

function saveProgress(data) {
  localStorage.setItem("placesProgress", JSON.stringify(data));
}

function getColor(status) {
  if (status === "found") return "green";
  if (status === "not-found") return "red";
  return "gray";
}

function createIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid white"></div>`,
  });
}

function updateProgress() {
  const progress = loadProgress();
  let found = 0;
  places.forEach((p) => {
    if (progress[p.id]?.status === "found") found++;
  });
  progressEl.innerText = `${found} / ${places.length}`;
}

function openModal(place) {
  activePlace = place;
  const progress = loadProgress();
  const placeData = progress[place.id] || {};

  // set content
  document.getElementById("place-name").innerText = place.name;
  document.getElementById("place-image").src = place.image;
  document.getElementById("place-desc").innerText = place.description;

  // show modal
  modal.classList.remove("hidden");
  map.dragging.disable();

  // update status buttons and ratings
  updateStatusButtons(placeData.status);
  createRatings(place, placeData);
}

// update status buttons colors
function updateStatusButtons(status) {
  const foundBtn = document.getElementById("found-btn");
  const notFoundBtn = document.getElementById("notfound-btn");
  foundBtn.style.backgroundColor = status === "found" ? "green" : "";
  notFoundBtn.style.backgroundColor = status === "not-found" ? "red" : "";
}

// create rating spans and mark selected
function createRatings(place, placeData = {}) {
  const look = document.getElementById("rate-look");
  const accuracy = document.getElementById("rate-accuracy");

  look.innerHTML = "";
  accuracy.innerHTML = "";

  for (let i = 1; i <= 10; i++) {
    const a = document.createElement("span");
    a.innerText = i;
    if (placeData.rating_look === i) a.style.backgroundColor = "#88f";
    a.onclick = () => {
      setRating(place, "rating_look", i);
      createRatings(place, loadProgress()[place.id]);
    };
    look.appendChild(a);

    const b = document.createElement("span");
    b.innerText = i;
    if (placeData.rating_accuracy === i) b.style.backgroundColor = "#88f";
    b.onclick = () => {
      setRating(place, "rating_accuracy", i);
      createRatings(place, loadProgress()[place.id]);
    };
    accuracy.appendChild(b);
  }
}

// save rating in localStorage
function setRating(place, type, val) {
  const progress = loadProgress();
  progress[place.id] = progress[place.id] || {};
  progress[place.id][type] = val;
  saveProgress(progress);
}

// save status in localStorage and update UI immediately
function setStatus(status) {
  const progress = loadProgress();
  progress[activePlace.id] = progress[activePlace.id] || {};
  progress[activePlace.id].status = status;
  saveProgress(progress);

  updateMarker(activePlace);
  updateProgress();
  updateStatusButtons(status); // immediately update buttons
}

// update marker color
function updateMarker(place) {
  const progress = loadProgress();
  const status = progress[place.id]?.status;
  markers[place.id].setIcon(createIcon(getColor(status)));
}

// modal button events
document.getElementById("found-btn").onclick = () => setStatus("found");
document.getElementById("notfound-btn").onclick = () => setStatus("not-found");

document.getElementById("close").onclick = () => {
  modal.classList.add("hidden");
  map.dragging.enable();
};

// fetch places.json
fetch("places.json")
  .then((r) => r.json())
  .then((data) => {
    places = data;
    const progress = loadProgress();

    places.forEach((place) => {
      const status = progress[place.id]?.status;

      const marker = L.marker([place.lat, place.lng], {
        icon: createIcon(getColor(status)),
      }).addTo(map);

      marker.on("click", () => openModal(place));

      markers[place.id] = marker;
    });

    updateProgress();
  });
