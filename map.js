const map = L.map("map").setView([54.68281200481076, 25.28646133417316], 14.5);

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

function createIcon(color, i) {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    html: `
      <div style="
        width:24px;
        height:24px;
        background:${color};
        border-radius:50%;
        border:2px solid white;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:12px;
        font-weight:bold;
        color:white;
      ">
        ${i}
      </div>
    `,
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

function openModal(place, i) {
  activePlace = place;
  const progress = loadProgress();
  const placeData = progress[place.id] || {};

  document.body.style.overflow = "hidden";

  // set content
  document.getElementById("place-name").innerText = place.name;
  document.getElementById("place-desc").innerText = place.description;
  const imgWrapper = document.getElementById("place-image-wrapper");
  imgWrapper.innerHTML = `<span class="loader"></span>`;
  const img = new Image();
  img.src = "";
  img.id = "place-image";
  img.onload = () => {
    setTimeout(() => {
      imgWrapper.innerHTML = "";
      imgWrapper.appendChild(img);
    }, 1000);
  };
  img.onerror = () => {
    imgWrapper.innerHTML = "Image not available";
  };
  img.src = place.image;

  // show modal
  modal.classList.remove("hidden");
  map.dragging.disable();

  // update status buttons and ratings
  updateStatusButtons(placeData.status);
  createRatings(place, placeData);

  // navigation
  document.getElementById("navigate").onclick = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`,
    );
  };

  // modal buttons
  document.getElementById("found-btn").onclick = () => setStatus("found");
  document.getElementById("notfound-btn").onclick = () =>
    setStatus("not-found");
}

// update status buttons colors
function updateStatusButtons(status) {
  const foundBtn = document.getElementById("found-btn");
  const notFoundBtn = document.getElementById("notfound-btn");

  foundBtn.classList.toggle("found", status === "found");
  notFoundBtn.classList.toggle("notfound", status === "not-found");
}

// create rating spans and mark selected
function createRatings(place, placeData = {}) {
  const ratingsDiv = document.getElementById("ratings");
  ratingsDiv.innerHTML = "";

  place.ratings.forEach((r, i) => {
    const ratingDiv = document.createElement("div");
    ratingDiv.id = i;
    ratingDiv.className = "rating";

    const h4 = document.createElement("h4");
    h4.innerText = r.ratingTitle;
    ratingDiv.appendChild(h4);

    const ratingOptionsDiv = document.createElement("div");
    ratingOptionsDiv.className = "rating-options";

    r.ratingOptions.forEach((ro) => {
      const span = document.createElement("span");
      span.innerHTML = ro;

      if (placeData[i] === ro) span.style.backgroundColor = "#88f";

      span.onclick = () => {
        setRating(place, i, ro);
        createRatings(place, loadProgress()[place.id]);
      };

      ratingOptionsDiv.appendChild(span);
    });

    ratingDiv.appendChild(ratingOptionsDiv);
    ratingsDiv.appendChild(ratingDiv);
  });
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
  updateStatusButtons(status);
}

// update marker color
function updateMarker(place) {
  const progress = loadProgress();
  const status = progress[place.id]?.status;
  markers[place.id].setIcon(createIcon(getColor(status), place.index));
}

document.getElementById("close").onclick = () => {
  document.body.style.overflow = "";
  modal.classList.add("hidden");
  map.dragging.enable();
};

// fetch places.json
fetch("places.json")
  .then((r) => r.json())
  .then((data) => {
    places = data;
    const progress = loadProgress();

    places.forEach((place, i) => {
      place.index = i + 1;
      const status = progress[place.id]?.status;

      const marker = L.marker([place.lat, place.lng], {
        icon: createIcon(getColor(status), place.index),
      }).addTo(map);

      marker.on("click", () => openModal(place, place.index));

      markers[place.id] = marker;
    });

    updateProgress();
  });
