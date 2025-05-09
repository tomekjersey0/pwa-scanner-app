// script.js

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkzRqfVDru2WLafdslXr9DcIQLg8UOaJU",
  authDomain: "df011-checkin-e252c.firebaseapp.com",
  databaseURL: "https://df011-checkin-e252c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "df011-checkin-e252c",
  storageBucket: "df011-checkin-e252c.firebasestorage.app",
  messagingSenderId: "1017644238330",
  appId: "1:1017644238330:web:de6ada32add85f055c5043",
  measurementId: "G-4P130RNT67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Fetch guests from Firebase
let guests = {};

function listenForGuestUpdates() {
  const guestsRef = ref(database, "guests");
  onValue(guestsRef, (snapshot) => {
    if (snapshot.exists()) {
      guests = snapshot.val(); // Update the local guests variable
      console.log("Updated guests: ", guests); // Log the updated data
    } else {
      console.error("No data available");
    }
  });
}

// Call this function to start listening for updates
listenForGuestUpdates();

// DOM Elements
const video = document.getElementById("video");
const debug = document.getElementById("debug");
const result = document.getElementById("result");
const manualScanButton = document.getElementById("manualScanButton");
const manualStopButton = document.getElementById("manualStopButton");
const infoBox = document.getElementById("infoBox");
const status = document.getElementById("status");
let dots = 0;
let isScanning = false;
let isScanned = false;
const scanningMessage = "Searching for QR Code";
const scannedMessage = "Scanned!";
infoBox.style.display = "none";

// Camera setup
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: "environment" } })
  .then((stream) => (video.srcObject = stream))
  .catch((err) => (result.textContent = "Camera access denied."));

// Canvas setup
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");

// Event listeners
manualScanButton.addEventListener("click", () => {
  status.innerHTML = scanningMessage;
  isScanning = true;
  scan();
});

manualStopButton.addEventListener("click", () => {
  status.innerHTML = "";
  isScanning = false;
  isScanned = false; // Reset the scanned state
  infoBox.style.display = "none"; // Hide the info box
});

// Scanning logic
setInterval(() => {
  if (isScanning) {
    dots = (dots + 1) % 4; // cycle through 1 - 3
    status.innerHTML = `${scanningMessage}${".".repeat(dots)}`;
  } else if (isScanned) {
    dots = 0;
    status.innerHTML = scannedMessage;
  } else {
    status.innerHTML = "";
  }
}, 500);

function scan() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);
    if (code && isScanning) {
      handleScan(code.data.trim());
    }
  }
  requestAnimationFrame(scan);
}

function handleScan(code) {
  console.log("scanning scanning...");
  if (guests.hasOwnProperty(code)) {
    const guest = guests[code];

    // Make sure guest was accepted
    if (guest.status != "accepted") {
      console.log("not accepted!");
      result.innerHTML = `<span class="error">❌ ${guest.name || code} marked as: ${guest.status}</span>`;
      isScanning = false;
      isScanned = true;
      return;
    }

    // If the guest hasn't checked in
    if (!guest.checkedIn) {
      guest.checkedIn = true;
      guest.lastCheckedIn = new Date().toISOString();
      result.innerHTML = `<span class="success">✅ ${guest.name || code} checked in</span>`;

      // Show the info box with animation
      infoBox.style.display = "block";
      infoBox.classList.add("infoBox-animated");
      infoBox.addEventListener(
        "animationend",
        () => {
          infoBox.classList.remove("infoBox-animated");
        },
        { once: true }
      );

      // Populate the alcohol data in the info box
      const alcoholList = document.querySelector("#infoBox ul");
      alcoholList.innerHTML = ""; // Clear previous data

      if (guest.alcohol) {
        Object.values(guest.alcohol).forEach((item) => {
          const listItem = document.createElement("li");
          listItem.innerHTML = `<span>Brand:</span> ${item.brand}, <span>Type:</span> ${item.type}, <span>Volume:</span> ${item.volume_ml}ml`;
          alcoholList.appendChild(listItem);
        });
      } else {
        alcoholList.innerHTML = "<li>No alcohol data available</li>";
      }

      // Save updated data to Firebase
      const updates = {};
      updates[`guests/${code}`] = guest;
      update(ref(database), updates)
        .then(() => console.log("Guest updated successfully"))
        .catch((error) => console.error("Error updating guest:", error));
    } else {
      const lastCheckInDate = new Date(guest.lastCheckedIn).toLocaleString();
      result.innerHTML = `<span class="error">⚠️ ${guest.name || code} already checked in at ${lastCheckInDate}</span>`;
    }
  } else {
    result.innerHTML = `<span class="error">❌ Unknown code: ${code}</span>`;
  }

  // Add the animation class to #status
  status.classList.add("status-animated");

  // Remove the animation class after the animation ends
  status.addEventListener(
    "animationend",
    () => {
      status.classList.remove("status-animated");
    },
    { once: true }
  );

  isScanned = true;
  isScanning = false;

  // Quick update
  dots = 0;
  status.innerHTML = scannedMessage;
}