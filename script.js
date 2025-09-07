// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4OvnVV8l-fI7fcSNMnqEiMjvaF_-iL1h3h3Fnjhn0DEXFPoCKi5apHA3XYsrH6FVFiA/exec"; 
// IMPORTANT: Use the new URL after redeploying!

// --- DOM ELEMENTS ---
const loaderOverlay = document.getElementById('loader-overlay');
const screens = document.querySelectorAll('.screen');
const startBtn = document.getElementById('start-workout-btn');
const typeScreen = document.getElementById('type-screen');
const logScreen = document.getElementById('log-screen');
const logForm = document.getElementById('log-form');
const stopBtn = document.getElementById('stop-workout-btn');
const exerciseSelect = document.getElementById('exercise');
const setsList = document.getElementById('sets-list');
const workoutTitle = document.getElementById('workout-title');
const repeat1Btn = document.getElementById('repeat-1-btn');
const repeat2Btn = document.getElementById('repeat-2-btn');
const repeat3Btn = document.getElementById('repeat-3-btn');
// --- NEW: Weight Modal Elements ---
const addWeightBtn = document.getElementById('add-weight-btn');
const weightModal = document.getElementById('weight-modal');
const bodyweightInput = document.getElementById('bodyweight-input');
const saveWeightBtn = document.getElementById('save-weight-btn');
const closeModalBtn = document.getElementById('close-modal-btn');


// --- APP STATE ---
let appState = {
    workoutId: null,
    workoutType: null,
    allExercises: [],
    currentSets: []
};

// --- FUNCTIONS ---

function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.toggle('active', screen.id === screenId);
    });
}

// --- NEW: Caching-First Function to Fetch Exercises ---
async function fetchExercisesWithCache() {
    const cacheKey = 'workoutExercises';
    const cachedData = localStorage.getItem(cacheKey);

    // --- Step 1: Load from Cache Immediately ---
    if (cachedData) {
        console.log("Loading exercises from local cache.");
        try {
            appState.allExercises = JSON.parse(cachedData);
        } catch(e) {
            console.error("Could not parse cached exercises:", e);
        }
    }

    // --- Step 2: Show a loader only if there's no cached data ---
    if (appState.allExercises.length === 0) {
        loaderOverlay.style.display = 'flex';
    }

    // --- Step 3: Fetch Fresh Data from the Network in the Background ---
    try {
        console.log("Fetching fresh exercises from network...");
        const response = await fetch(SCRIPT_URL);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        appState.allExercises = data.exercises;

        // --- Step 4: Update the Cache with Fresh Data ---
        localStorage.setItem(cacheKey, JSON.stringify(data.exercises));
        console.log("Cache updated with fresh exercises.");

    } catch (error) {
        console.error("Error fetching fresh exercises:", error);
        // If the fetch fails, the app can still run with the cached data
        if (appState.allExercises.length === 0) {
             alert("Could not load exercises. Please check your script URL and internet connection.");
        }
    } finally {
        // Always hide the loader at the end
        loaderOverlay.style.display = 'none';
    }
}

function startWorkout(type) {
    appState.workoutId = `workout_${Date.now()}`;
    appState.workoutType = type;
    appState.currentSets = [];
    exerciseSelect.innerHTML = '<option value="">Select an Exercise...</option>';
    const filteredExercises = appState.allExercises.filter(ex => ex.Type === type);
    filteredExercises.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex.Name;
        option.textContent = ex.Name;
        exerciseSelect.appendChild(option);
    });
    workoutTitle.textContent = `${type} Workout`;
    renderSets();
    showScreen('log-screen');
}

// script.js

async function sendAndLogSet(setData) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addSet', data: setData })
        });
        const result = await response.json();
        if (result.status === 'success') {
            appState.currentSets.push(setData);
            renderSets();
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Failed to send set directly, saving for background sync.", error);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            await writeData('sync-posts', { action: 'addSet', data: setData });
            navigator.serviceWorker.ready.then(sw => {
                sw.sync.register('sync-new-data'); // Use the new unified tag
            });
            appState.currentSets.push(setData);
            renderSets();
            alert("You are offline. Your set has been saved and will be sent automatically when you're back online.");
            return true;
        } else {
            alert("Failed to add set. Background sync not supported.");
            return false;
        }
    }
}

