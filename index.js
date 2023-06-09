const sharp = require('sharp');
const wordwrap = require('wordwrap');

const { playDeck, requestDeck, conditionDeck, effectDeck } = require('./cards.json');

const WORD_WRAP_THRESHOLD = 42;
const CARD_BODY_LINE_APPROXIMATED_LENGTH = 25;
const CARD_FLAVOUR_LINE_APPROXIMATED_LENGTH = 18;
const CARD_BODY_LINE_HEIGHT = 6;
const VERSION = '2.1.3';

const lords = {
  gaidda: {
    costColor: '#B1CAB1',
    textColor: '#2A5A25',
    top: 45,
  },
  noumi: {
    costColor: '#FBF8D9',
    textColor: '#5A5925',
    top: 45,
  },
  ysault: {
    costColor: '#FBD9D9',
    textColor: '#5A2525',
  },
  seraneri: {
    costColor: '#D9F8FB',
    textColor: '#252A5A',
  },
  bumandow: {
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

function getCardTextBuffer(text, lord, iconSkip = '     ') {
  return getTextBuffer(`${iconSkip}${text}`, lords[lord].textColor, {
    textHeight: 50,
    textWidth: 78,
    fontSize: 4,
    fontFamily: 'Arial',
    customThreshold: iconSkip ? WORD_WRAP_THRESHOLD : WORD_WRAP_THRESHOLD - 3,
  });
}

function getFlavourTextBuffer(text, lord) {
  return getTextBuffer(text, lords[lord].textColor, {
    textHeight: 50,
    textWidth: 68,
    fontSize: 4,
    fontFamily: 'Arial',
    fontStyle: 'italic',
    fontWeight: 'default',
    customThreshold: 26,
  });
}

function getVersionText() {
  return getTextBuffer(`Bumandow by PuppedToy - v${VERSION}`, 'white', {
    textHeight: 20,
    textWidth: 78,
    fontSize: 2,
    fontFamily: 'Arial',
    fontStyle: 'italic',
    fontWeight: 'default',
  });
}

function getTextBuffer(text, color, {textWidth, textHeight, fontSize, fontFamily, fontWeight, customThreshold, fontStyle}) {
    const wrap = wordwrap(customThreshold || WORD_WRAP_THRESHOLD, {cut: true});

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
          font-style: ${fontStyle || 'none'};
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

async function generateCard(lord, rarity, cardImagePath, name, costText, hpText, useText, playText, flavourText, cardImageTop, cardImageLeft, outputPath) {
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
    const flavourTextExtraTop = parseInt(flavourText.length / CARD_FLAVOUR_LINE_APPROXIMATED_LENGTH) * parseInt(CARD_BODY_LINE_HEIGHT * -1);
    const flavourTextTop = 440 + flavourTextExtraTop;
    const flavourTextLeft = 140;

    const useTextImage = getCardTextBuffer(useText, lord);
    const useIconImage = getIconBuffer(lord, 'use');
    const playTextImage = getCardTextBuffer(playText, lord);
    const playIconImage = getIconBuffer(lord, 'play');
    const flavourTextImage = getFlavourTextBuffer(flavourText, lord);

    let playTextExtraTop = parseInt(useText.length / CARD_BODY_LINE_APPROXIMATED_LENGTH) * CARD_BODY_LINE_HEIGHT;

    const versionTop = 535;
    const versionLeft = 240;
    const versionTextImage = getVersionText();

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
      flavourTextBuffer,
      versionTextBuffer,
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
      flavourTextImage,
      versionTextImage,
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
            input: flavourTextBuffer,
            top: flavourTextTop,
            left: flavourTextLeft,
        },{
            input: useIconBuffer,
            top: textTop + 2,
            left: textLeft,
        },{
            input: playIconBuffer,
            top: textTop + 42 + playTextExtraTop,
            left: textLeft,
        },{
            input: versionTextBuffer,
            top: versionTop,
            left: versionLeft,
        }])
      .toFile(outputPath);
      
    console.log(`Image saved to ${outputPath}`);
  } catch (err) {
    console.error(err);
  }
}

async function generateLordCard(lord, rarity, cardImagePath, name, text, outputPath) {
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

    const nameTextLeft = 25;
    const { text: nameTextImage, top: extraNameTop } = getNameBuffer(name, lord);
    const nameTextTop = 30 + extraNameTop;
    const textImage = getCardTextBuffer(text, lord, '');

    const versionTop = 535;
    const versionLeft = 240;
    const versionTextImage = getVersionText();

    const [
      frameBuffer,
      imageBuffer,
      textBuffer,
      nameTextBuffer,
      versionTextBuffer,
    ] = await Promise.all([
      frameResizer,
      imageResizer,
      textImage,
      nameTextImage,
      versionTextImage,
    ]);
    const textTop = 260;
    const textLeft = 30;

    // Composite the CardImage with the CardFrame
    await sharp(frameBuffer)
      .composite([
        { input: imageBuffer,
            gravity: 'northwest',
            top: overlayTop + (lords[lord].top || 0),
            left: overlayLeft,
            blend: 'dest-over',
        },{
          input: nameTextBuffer, 
          top: nameTextTop, 
          left: nameTextLeft, 
        },{
            input: textBuffer,
            top: textTop,
            left: textLeft,
        },{
            input: versionTextBuffer,
            top: versionTop,
            left: versionLeft,
        }])
      .toFile(outputPath);
      
    console.log(`Image saved to ${outputPath}`);
  } catch (err) {
    console.error(err);
  }
}

