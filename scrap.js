const puppeteer = require('puppeteer');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const player = require('play-sound')(); // Module pour jouer le son
const dotenv = require('dotenv');
dotenv.config();

const current_time = new Date();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const entreprises = [];

let start = current_time.getHours() + ':' + current_time.getMinutes();
console.log(`début() ${start}`);
const scrape = async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto(process.env.website);
  await page.waitForSelector('body');
  await page.type('#user_email', process.env.myMail);
  await page.type('#user_password', process.env.myPassword);
  await page.click('.btn.btn-school');
  await sleep(3000);

  let hasNextPage = true;

  while (hasNextPage) {
    sleep(3000);
    const scrapedData = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      const scrapedResults = [];

      rows.forEach((row) => {
        if (row.querySelector('.nom_adresse')) {
          let entreprise = {};

          const nomAdresse = row
            .querySelector('.nom_adresse')
            .textContent.trim()
            .split('\n');

          const nom = nomAdresse[0].trim();
          const adresse = nomAdresse[1].trim();

          const emailLinks = Array.from(
            row.querySelector('td.liens').querySelectorAll('a')
          );
          let emails = [];

          const phoneRegex =
            /Tél\. : (\d{2} \d{2} \d{2} \d{2} \d{2}) - (\d{2} \d{2} \d{2} \d{2} \d{2})/gi;

          const phoneNumbers = row
            .querySelector('td.liens')
            .innerText.match(phoneRegex);

          const activity = row
            .querySelector('.activite')
            .textContent.split('\n')[0];

          const emailRegex =
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;

          emailLinks.forEach((link) => {
            const emailText = link.innerText;
            const matchedEmails = emailText.match(emailRegex);
            if (matchedEmails) {
              matchedEmails.forEach((email) => {
                emails.push(email);
              });
            }
          });

          const siteAnchor = row.querySelector('.liens a[target="_blank"]');
          const site = siteAnchor ? siteAnchor.getAttribute('href') : '';

          entreprise = {
            nom: nom,
            adresse: adresse,
            emails: emails,
            site: site,
            activite: activity,
            phoneNumbers: phoneNumbers,
          };

          scrapedResults.push(entreprise);
        }
      });

      return scrapedResults;
    });
    let data = await [...scrapedData];
    entreprises.push(data);
    let end = current_time.getHours() + ':' + current_time.getMinutes();

    const path = 'entreprisesMetz.csv';
    const appendMode = fs.existsSync(path) ? true : false;

    const csvWriter = createCsvWriter({
      path: path,
      header: [
        { id: 'nom', title: 'Nom' },
        { id: 'adresse', title: 'Adresse' },
        { id: 'emails', title: 'Emails' },
        { id: 'site', title: 'Site' },
        { id: 'activite', title: 'Activité' }, // Ajouté 'Activité'
        { id: 'phoneNumbers', title: 'Numéro de Téléphone' }, // Ajouté 'Numéro de Téléphone'
      ],
      append: appendMode, // Ouverture en mode append
    });

    // Écrire les données dans le fichier CSV
    await csvWriter.writeRecords(data);
    // cliquer sur le bouton "suivant" pour charger la page suivante
    nextPageButton = await page.$('.next_page');
    if (nextPageButton) {
      await nextPageButton.click();
      await page.waitForNavigation();
    } else {
      hasNextPage = false;
      await browser.close();
      console.log(`fini à ${end}, temps total: ${end - start}`);

      // Jouer le son à la fin du script
      playSound();
    }
  }
};

scrape();

playSound = () => {
  const soundPath = '/System/Library/Sounds/Ping.aiff'; // Chemin vers le fichier audio souhaité

  player.play(soundPath, (err) => {
    if (err) {
      console.error('Erreur lors de la lecture du son :', err);
    }
  });
};