async function handleAddSet(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const setData = {
        workoutId: appState.workoutId,
        workoutType: appState.workoutType,
        exercise: formData.get('exercise'),
        weight: formData.get('weight'),
        reps: formData.get('reps')
    };
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Adding...';
    const success = await sendAndLogSet(setData);
    if (success) {
        form.reset();
    }
    submitButton.disabled = false;
    submitButton.textContent = 'Add Set';
}

async function repeatLastEntries(count, clickedButton) {
    if (appState.currentSets.length === 0) {
        alert("No sets to repeat yet!");
        return;
    }
    const setsToRepeat = appState.currentSets.slice(-count);
    const allRepeatButtons = [repeat1Btn, repeat2Btn, repeat3Btn];
    const originalText = clickedButton.textContent;
    allRepeatButtons.forEach(btn => btn.disabled = true);
    clickedButton.textContent = 'Adding...';
    try {
        for (const set of setsToRepeat) {
            const newSetData = { ...set, workoutId: appState.workoutId, workoutType: appState.workoutType };
            await sendAndLogSet(newSetData);
        }
    } finally {
        allRepeatButtons.forEach(btn => btn.disabled = false);
        clickedButton.textContent = originalText;
    }
}

function renderSets() {
    setsList.innerHTML = '';
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

// script.js

// script.js

async function stopWorkout() {
    if (!confirm("Are you sure you want to end this workout?")) {
        return;
    }
    stopBtn.disabled = true;
    stopBtn.textContent = 'Ending...';
    
    // Function to reset the UI and app state
    const resetState = () => {
        appState.workoutId = null;
        appState.workoutType = null;
        appState.currentSets = [];
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop Workout & Send Summary';
        showScreen('start-screen');
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'endWorkout', data: { workoutId: appState.workoutId } })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert("Workout finished! Your summary has been sent via email.");
            resetState();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Failed to end workout, saving for background sync.", error);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            await writeData('sync-posts', { action: 'endWorkout', data: { workoutId: appState.workoutId } });
            navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-new-data'));
            alert("You are offline. Your workout will be ended and a summary sent automatically when you're back online.");
            resetState();
        } else {
            alert("Could not end workout. Please try again.");
            stopBtn.disabled = false;
            stopBtn.textContent = 'Stop Workout & Send Summary';
        }
    }
}
// --- NEW: Weight Modal Functions ---
function openWeightModal() {
    weightModal.style.display = 'flex';
}

function closeWeightModal() {
    weightModal.style.display = 'none';
    bodyweightInput.value = ''; // Clear input
}

// script.js

async function handleSaveWeight() {
    const weight = bodyweightInput.value;
    if (!weight || isNaN(weight)) {
        alert("Please enter a valid weight.");
        return;
    }
    saveWeightBtn.disabled = true;
    saveWeightBtn.textContent = "Saving...";
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addWeight', data: { weight: weight } })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert("Weight saved successfully!");
            closeWeightModal();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Failed to save weight directly, saving for background sync.", error);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            await writeData('sync-posts', { action: 'addWeight', data: { weight: weight } });
            navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-new-data'));
            alert("You are offline. Your weight entry has been saved and will be sent automatically when you're back online.");
            closeWeightModal();
        } else {
            alert("Failed to save weight. Please try again.");
        }
    } finally {
        saveWeightBtn.disabled = false;
        saveWeightBtn.textContent = "Save Weight";
    }
}

// --- EVENT LISTENERS ---
startBtn.addEventListener('click', () => showScreen('type-screen'));
typeScreen.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        startWorkout(e.target.dataset.type);
    }
});
logForm.addEventListener('submit', handleAddSet);
stopBtn.addEventListener('click', stopWorkout);
repeat1Btn.addEventListener('click', (e) => repeatLastEntries(1, e.target));
repeat2Btn.addEventListener('click', (e) => repeatLastEntries(2, e.target));
repeat3Btn.addEventListener('click', (e) => repeatLastEntries(3, e.target));
// --- NEW: Weight Modal Listeners ---
addWeightBtn.addEventListener('click', openWeightModal);
closeModalBtn.addEventListener('click', closeWeightModal);
weightModal.addEventListener('click', (e) => {
    if (e.target === weightModal) { // Close if clicking on the overlay itself
        closeWeightModal();
    }
});
saveWeightBtn.addEventListener('click', handleSaveWeight);


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', fetchExercisesWithCache);




