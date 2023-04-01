const sharp = require('sharp');
const wordwrap = require('wordwrap');

const cards = require('./cards.json');

const WORD_WRAP_THRESHOLD = 42;
const CARD_BODY_LINE_APPROXIMATED_LENGTH = 25;
const CARD_BODY_LINE_HEIGHT = 6;

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

function getCardFramePath(lord, rarity) {
  return `./frames/frame_${lord}_${rarity}.png`;
}

function getCostTextBuffer(text, lord) {
  if (String(text).length === 1) {
    return { text: getTextBuffer(text, lords[lord].costColor, {
      textHeight: 20,
      textWidth: 20,
      fontSize: 10,
      fontWeight: 'default',
    }), top: 0, left: 0 };
  } else {
    return { text: getTextBuffer(text, lords[lord].costColor, {
      textHeight: 20,
      textWidth: 20,
      fontSize: 8,
      fontWeight: 'default',
    }), top: 6, left: -7 };
  }
}

function getHPTextBuffer(text, lord) {
  return getTextBuffer(text, lords[lord].costColor, {
    textHeight: 20,
    textWidth: 20,
    fontSize: 8,
    fontWeight: 'default',
  });
}

function getNameFontSize(text) {
  const MAX_TEXT_LENGTH = 15;
  const LETTERS_PER_FONT_SIZE = 3;
  const diff = Math.max(0, text.length - MAX_TEXT_LENGTH);
  const fontSize = Math.max(4, 8 - parseInt(diff / LETTERS_PER_FONT_SIZE));
  const top = diff;
  return { fontSize, top };
}

function getNameBuffer(text, lord) {
  const { fontSize, top } = getNameFontSize(text);

  return { text: getTextBuffer(text, lords[lord].costColor, {
    textHeight: 30,
    textWidth: 78,
    fontSize,
    fontWeight: 'default',
  }), top };
}

function getCardTextBuffer(text, lord) {
  return getTextBuffer(`     ${text}`, lords[lord].textColor, {
    textHeight: 50,
    textWidth: 78,
    fontSize: 4,
    fontFamily: 'Arial',
  });
}

function getTextBuffer(text, color, {textWidth, textHeight, fontSize, fontFamily, fontWeight}) {
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
          font-weight: ${fontWeight || 'bold'};
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

async function generateCard(lord, rarity, cardImagePath, name, costText, hpText, useText, playText, cardImageTop, cardImageLeft, outputPath) {
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

    const hpTextTop = 470;
    const hpTextLeft = 68;
    const nameTextLeft = 25;
    const { text: costTextImage, top: extraCostTop, left: extraCostLeft } = getCostTextBuffer(costText, lord);
    const hpTextImage = getHPTextBuffer(hpText, lord);
    const { text: nameTextImage, top: extraNameTop } = getNameBuffer(name, lord);
    const nameTextTop = 30 + extraNameTop;
    const costTextTop = 2 + extraCostTop;
    const costTextLeft = width - 41 + extraCostLeft;

    const useTextImage = getCardTextBuffer(useText, lord);
    const useIconImage = getIconBuffer(lord, 'use');
    const playTextImage = getCardTextBuffer(playText, lord);
    const playIconImage = getIconBuffer(lord, 'play');

    let playTextExtraTop = parseInt(useText.length / CARD_BODY_LINE_APPROXIMATED_LENGTH) * CARD_BODY_LINE_HEIGHT;

    const [
      frameBuffer,
      imageBuffer,
      costTextBuffer,
      useTextBuffer,
      playTextBuffer,
      useIconBuffer,
      playIconBuffer,
      hpTextBuffer,
      nameTextBuffer,
    ] = await Promise.all([
      frameResizer,
      imageResizer,
      costTextImage,
      useTextImage,
      playTextImage,
      useIconImage,
      playIconImage,
      hpTextImage,
      nameTextImage,
    ]);
    const textTop = 260;
    const textLeft = 30;

    // Composite the CardImage with the CardFrame
    await sharp(frameBuffer)
      .composite([
        { input: imageBuffer,
            gravity: 'northwest',
            top: overlayTop + cardImageTop,
            left: overlayLeft + cardImageLeft,
            blend: 'dest-over',
        },{ 
            input: costTextBuffer, 
            top: costTextTop, 
            left: costTextLeft, 
        },{
          input: nameTextBuffer, 
          top: nameTextTop, 
          left: nameTextLeft, 
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
            top: textTop + 40 + playTextExtraTop,
            left: textLeft,
        },{
            input: useIconBuffer,
            top: textTop + 2,
            left: textLeft,
        },{
            input: playIconBuffer,
            top: textTop + 42 + playTextExtraTop,
            left: textLeft,
        }])
      .toFile(outputPath);
      
    console.log(`Image saved to ${outputPath}`);
  } catch (err) {
    console.error(err);
  }
}

Object.entries(cards).forEach(([lord, lordCards]) => {
  lordCards.forEach((card, index) => {
    generateCard(
      lord,
      card.rarity,
      `cardImages/${lord}_${index}.png`,
      card.name,
      card.cost,
      card.hp,
      card.useText,
      card.playText,
      card.top || 0,
      card.left || 0,
      `./tests/out/${lord}_${index}.png`
    );
  });
});