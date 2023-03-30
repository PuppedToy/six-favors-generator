const sharp = require('sharp');
const path = require('path');

const COST_FONT = path.join(__dirname, 'fonts', 'MedievalSharp-Regular.ttf');

const lords = {
  gaidda: {
    costColor: '#B1CAB1',
  },
  noumi: {
    costColor: '#FBF8D9',
  },
  ysault: {
    costColor: '#FBD9D9',
  },
  seraneri: {
    costColor: '#D9F8FB',
  },
  boumandow: {
    costColor: 'white',
  },
  hesif: {
    costColor: '#D7B5FC',
  },
};

function firstLetterToUpperCase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getCardFramePath(lord, rarity) {
  return `./frames/${firstLetterToUpperCase(lord)}${firstLetterToUpperCase(rarity)}.png`;
}

function getColorTextBuffer(text, lord) {
  return getTextBuffer(text, lords[lord].costColor, 20, 20);
}

function getTextBuffer(text, color, textWidth, textHeight) {  
    // Create an SVG element
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${textWidth}" height="${textHeight}">
      <style>
        @font-face {
          font-family: 'MedievalSharp';
          src: url('fonts/MedievalSharp.eot');
          src: url('fonts/MedievalSharp.eot?#iefix') format('embedded-opentype'),
              url('fonts/MedievalSharp.woff2') format('woff2'),
              url('fonts/MedievalSharp.woff') format('woff'),
              url('fonts/MedievalSharp.ttf') format('truetype'),
              url('fonts/MedievalSharp.svg#MedievalSharp') format('svg');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }   
        text {
          font-family: 'MedievalSharp';
          font-size: 10px;
          fill: ${color}};
        }
      </style>
      <text x="0" y="${textHeight / 2}">${text}</text>
    </svg>`;
  
    // Convert the SVG to a buffer that sharp can use
    const textImageBuffer = Buffer.from(svg);
    return sharp(textImageBuffer, { density: 300 })
      .png()
      .toBuffer();
}

async function generateCard(lord, rarity, cardImagePath, text, useText, playText, outputPath) {
  // @TODO useText & playText
  try {
    const cardFramePath = getCardFramePath(lord, rarity);
    const { width, height } = await sharp(cardFramePath).metadata();
    
    // Calculate position and size of the overlay
    const overlayTop = Math.round(height * 0.05);
    const overlayWidth = Math.round(width * 0.95);
    const overlayHeight = Math.round(overlayWidth * (512 / 512));
    const overlayLeft = Math.round((width - overlayWidth) / 2);

    // Load and resize the CardFrame
    const frameResizer = sharp(cardFramePath)
      .resize(width, height)
      .toBuffer();

    // Load and resize the CardImage
    const imageResizer = sharp(cardImagePath)
      .resize(overlayWidth, overlayHeight)
      .toBuffer();

    const costTextTop = 2;
    const costTextLeft = width - 41;
    const costTextImage = getColorTextBuffer(text, lord);

    const [frameBuffer, imageBuffer, costTextBuffer] = await Promise.all([frameResizer, imageResizer, costTextImage]);
    
    // Composite the CardImage with the CardFrame
    await sharp(frameBuffer)
      .composite([
        { input: imageBuffer,
            gravity: 'northwest',
            top: overlayTop,
            left: overlayLeft,
            blend: 'dest-over',
        },{ 
            input: costTextBuffer, 
            top: costTextTop, 
            left: costTextLeft, 
        }])
      .toFile(outputPath);
      
    console.log(`Image saved to ${outputPath}`);
  } catch (err) {
    console.error(err);
  }
}

const CARD_IMAGE_PATH = './tests/CardImage.png';

const rarities = ['common', 'rare', 'epic', 'legendary'];

Object.keys(lords).forEach((lord) => {
  rarities.forEach((rarity) => {
    generateCard(
      lord,
      rarity,
      CARD_IMAGE_PATH,
      '2',
      'Draw 5 cards to give 2 card.',
      'Whenever anyone gives a card, you have priority. If you were not the target, draw a card.',
      `./tests/out/${lord}-${rarity}.png`
    );
  });
});
