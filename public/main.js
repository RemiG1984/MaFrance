
import { LocationHandler } from './locationHandler.js';
import { ScoreTableHandler } from './scoreTableHandler.js';
import { ExecutiveHandler } from './executiveHandler.js';
import { ArticleHandler } from './articleHandler.js';
import { MapHandler } from './mapHandler.js';
import { DepartmentNames } from './departmentNames.js';
import { debounce, normalizeDept } from './utils.js';
import { ErrorHandler } from './errorHandler.js';
import { apiService } from './apiService.js';
import { validateDepartment, validateCommune } from './validators.js';

/**
 * Main application initialization and event handling
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize error handler
    const errorHandler = ErrorHandler();
    
    // Get DOM elements
    const departementSelect = document.getElementById('departementSelect');
    const communeInput = document.getElementById('communeInput');
    const communeList = document.getElementById('communeList');
    const lieuxSelect = document.getElementById('lieuxSelect');
    const resultsDiv = document.getElementById('results');
    const executiveDiv = document.getElementById('executive');
    const articleListDiv = document.getElementById('articleList');
    const filterButtonsDiv = document.getElementById('filterButtons');
    const mapDiv = document.getElementById('mapContainer');
    const mapMetricSelect = document.getElementById('mapMetricSelect');

    // Check if required elements exist
    if (!departementSelect || !communeInput || !communeList || !lieuxSelect || !resultsDiv) {
        console.error('Required DOM elements not found');
        return;
    }

    // Initialize handlers
    let locationHandler, scoreTableHandler, executiveHandler, articleHandler, mapHandler;
    
    try {
        locationHandler = LocationHandler(
            departementSelect,
            communeInput,
            communeList,
            lieuxSelect,
            resultsDiv,
            DepartmentNames
        );

        scoreTableHandler = ScoreTableHandler(resultsDiv, DepartmentNames);
        
        if (executiveDiv) {
            executiveHandler = ExecutiveHandler(executiveDiv, DepartmentNames);
        }
        
        if (articleListDiv && filterButtonsDiv) {
            articleHandler = ArticleHandler(articleListDiv, filterButtonsDiv);
        }
        
        if (mapDiv && mapMetricSelect) {
            mapHandler = MapHandler(mapDiv, mapMetricSelect, departementSelect, resultsDiv, DepartmentNames);
        }
    } catch (error) {
        console.error('Error initializing handlers:', error);
        errorHandler.handleError(error, 'Failed to initialize application handlers');
        return;
    }

    // Global variables
    let currentCOG = null;
    let currentCommune = null;
    let currentDepartement = null;
    window.allArticles = [];

    // Initialize the application
    async function init() {
        try {
            await locationHandler.loadDepartements();
            
            // Show country details by default
            if (scoreTableHandler && typeof scoreTableHandler.showCountryDetails === 'function') {
                await scoreTableHandler.showCountryDetails();
            }
            
            if (executiveHandler && typeof executiveHandler.showCountryExecutive === 'function') {
                await executiveHandler.showCountryExecutive();
            }
        } catch (error) {
            console.error('Error during initialization:', error);
            errorHandler.handleError(error, 'Failed to initialize application');
        }
    }

    // Event listeners
    departementSelect.addEventListener('change', async function() {
        const selectedDept = this.value;
        currentDepartement = selectedDept;
        
        try {
            if (selectedDept) {
                // Enable commune input
                communeInput.disabled = false;
                communeInput.value = '';
                
                // Reset dependent fields
                currentCOG = null;
                currentCommune = null;
                lieuxSelect.innerHTML = '<option value="">-- Tous les lieux --</option>';
                lieuxSelect.disabled = true;
                
                // Clear articles
                if (articleHandler) {
                    articleHandler.clearArticles();
                }
                
                // Show department details
                if (scoreTableHandler && typeof scoreTableHandler.showDepartmentDetails === 'function') {
                    await scoreTableHandler.showDepartmentDetails(selectedDept);
                }
                
                if (executiveHandler && typeof executiveHandler.showDepartmentExecutive === 'function') {
                    await executiveHandler.showDepartmentExecutive(selectedDept);
                }
                
                // Load articles for department
                if (articleHandler) {
                    const articles = await articleHandler.loadArticles(selectedDept);
                    const counts = await articleHandler.loadArticleCounts(selectedDept);
                    articleHandler.renderFilterButtons(counts, articles, '');
                }
            } else {
                // Reset to country view
                locationHandler.resetCommuneAndLieux();
                currentDepartement = null;
                currentCOG = null;
                currentCommune = null;
                
                if (articleHandler) {
                    articleHandler.clearArticles();
                }
                
                if (scoreTableHandler && typeof scoreTableHandler.showCountryDetails === 'function') {
                    await scoreTableHandler.showCountryDetails();
                }
                
                if (executiveHandler && typeof executiveHandler.showCountryExecutive === 'function') {
                    await executiveHandler.showCountryExecutive();
                }
            }
        } catch (error) {
            console.error('Error handling department change:', error);
            errorHandler.handleError(error, 'Failed to load department data');
        }
    });

    // Debounced commune input handler
    const debouncedCommuneHandler = debounce(async function(query) {
        if (!currentDepartement) return;
        
        try {
            await locationHandler.handleCommuneInput(currentDepartement, query);
        } catch (error) {
            console.error('Error handling commune input:', error);
            errorHandler.handleError(error, 'Failed to search communes');
        }
    }, 300);

    communeInput.addEventListener('input', function() {
        const query = this.value.trim();
        debouncedCommuneHandler(query);
    });

    communeInput.addEventListener('change', async function() {
        const selectedCommune = this.value.trim();
        
        if (!selectedCommune || !currentDepartement) {
            return;
        }

        try {
            // Find the COG for the selected commune
            const response = await fetch(`/api/communes?dept=${currentDepartement}&q=${encodeURIComponent(selectedCommune)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch commune details');
            }
            
            const communes = await response.json();
            const matchingCommune = communes.find(c => c.commune.toLowerCase() === selectedCommune.toLowerCase());
            
            if (matchingCommune) {
                currentCOG = matchingCommune.cog;
                currentCommune = matchingCommune.commune;
                
                // Enable lieu selection
                lieuxSelect.disabled = false;
                
                // Load lieux for the commune
                await locationHandler.loadLieux(currentDepartement, currentCOG);
                
                // Show commune details
                if (scoreTableHandler && typeof scoreTableHandler.showCommuneDetails === 'function') {
                    await scoreTableHandler.showCommuneDetails(currentCOG);
                }
                
                if (executiveHandler && typeof executiveHandler.showCommuneExecutive === 'function') {
                    await executiveHandler.showCommuneExecutive(currentCOG);
                }
                
                // Load articles for commune
                if (articleHandler) {
                    const articles = await articleHandler.loadArticles(currentDepartement, currentCOG);
                    const counts = await articleHandler.loadArticleCounts(currentDepartement, currentCOG);
                    articleHandler.renderFilterButtons(counts, articles, '');
                }
            } else {
                console.warn('Commune not found:', selectedCommune);
            }
        } catch (error) {
            console.error('Error handling commune selection:', error);
            errorHandler.handleError(error, 'Failed to load commune data');
        }
    });

    lieuxSelect.addEventListener('change', async function() {
        const selectedLieu = this.value;
        
        if (!currentDepartement) return;
        
        try {
            if (articleHandler) {
                if (currentCOG) {
                    // Commune level with lieu filter
                    const articles = await articleHandler.loadArticles(currentDepartement, currentCOG, selectedLieu);
                    const counts = await articleHandler.loadArticleCounts(currentDepartement, currentCOG, selectedLieu);
                    articleHandler.renderFilterButtons(counts, articles, selectedLieu);
                } else {
                    // Department level with lieu filter
                    const articles = await articleHandler.loadArticles(currentDepartement, '', selectedLieu);
                    const counts = await articleHandler.loadArticleCounts(currentDepartement, '', selectedLieu);
                    articleHandler.renderFilterButtons(counts, articles, selectedLieu);
                }
            }
        } catch (error) {
            console.error('Error handling lieu selection:', error);
            errorHandler.handleError(error, 'Failed to filter articles by location');
        }
    });

    // Initialize the application
    init();
});
