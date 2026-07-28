const https = require('https');
const fs = require('fs');

https.get('https://iex.ec/', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const matches = body.match(/<img[^>]+src=["']([^"']+\.svg)["'][^>]*>/gi);
    console.log(matches ? matches.slice(0, 5) : 'No SVG matches found');
  });
});
