const sharp = require('sharp');

function getTextBuffer(text) {
    // Calculate the position and size of the text overlay
    const textWidth = 20;
    const textHeight = 20;
  
    // Create an SVG element
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${textWidth}" height="${textHeight}">
        <text x="0" y="${textHeight / 2}" fill="white" font-family="Arial" font-size="10" font-weight="bold">${text}</text>
      </svg>
    `;
  
    // Convert the SVG to a buffer that sharp can use
    const textImageBuffer = Buffer.from(svg);
    return sharp(textImageBuffer, { density: 300 })
      .png()
      .toBuffer();
  }

async function generateCard(cardFramePath, cardImagePath, text, outputPath) {
  try {
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

    const textWidth = 25;
    const textTop = 5;
    const textLeft = width - textWidth - 20;
    const textImage = getTextBuffer(text);

    const [frameBuffer, imageBuffer, textBuffer] = await Promise.all([frameResizer, imageResizer, textImage]);
    
    // Composite the CardImage with the CardFrame
    await sharp(frameBuffer)
      .composite([
        { input: imageBuffer,
            gravity: 'northwest',
            top: overlayTop,
            left: overlayLeft,
            blend: 'dest-over',
        },{ 
            input: textBuffer, 
            top: textTop, 
            left: textLeft, 
        }])
      .toFile(outputPath);
      
    console.log(`Image saved to ${outputPath}`);
  } catch (err) {
    console.error(err);
  }
}

const CARD_FRAME_PATH = './tests/CardFrame.png';
const CARD_IMAGE_PATH = './tests/CardImage.png';
const OUTPUT_PATH = './tests/output.png';
generateCard(CARD_FRAME_PATH, CARD_IMAGE_PATH, '1', OUTPUT_PATH);
