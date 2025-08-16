// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxgg8ZOmTtSYauMGOkWZf52jBqFGWb9QKd6PiUEX4fa83yEyRObAHtWsq1wcN--KfipyA/exec";

// --- DOM ELEMENTS ---
const loaderOverlay = document.getElementById('loader-overlay'); // Add this at the top with other DOM elements
const exerciseSelect = document.getElementById('exercise-select');
const filterContainer = document.getElementById('filter-container');
const weightChartCanvas = document.getElementById('weight-chart');
const setsChartCanvas = document.getElementById('sets-chart');
const volumeChartCanvas = document.getElementById('volume-chart'); // New canvas

// --- CHART & DATA VARIABLES ---
let weightChart, setsChart, volumeChart; // Added volumeChart
let allLogs = []; // To store all workout data
let currentFilterDays = 0; // 0 for "All Time"

/**
 * Main function to update all charts based on selections.
 */
function updateCharts() {
    const selectedExercise = exerciseSelect.value;
    if (!selectedExercise) return;

    // --- NEW: Filter logs by date ---
    let filteredLogs = allLogs;
    if (currentFilterDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - currentFilterDays);
        filteredLogs = allLogs.filter(log => new Date(log.Timestamp) >= cutoffDate);
    }
    
    // Filter by selected exercise
    const exerciseLogs = filteredLogs.filter(log => log.Exercise === selectedExercise);

    // Group data by date
    const dataByDate = {};
    exerciseLogs.forEach(log => {
        const date = new Date(log.Timestamp).toLocaleDateString();
        if (!dataByDate[date]) {
            dataByDate[date] = { weights: [], setCount: 0, totalVolume: 0 };
        }
        dataByDate[date].weights.push(Number(log.Weight));
        dataByDate[date].setCount++;
        // --- NEW: Calculate Total Volume ---
        dataByDate[date].totalVolume += Number(log.Weight) * Number(log.Reps);
    });

    // Sort dates chronologically
    const sortedDates = Object.keys(dataByDate).sort((a, b) => new Date(a) - new Date(b));

    // Prepare data arrays for the charts
    const labels = sortedDates;
    const maxWeights = sortedDates.map(date => Math.max(...dataByDate[date].weights));
    const totalSets = sortedDates.map(date => dataByDate[date].setCount);
    const totalVolumes = sortedDates.map(date => dataByDate[date].totalVolume); // New data array

    renderWeightChart(labels, maxWeights);
    renderSetsChart(labels, totalSets);
    renderVolumeChart(labels, totalVolumes); // New chart render call
}

/**
 * Renders the "Max Weight Over Time" chart.
 */
function renderWeightChart(labels, data) {
    if (weightChart) weightChart.destroy();
    weightChart = new Chart(weightChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Max Weight Lifted',
                data: data,
                borderColor: 'rgba(0, 123, 255, 1)',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Max Weight Over Time' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Weight' } } }
        }
    });
}

/**
 * Renders the "Total Sets Over Time" chart.
 */
function renderSetsChart(labels, data) {
    if (setsChart) setsChart.destroy();
    setsChart = new Chart(setsChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Sets Performed',
                data: data,
                backgroundColor: 'rgba(40, 167, 69, 0.7)'
            }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Total Sets Over Time' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Number of Sets' } } }
        }
    });
}

/**
 * --- NEW: Renders the "Total Volume Over Time" chart. ---
 */
function renderVolumeChart(labels, data) {
    if (volumeChart) volumeChart.destroy();
    volumeChart = new Chart(volumeChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Volume (Weight x Reps)',
                data: data,
                borderColor: 'rgba(220, 53, 69, 1)',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Total Volume Over Time' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Volume' } } }
        }
    });
}


/**
 * Fetches all data and initializes the page.
 */
async function initializeDashboard() {
    loaderOverlay.style.display = 'flex'; // Show loader
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        allLogs = data.logs;

        // Populate the dropdown with unique exercises
        const uniqueExercises = [...new Set(allLogs.map(log => log.Exercise))];
        exerciseSelect.innerHTML = '<option value="">-- Select an Exercise --</option>';
        uniqueExercises.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex;
            option.textContent = ex;
            exerciseSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Error fetching data:", error);
        alert("Could not load workout data.");
    } finally {
        loaderOverlay.style.display = 'none'; // Hide loader
    }
}

// --- EVENT LISTENERS ---
exerciseSelect.addEventListener('change', updateCharts);

filterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        // Update active button style
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update state and refresh charts
        currentFilterDays = Number(e.target.dataset.days);
        updateCharts();
    }
});

// --- INITIALIZATION ---

initializeDashboard();

