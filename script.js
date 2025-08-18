// --- CONFIGURATION ---
// IMPORTANT: Paste your Google Apps Script Web App URL here
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbhKeOd3MGQGp4I784PjWp91LSEKETyQG1EpxMZvM7GSUCydyDPhIMnpPIlWsgyg06SQ/exec";

// --- DOM ELEMENTS ---
const loaderOverlay = document.getElementById('loader-overlay'); // Get the loader
const screens = document.querySelectorAll('.screen');
const startBtn = document.getElementById('start-workout-btn');
const typeScreen = document.getElementById('type-screen');
const logScreen = document.getElementById('log-screen');
const logForm = document.getElementById('log-form');
const stopBtn = document.getElementById('stop-workout-btn');
const exerciseSelect = document.getElementById('exercise');
const setsList = document.getElementById('sets-list');
const workoutTitle = document.getElementById('workout-title');

// --- APP STATE ---
let appState = {
    workoutId: null,
    workoutType: null,
    allExercises: [],
    currentSets: []
};

// --- FUNCTIONS ---

/**
 * Shows a specific screen by its ID and hides others.
 * @param {string} screenId The ID of the screen to show.
 */
function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.toggle('active', screen.id === screenId);
    });
}

/**
 * Fetches the initial list of exercises from our Google Sheet.
 */
async function fetchExercises() {
    loaderOverlay.style.display = 'flex'; // Show loader
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        appState.allExercises = data.exercises;
    } catch (error) {
        console.error("Error fetching exercises:", error);
        alert("Could not load exercises. Please check your script URL and internet connection.");
    } finally {
        loaderOverlay.style.display = 'none'; // Hide loader
    }
}

/**
 * Starts a new workout session.
 * @param {string} type The type of workout ("Gym" or "Calisthenics").
 */
function startWorkout(type) {
    // Generate a unique ID based on the current timestamp
    appState.workoutId = `workout_${Date.now()}`;
    appState.workoutType = type;
    appState.currentSets = [];

    // Populate the exercise dropdown based on the workout type
    exerciseSelect.innerHTML = '<option value="">Select an Exercise...</option>';
    const filteredExercises = appState.allExercises.filter(ex => ex.Type === type);
    filteredExercises.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex.Name;
        option.textContent = ex.Name;
        exerciseSelect.appendChild(option);
    });

    // Update UI
    workoutTitle.textContent = `${type} Workout`;
    renderSets(); // Clear the list for the new session
    showScreen('log-screen');
}

/**
 * Handles the form submission to add a new set.
 * @param {Event} e The form submission event.
 */
async function handleAddSet(e) {
    e.preventDefault(); // Prevent page reload
    const form = e.target;
    const formData = new FormData(form);

    const setData = {
        workoutId: appState.workoutId,
        workoutType: appState.workoutType,
        exercise: formData.get('exercise'),
        weight: formData.get('weight'),
        reps: formData.get('reps')
    };

    // Visually disable the button to prevent double submission
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';

    try {
        // Send data to Google Apps Script
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addSet', data: setData })
        });
        const result = await response.json();

        if (result.status === 'success') {
            appState.currentSets.push(setData);
            renderSets();
            form.reset(); // Clear the form fields
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Error adding set:", error);
        alert("Failed to add set. Please try again.");
    } finally {
        // Re-enable the button
        submitButton.disabled = false;
        submitButton.textContent = 'Add Set';
    }
}

/**
 * Renders the list of sets for the current workout on the screen.
 */
function renderSets() {
    setsList.innerHTML = ''; // Clear the current list
    if (appState.currentSets.length === 0) {
        setsList.innerHTML = '<li>Log your first set!</li>';
        return;
    }
    appState.currentSets.forEach(set => {
        const li = document.createElement('li');
        li.textContent = `${set.exercise} - ${set.weight} x ${set.reps}`;
        setsList.appendChild(li);
    });
}

/**
 * Ends the current workout, sends the summary email, and resets the app.
 */
async function stopWorkout() {
    if (!confirm("Are you sure you want to end this workout? A summary will be emailed to you.")) {
        return;
    }

    stopBtn.disabled = true;
    stopBtn.textContent = 'Ending...';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'endWorkout', data: { workoutId: appState.workoutId } })
        });
        const result = await response.json();

        if (result.status === 'success') {
            alert("Workout finished! Your summary has been sent via email.");
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Error ending workout:", error);
        alert("Could not end workout. Please try again.");
    } finally {
        // Reset app state and UI
        appState.workoutId = null;
        appState.workoutType = null;
        appState.currentSets = [];
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop Workout & Send Summary';
        showScreen('start-screen');
    }
}


// --- EVENT LISTENERS ---

// Show the type selection screen when "Start" is clicked
startBtn.addEventListener('click', () => showScreen('type-screen'));

// Start a workout when a type is chosen
typeScreen.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const type = e.target.dataset.type;
        startWorkout(type);
    }
});

// Handle adding a set when the form is submitted
logForm.addEventListener('submit', handleAddSet);

// Handle ending the workout
stopBtn.addEventListener('click', stopWorkout);

// --- INITIALIZATION ---

// Fetch exercises when the app first loads

document.addEventListener('DOMContentLoaded', fetchExercises);




