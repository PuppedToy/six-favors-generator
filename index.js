const sharp = require('sharp');
const wordwrap = require('wordwrap');

const cards = require('./cards.json');

const WORD_WRAP_THRESHOLD = 42;

const lords = {
  gaidda: {
    costColor: '#B1CAB1',
    textColor: '#2A5A25',
  },
  noumi: {
    costColor: '#FBF8D9',
    textColor: '#5A5925',
  },
  ysault: {
    costColor: '#FBD9D9',
    textColor: '#5A2525',
  },
  seraneri: {
    costColor: '#D9F8FB',
    textColor: '#252A5A',
  },
  boumandow: {
    costColor: 'white',
    textColor: '#55255A',
  },
  hesif: {
    costColor: '#D7B5FC',
    textColor: '#D7B5FC',
  },
};

function firstLetterToUpperCase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getCardFramePath(lord, rarity) {
  return `./frames/${firstLetterToUpperCase(lord)}${firstLetterToUpperCase(rarity)}.png`;
}

function getCostTextBuffer(text, lord) {
  return getTextBuffer(text, lords[lord].costColor, {
    textHeight: 20,
    textWidth: 20,
    fontSize: 10,
  });
}

function getHPTextBuffer(text, lord) {
  return getTextBuffer(text, lords[lord].costColor, {
    textHeight: 20,
    textWidth: 20,
    fontSize: 8,
  });
}

function getCardTextBuffer(text, lord) {
  return getTextBuffer(`     ${text}`, lords[lord].textColor, {
    textHeight: 50,
    textWidth: 78,
    fontSize: 4,
    fontFamily: 'Arial',
  });
}

function getTextBuffer(text, color, {textWidth, textHeight, fontSize, fontFamily}) {
    const wrap = wordwrap(WORD_WRAP_THRESHOLD, {cut: true});

    // Break the text into multiple lines
    const wrappedText = wrap(text);

    // Create an SVG element
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${textWidth}" height="${textHeight}">
      <style>
        @import url("https://fonts.googleapis.com/css2?family=MedievalSharp"); 
        text {
          white-space: pre;
          font-size: ${fontSize}px;
          font-weight: bold;
          fill: ${color};
        }
      </style>
      ${wrappedText.split('\n').map((line, index) => `<text xml:space="preserve" font-family="${fontFamily || 'MedievalSharp'}" x="0" y="${(index+1) * fontSize}">${line}</text>`).join('\n')}
    </svg>`;
  
    // Convert the SVG to a buffer that sharp can use
    const textImageBuffer = Buffer.from(svg);
    return sharp(textImageBuffer, { density: 300 })
      .png()
      .toBuffer();
}

function getIconBuffer(lord, type) {
  const iconPath = `./icons/${type}_${lord}.png`;
  return sharp(iconPath)
    .resize(18, 18)
    .toBuffer();
}

async function generateCard(lord, rarity, cardImagePath, costText, hpText, useText, playText, outputPath) {
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
    const hpTextTop = 470;
    const hpTextLeft = 68;
    const costTextImage = getCostTextBuffer(costText, lord);
    const hpTextImage = getHPTextBuffer(hpText, lord);

    const useTextImage = getCardTextBuffer(useText, lord);
    const useIconImage = getIconBuffer(lord, 'use');
    const playTextImage = getCardTextBuffer(playText, lord);
    const playIconImage = getIconBuffer(lord, 'play');

    const [
      frameBuffer,
      imageBuffer,
      costTextBuffer,
      useTextBuffer,
      playTextBuffer,
      useIconBuffer,
      playIconBuffer,
      hpTextBuffer,
    ] = await Promise.all([
      frameResizer,
      imageResizer,
      costTextImage,
      useTextImage,
      playTextImage,
      useIconImage,
      playIconImage,
      hpTextImage,
    ]);
    const textTop = 260;
    const textLeft = 30;

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
        },{
          input: hpTextBuffer, 
          top: hpTextTop, 
          left: hpTextLeft, 
        },{
            input: useTextBuffer,
            top: textTop,
            left: textLeft,
        },{
            input: playTextBuffer,
            top: textTop + 40,
            left: textLeft,
        },{
            input: useIconBuffer,
            top: textTop + 2,
            left: textLeft,
        },{
            input: playIconBuffer,
            top: textTop + 42,
            left: textLeft,
        }])
      .toFile(outputPath);
      
    console.log(`Image saved to ${outputPath}`);
  } catch (err) {
    console.error(err);
  }
}

const CARD_IMAGE_PATH = './tests/CardImage.png';

const rarities = ['common', 'rare', 'epic', 'legendary'];

// Object.keys(lords).forEach((lord) => {
//   rarities.forEach((rarity) => {
//     generateCard(
//       lord,
//       rarity,
//       CARD_IMAGE_PATH,
//       '8',
//       '2',
//       'Draw 5 cards to give 2 card.',
//       'Whenever anyone gives a card, you have priority. If you were not the target, draw a card.',
//       `./tests/out/${lord}-${rarity}.png`
//     );
//   });
// });

Object.entries(cards).forEach(([lord, lordCards]) => {
  lordCards.forEach((card, index) => {
    generateCard(
      lord,
      card.rarity,
      `cardImages/${lord}_${index}.png`,
      card.cost,
      card.hp,
      card.useText,
      card.playText,
      `./tests/out/${index}_${lord}.png`
    );
  });
});