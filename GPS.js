const fs = require('fs');
const parse = require('csv-parse');
const axios = require('axios');
const Papa = require('papaparse');
const sleep = require('util').promisify(setTimeout);
const player = require('play-sound')(); // Module pour jouer le son
const dotenv = require('dotenv');

dotenv.config();

const file = 'entreprises2.csv';
const errorFile = 'errors.txt';

fs.readFile(file, 'utf8', async function (err, input) {
  if (err) {
    console.error('An error occurred: ', err);
    process.exit(1);
  }

  parse(
    input,
    { columns: true, relax_column_count: true },
    async (err, records) => {
      if (err) {
        console.error('An error occurred: ', err);
        process.exit(1);
      }

      let requestCount = 0;
      let lineCount = 0;

      const hasGpsColumns =
        records.length > 0 &&
        'latitude' in records[0] &&
        'longitude' in records[0];

      for (const record of records) {
        lineCount++; // Increment the line counter
        try {
          // Check that the record has the expected properties
          if (!('Adresse' in record && 'Nom' in record)) {
            throw new Error(
              `Missing 'Adresse' or 'Nom' property in record at line ${lineCount}`
            );
          }

          if (
            !hasGpsColumns ||
            (record.latitude === '' && record.longitude === '')
          ) {
            const response = await axios.get(
              'https://api.opencagedata.com/geocode/v1/json',
              {
                params: {
                  q: record.Adresse,
                  key: 'c8d071f4c7524cd9a95f85e5b59a2782',
                  language: 'fr',
                  limit: 1,
                },
              }
            );

            if (
              response.data &&
              response.data.results &&
              response.data.results.length > 0
            ) {
              record.latitude = response.data.results[0].geometry.lat;
              record.longitude = response.data.results[0].geometry.lng;
            }
          }

          // Immediately write the record back to the file.
          const csv = Papa.unparse([record], {
            header: lineCount === 1,
            newline: '\n',
          });
          fs.appendFileSync(file, csv + '\n'); // Add new line after each record

          if (++requestCount % 20 === 0) {
            console.log(`Completed ${requestCount} requests`);
            await sleep(2000); // Wait for 2 seconds every 20 requests to avoid hitting the API rate limit.
          }
        } catch (error) {
          playSound();
          console.error(
            `An error occurred at line ${lineCount} for ${record.Nom}: `,
            error
          );
          fs.appendFileSync(
            errorFile,
            `An error occurred at line ${lineCount} for ${record.Nom}: ${error}\n`
          );
        }
      }
    }
  );
});
playSound = () => {
  const soundPath = '/System/Library/Sounds/Ping.aiff'; // Chemin vers le fichier audio souhaité

  player.play(soundPath, (err) => {
    if (err) {
      console.error('Erreur lors de la lecture du son :', err);
    }
  });
};
