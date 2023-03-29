const sharp = require('sharp');

const CARD_FRAME_PATH = './tests/CardFrame.png';
const CARD_IMAGE_PATH = './tests/CardImage.png';
const OUTPUT_PATH = './tests/output.png';

async function generateCard() {
  try {
    const { width, height } = await sharp(CARD_FRAME_PATH).metadata();
    
    // Calculate position and size of the overlay
    const overlayTop = Math.round(height * 0.05);
    const overlayWidth = Math.round(width * 0.95);
    const overlayHeight = Math.round(overlayWidth * (512 / 512));
    const overlayLeft = Math.round((width - overlayWidth) / 2);

    // Load and resize the CardFrame
    const frameResizer = sharp(CARD_FRAME_PATH)
      .resize(width, height)
      .toBuffer();

    // Load and resize the CardImage
    const imageResizer = sharp(CARD_IMAGE_PATH)
      .resize(overlayWidth, overlayHeight)
      .toBuffer();

    const [frameBuffer, imageBuffer] = await Promise.all([frameResizer, imageResizer]);
    
    // Composite the CardImage with the CardFrame
    await sharp(frameBuffer)
      .composite([{ input: imageBuffer, gravity: 'northwest', top: overlayTop, left: overlayLeft, blend: 'dest-over' }])
      .toFile(OUTPUT_PATH);
      
    console.log(`Image saved to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error(err);
  }
}

generateCard();
