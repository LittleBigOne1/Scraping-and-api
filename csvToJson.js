const fs = require('fs');
const csv = require('csv-parser');

const results = [];

fs.createReadStream('o-o.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    // Conversion terminée, les données sont stockées dans 'results'
    // Vous pouvez effectuer des opérations supplémentaires sur les données ici

    // Exemple : affichage des données converties en JSON
    console.log(JSON.stringify(results, null, 2));
    
    // Vous pouvez également enregistrer les données converties dans un fichier JSON
    fs.writeFileSync('fichier.json', JSON.stringify(results, null, 2));
  });
