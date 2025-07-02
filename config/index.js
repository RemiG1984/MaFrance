
module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },
  
  database: {
    path: process.env.DB_PATH || '.data/france.db'
  },
  
  api: {
    limits: {
      communes: 10,
      articles: 1000,
      rankings: 100
    },
    timeouts: {
      query: 30000,
      connection: 5000
    }
  },
  
  validation: {
    search: {
      minLength: 2,
      maxLength: 100
    },
    department: {
      validCodes: [
        '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
        '11', '12', '13', '14', '15', '16', '17', '18', '19', '21',
        '22', '23', '24', '25', '26', '27', '28', '29', '2A', '2B',
        '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
        '40', '41', '42', '43', '44', '45', '46', '47', '48', '49',
        '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
        '60', '61', '62', '63', '64', '65', '66', '67', '68', '69',
        '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
        '80', '81', '82', '83', '84', '85', '86', '87', '88', '89',
        '90', '91', '92', '93', '94', '95', '971', '972', '973',
        '974', '976'
      ]
    }
  },
  
  setup: {
    csvFiles: {
      importScores: [
        'setup/france_scores.csv',
        'setup/departement_scores.csv',
        'setup/commune_scores.csv'
      ],
      importArticles: ['setup/fdesouche_analyzed.csv'],
      importNames: [
        'setup/analyse_prenom_france.csv',
        'setup/analyse_prenom_departement.csv',
        'setup/analyse_prenom_commune.csv'
      ],
      importCrimeData: [
        'setup/crime_data_france.csv',
        'setup/crime_data_departement.csv',
        'setup/crime_data_commune.csv'
      ],
      importElus: [
        'setup/maires_list.csv',
        'setup/prefets_list.csv',
        'setup/ministre_interieur_list.csv'
      ]
    }
  },
  
  metrics: {
    scores: [
      'total_score',
      'insecurite_score',
      'immigration_score',
      'islamisation_score',
      'defrancisation_score',
      'wokisme_score'
    ],
    crimeRates: [
      'homicides_p100k',
      'violences_physiques_p1k',
      'violences_sexuelles_p1k',
      'vols_p1k',
      'destructions_p1k',
      'stupefiants_p1k',
      'escroqueries_p1k'
    ],
    demographics: [
      'prenom_francais_pct',
      'extra_europeen_pct',
      'musulman_pct',
      'number_of_mosques',
      'mosque_p100k'
    ]
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableSqlLogging: process.env.ENABLE_SQL_LOGGING === 'true'
  }
};