function calculateGridDimensions(picturesLength) {
  const maxPicturesPerRow = 10;
  const maxPicturesPerColumn = 7;

  let rowCount = 0;
  let columnCount = 1;
  let gap = null;
  let gapThreshold = 0;
  while (gap !== gapThreshold) {
    rowCount += 1;
    if (rowCount > maxPicturesPerRow) {
      rowCount = 1;
      columnCount += 1;
    }
    if (columnCount > maxPicturesPerColumn) {
      rowCount = 1;
      columnCount = 1;
      gapThreshold += 1;
    }
    gap = picturesLength - rowCount * columnCount;
  }

  return {
    width: rowCount,
    height: columnCount,
    gap,
  };
}

async function createPictureGrid(images, outputPath) {
  const { width, height, gap } = calculateGridDimensions(images.length);

  if (gap > 0) {
    throw new Error(`Found gap for ${images.length} images: ${gap}`);
  }

  const CARD_WIDTH = 375;
  const CARD_HEIGHT = 546;

  const canvasWidth = width * CARD_WIDTH;
  const canvasHeight = height * CARD_HEIGHT;

  let currentX = 0;
  let currentY = 0;

  async function loadImage(path, x, y) {
    const buffer = await sharp(path).toBuffer();
    return {
      input: buffer,
      left: x * CARD_WIDTH,
      top: y * CARD_HEIGHT,
    }
  }

  const compositionPromises = [];
  for(let i = 0; i < images.length; i++) {
    compositionPromises.push(loadImage(images[i], currentX, currentY));
    currentX += 1;
    if (currentX >= width) {
      currentX = 0;
      currentY += 1;
    }
  }

  const compositions = await Promise.all(compositionPromises);

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).composite(compositions)
  .toFile(outputPath);
}

const grids = {};
const playDeckPromises = [];
const requestDeckPromises = [];
const conditionDeckPromises = [];
const effectDeckPromises = [];

const REQUEST_RARITY = 'epic';
const CONDITION_RARITY = 'rare';
const EFFECT_RARITY = 'common';

Object.entries(playDeck).forEach(([lord, lordCards]) => {
  lordCards.forEach((card, index) => {
    if (!grids[lord]) {
      grids[lord] = [];
    }

    if (card.rarity === 'common') {
      grids[lord].push(`./tests/out/${lord}_${index}.png`);
      grids[lord].push(`./tests/out/${lord}_${index}.png`);
      grids[lord].push(`./tests/out/${lord}_${index}.png`);
      grids[lord].push(`./tests/out/${lord}_${index}.png`);
    }
    else if (card.rarity === 'rare') {
      grids[lord].push(`./tests/out/${lord}_${index}.png`);
      grids[lord].push(`./tests/out/${lord}_${index}.png`);
    }
    else {
      grids[lord].push(`./tests/out/${lord}_${index}.png`);
    }

    playDeckPromises.push(generateCard(
      lord,
      card.rarity,
      `cardImages/${lord}_${index}.png`,
      card.name,
      card.cost,
      card.hp,
      card.useText,
      card.playText,
      card.flavourText,
      card.top || 0,
      card.left || 0,
      `./tests/out/${lord}_${index}.png`
    ));
  });
});

Object.entries(requestDeck).forEach(([lord, requests]) => {
  requests.forEach((request, index) => {
    requestDeckPromises.push(generateLordCard(
      lord,
      REQUEST_RARITY,
      `lords/${lord}.png`,
      'Request',
      request,
      `./tests/out/request_${lord}_${index}.png`
    ));
  });
});

Object.entries(conditionDeck).forEach(([lord, conditions]) => {
  conditions.forEach((condition, index) => {
    conditionDeckPromises.push(generateLordCard(
      lord,
      CONDITION_RARITY,
      `lords/${lord}.png`,
      'Condition',
      condition,
      `./tests/out/condition_${lord}_${index}.png`
    ));
  });
});

Object.entries(effectDeck).forEach(([lord, effects]) => {
  effects.forEach((effect, index) => {
    effectDeckPromises.push(generateLordCard(
      lord,
      EFFECT_RARITY,
      `lords/${lord}.png`,
      'Effect',
      effect,
      `./tests/out/effect_${lord}_${index}.png`
    ));
  });
});

Promise.all(playDeckPromises)
  .then(() => {
    Object.entries(grids).forEach(([lord, paths]) => {
      createPictureGrid(paths, `./tests/grids/${lord}_grid.png`);
    });
  }
);

Promise.all(requestDeckPromises)
  .then(() => {
    const allRequests = [];
    Object.entries(requestDeck).forEach(([lord, requests]) => {
      requests.forEach((_, index) => {
        allRequests.push(`./tests/out/request_${lord}_${index}.png`);
      });
    });
    createPictureGrid(allRequests, `./tests/grids/requests_grid.png`);
  }
);

Promise.all(conditionDeckPromises)
  .then(() => {
    const allConditions = [];
    Object.entries(conditionDeck).forEach(([lord, conditions]) => {
      conditions.forEach((_, index) => {
        allConditions.push(`./tests/out/condition_${lord}_${index}.png`);
      });
    });
    createPictureGrid(allConditions, `./tests/grids/conditions_grid.png`);
  }
);

Promise.all(effectDeckPromises)
  .then(() => {
    const allEffects = [];
    Object.entries(effectDeck).forEach(([lord, effects]) => {
      effects.forEach((_, index) => {
        allEffects.push(`./tests/out/effect_${lord}_${index}.png`);
      });
    });
    createPictureGrid(allEffects, `./tests/grids/effects_grid.png`);
  }
);
