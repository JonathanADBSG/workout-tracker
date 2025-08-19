// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzOPc17fj5Xl0LY-rgKNW3n7fQWjVOjh7MHNHQiFtFg_y3NitamfkVb9nbUe-yr863NgQ/exec"; 
// Make sure this is your correct, redeployed URL

// --- DOM ELEMENTS ---
const loaderOverlay = document.getElementById('loader-overlay');
const exerciseSelect = document.getElementById('exercise-select');
const filterContainer = document.getElementById('filter-container');
const bodyweightChartCanvas = document.getElementById('bodyweight-chart');
const exerciseWeightChartCanvas = document.getElementById('exercise-weight-chart');
const setsChartCanvas = document.getElementById('sets-chart');
const volumeChartCanvas = document.getElementById('volume-chart');

// --- CHART & DATA VARIABLES ---
let bodyweightChart, exerciseWeightChart, setsChart, volumeChart;
let allLogs = [];
let allBodyweight = [];
let currentFilterDays = 0;

/**
 * (UPDATED) Renders all charts based on the current filter.
 */
function updateAllCharts() {
    // Filter and render the bodyweight chart
    let filteredBodyweight = allBodyweight;
    if (currentFilterDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - currentFilterDays);
        filteredBodyweight = allBodyweight.filter(entry => new Date(entry.Timestamp) >= cutoffDate);
    }
    renderBodyweightChart(filteredBodyweight);

    // Filter and render the exercise-specific charts
    updateExerciseCharts();
}


/**
 * Main function to update EXERCISE charts based on selections.
 */
function updateExerciseCharts() {
    const selectedExercise = exerciseSelect.value;
    // Hide exercise charts if no exercise is selected
    if (!selectedExercise) {
        document.getElementById('exercise-weight-chart').style.display = 'none';
        document.getElementById('sets-chart').style.display = 'none';
        document.getElementById('volume-chart').style.display = 'none';
        return;
    }
    // Show charts if an exercise is selected
    document.getElementById('exercise-weight-chart').style.display = 'block';
    document.getElementById('sets-chart').style.display = 'block';
    document.getElementById('volume-chart').style.display = 'block';


    let filteredLogs = allLogs;
    if (currentFilterDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - currentFilterDays);
        filteredLogs = allLogs.filter(log => new Date(log.Timestamp) >= cutoffDate);
    }
    
    const exerciseLogs = filteredLogs.filter(log => log.Exercise === selectedExercise);

    const dataByDate = {};
    exerciseLogs.forEach(log => {
        const date = new Date(log.Timestamp).toLocaleDateString();
        if (!dataByDate[date]) {
            dataByDate[date] = { weights: [], setCount: 0, totalVolume: 0 };
        }
        dataByDate[date].weights.push(Number(log.Weight));
        dataByDate[date].setCount++;
        dataByDate[date].totalVolume += Number(log.Weight) * Number(log.Reps);
    });

    const sortedDates = Object.keys(dataByDate).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDates;
    const maxWeights = sortedDates.map(date => Math.max(...dataByDate[date].weights));
    const totalSets = sortedDates.map(date => dataByDate[date].setCount);
    const totalVolumes = sortedDates.map(date => dataByDate[date].totalVolume);

    renderExerciseWeightChart(labels, maxWeights);
    renderSetsChart(labels, totalSets);
    renderVolumeChart(labels, totalVolumes);
}

/**
 * (UPDATED) Renders the "Bodyweight Over Time" chart with specific data.
 * @param {Array} dataToRender The array of bodyweight entries to display.
 */
function renderBodyweightChart(dataToRender) {
    const sortedData = dataToRender.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
    const labels = sortedData.map(entry => new Date(entry.Timestamp).toLocaleDateString());
    const data = sortedData.map(entry => entry.Weight);

    if (bodyweightChart) bodyweightChart.destroy();
    bodyweightChart = new Chart(bodyweightChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bodyweight',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Bodyweight Over Time' } },
            scales: { y: { beginAtZero: false, title: { display: true, text: 'Weight' } } }
        }
    });
}


/**
 * Renders the "Max Weight Over Time" chart for a selected exercise.
 */
function renderExerciseWeightChart(labels, data) {
    if (exerciseWeightChart) exerciseWeightChart.destroy();
    exerciseWeightChart = new Chart(exerciseWeightChartCanvas, {
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
 * Renders the "Total Volume Over Time" chart.
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
    loaderOverlay.style.display = 'flex';
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        allLogs = data.logs;
        allBodyweight = data.bodyweight;

        // Initial render of all charts
        updateAllCharts();

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
        loaderOverlay.style.display = 'none';
    }
}

// --- EVENT LISTENERS ---
exerciseSelect.addEventListener('change', updateExerciseCharts);

filterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentFilterDays = Number(e.target.dataset.days);
        // This now updates ALL charts, including bodyweight
        updateAllCharts();
    }
});

// --- INITIALIZATION ---
initializeDashboard();