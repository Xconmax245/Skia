const fs = require('fs');
fetch('https://api.fontshare.com/v2/css?f[]=synonym@400,500,600,700&f[]=chillax@400,500,600,700&display=swap')
  .then(r => r.text())
  .then(t => {
    fs.writeFileSync('src/app/fonts.css', t);
    console.log('Fonts downloaded successfully.');
  })
  .catch(console.error);
