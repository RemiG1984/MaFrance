(function () {
    // Department code to name mapping (copied from main.js)
    const departmentNames = {
        '01': 'Ain',
        '02': 'Aisne',
        '03': 'Allier',
        '04': 'Alpes-de-Haute-Provence',
        '05': 'Hautes-Alpes',
        '06': 'Alpes-Maritimes',
        '07': 'Ardèche',
        '08': 'Ardennes',
        '09': 'Ariège',
        '10': 'Aube',
        '11': 'Aude',
        '12': 'Aveyron',
        '13': 'Bouches-du-Rhône',
        '14': 'Calvados',
        '15': 'Cantal',
        '16': 'Charente',
        '17': 'Charente-Maritime',
        '18': 'Cher',
        '19': 'Corrèze',
        '2A': 'Corse-du-Sud',
        '2B': 'Haute-Corse',
        '21': 'Côte-d\'Or',
        '22': 'Côtes-d\'Armor',
        '23': 'Creuse',
        '24': 'Dordogne',
        '25': 'Doubs',
        '26': 'Drôme',
        '27': 'Eure',
        '28': 'Eure-et-Loir',
        '29': 'Finistère',
        '30': 'Gard',
        '31': 'Haute-Garonne',
        '32': 'Gers',
        '33': 'Gironde',
        '34': 'Hérault',
        '35': 'Ille-et-Vilaine',
        '36': 'Indre',
        '37': 'Indre-et-Loire',
        '38': 'Isère',
        '39': 'Jura',
        '40': 'Landes',
        '41': 'Loir-et-Cher',
        '42': 'Loire',
        '43': 'Haute-Loire',
        '44': 'Loire-Atlantique',
        '45': 'Loiret',
        '46': 'Lot',
        '47': 'Lot-et-Garonne',
        '48': 'Lozère',
        '49': 'Maine-et-Loire',
        '50': 'Manche',
        '51': 'Marne',
        '52': 'Haute-Marne',
        '53': 'Mayenne',
        '54': 'Meurthe-et-Moselle',
        '55': 'Meuse',
        '56': 'Morbihan',
        '57': 'Moselle',
        '58': 'Nièvre',
        '59': 'Nord',
        '60': 'Oise',
        '61': 'Orne',
        '62': 'Pas-de-Calais',
        '63': 'Puy-de-Dôme',
        '64': 'Pyrénées-Atlantiques',
        '65': 'Hautes-Pyrénées',
        '66': 'Pyrénées-Orientales',
        '67': 'Bas-Rhin',
        '68': 'Haut-Rhin',
        '69': 'Rhône',
        '70': 'Haute-Saône',
        '71': 'Saône-et-Loire',
        '72': 'Sarthe',
        '73': 'Savoie',
        '74': 'Haute-Savoie',
        '75': 'Paris',
        '76': 'Seine-Maritime',
        '77': 'Seine-et-Marne',
        '78': 'Yvelines',
        '79': 'Deux-Sèvres',
        '80': 'Somme',
        '81': 'Tarn',
        '82': 'Tarn-et-Garonne',
        '83': 'Var',
        '84': 'Vaucluse',
        '85': 'Vendée',
        '86': 'Vienne',
        '87': 'Haute-Vienne',
        '88': 'Vosges',
        '89': 'Yonne',
        '90': 'Territoire de Belfort',
        '91': 'Essonne',
        '92': 'Hauts-de-Seine',
        '93': 'Seine-Saint-Denis',
        '94': 'Val-de-Marne',
        '95': 'Val-d\'Oise',
        '971': 'Guadeloupe',
        '972': 'Martinique',
        '973': 'Guyane',
        '974': 'La Réunion',
        '976': 'Mayotte'
    };

    // Parse URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type'); // country, department, or commune
    const code = urlParams.get('code'); // France, dept code, or COG
    const dept = urlParams.get('dept'); // Department code for communes

    // DOM element for the chart
    const canvas = document.getElementById('namesChart');
    if (!canvas) {
        console.error('Canvas element with ID "namesChart" not found');
        return;
    }

    // Initialize Chart.js
    async function initChart() {
        try {
            let endpoint;
            let params = {};

            // Determine the endpoint based on type
            if (type === 'country') {
                endpoint = '/api/country/names_history';
                params = { country: code || 'France' };
            } else if (type === 'department') {
                endpoint = '/api/department/names_history';
                params = { dept: code };
            } else if (type === 'commune') {
                if (!dept) {
                    throw new Error('Department code is required for commune');
                }
                endpoint = '/api/commune_names_history';
                params = { dept: dept, cog: code };
            } else {
                throw new Error('Invalid type parameter');
            }

            // Construct query string
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${endpoint}?${queryString}`);
            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération des données: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Historical names data:', data);

            if (!data || data.length === 0) {
                document.body.innerHTML = '<p>Aucune donnée disponible pour cet emplacement.</p>';
                return;
            }

            // Extract years and datasets
            const years = data.map(row => row.annais);
            const categories = [
                { key: 'traditionnel_pct', label: 'Prénoms français traditionnels', color: '#455a64', order: 2 },
                { key: 'moderne_pct', label: 'Prénoms français modernes', color: '#dc3545', order: 3 },
                { key: 'europeen_pct', label: 'Prénoms européens', color: '#007bff', order: 4 },
                { key: 'invente_pct', label: 'Prénoms inventés', color: '#17a2b8', order: 5 },
                { key: 'musulman_pct', label: 'Prénoms musulmans', color: '#28a745', order: 1 }, // Frontmost
                { key: 'africain_pct', label: 'Prénoms africains', color: '#6c757d', order: 6 },
                { key: 'asiatique_pct', label: 'Prénoms asiatiques', color: '#ffc107', order: 7 } // Backmost
            ];

            const datasets = categories.map(category => ({
                label: category.label,
                data: data.map(row => row[category.key] || 0),
                borderColor: category.color,
                backgroundColor: category.color,
                fill: false,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
                order: category.order
            }));

            // Determine chart title
            let titleText;
            if (type === 'country') {
                titleText = 'France';
            } else if (type === 'department') {
                titleText = `${code} - ${departmentNames[code] || code}`;
            } else {
                titleText = `Commune ${code}`;
            }

            // Create the chart
            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 14
                                },
                                color: '#343a40'
                            }
                        },
                        title: {
                            display: true,
                            text: `Évolution des prénoms de naissance (${titleText})`,
                            font: {
                                family: "'Roboto', Arial, sans-serif",
                                size: 22,
                                weight: '700'
                            },
                            color: '#343a40',
                            padding: {
                                top: 10,
                                bottom: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: '#fff',
                            titleColor: '#343a40',
                            bodyColor: '#343a40',
                            borderColor: '#dee2e6',
                            borderWidth: 1,
                            titleFont: {
                                family: "'Roboto', Arial, sans-serif",
                                size: 14
                            },
                            bodyFont: {
                                family: "'Roboto', Arial, sans-serif",
                                size: 12
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Année',
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 16,
                                    weight: '600'
                                },
                                color: '#343a40'
                            },
                            ticks: {
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 12
                                },
                                color: '#343a40'
                            },
                            grid: {
                                color: '#ececec'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Pourcentage (%)',
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 16,
                                    weight: '600'
                                },
                                color: '#343a40'
                            },
                            ticks: {
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 12
                                },
                                color: '#343a40',
                                callback: function (value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: '#ececec'
                            }
                        }
                    }
                }
            });
        } catch (error) {
            document.body.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error('Erreur lors de la création du graphique:', error);
        }
    }

    // Load Chart.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.onload = initChart;
    script.onerror = () => console.error('Erreur lors du chargement de Chart.js');
    document.head.appendChild(script);
})();