// @packages
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createCanvas, Image, loadImage } from 'canvas';
import {
   createWriteStream,
   readdirSync,
   readFileSync,
   writeFileSync,
   mkdirSync,
   existsSync,
} from 'node:fs';

// @types
import { MapData, RenderAssets, RGBAChannels } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mapsDataDir = join(__dirname, 'map_data');
const assetsDir = join(__dirname, 'map_elements');
const outputDir = join(__dirname, 'map_renders');

const mapsData = new Map<number, string>();
const assets = new Map<number, string>();

const MAP_WIDTH = 1920;
const MAP_HEIGHT = 1000;
const centerX = MAP_WIDTH / 2;
const centerY = MAP_HEIGHT / 2;

const readMapDataPaths = () => {
   const mapFiles = readdirSync(mapsDataDir);
   for (const map of mapFiles) {
      if (!map.endsWith('.json')) continue;
      const mapId = parseInt(map.replace(/\D/g, ''));
      mapsData.set(mapId, join(mapsDataDir, map));
   }
   console.log(mapsData.size, 'maps found!');
};

const readAssetPaths = () => {
   const elementFiles = readdirSync(assetsDir);
   for (const gfx of elementFiles) {
      if (!gfx.endsWith('.png')) continue;
      const gfxId = parseInt(gfx.replace(/\D/g, ''));
      assets.set(gfxId, join(assetsDir, gfx));
   }
   console.log(assets.size, 'assets found!');
};

const intToRGBAChannels = (value: number) => {
   const alpha = ((value >> 24) & 0xff) / 255;
   const red = ((value >> 16) & 0xff) / 255;
   const green = ((value >> 8) & 0xff) / 255;
   const blue = (value & 0xff) / 255;
   return {
      hex: `#${(value >>> 0).toString(16).padStart(8, '0')}`,
      channels: { red, green, blue, alpha },
   };
};

const applyColorToImage = (image: Image, color: RGBAChannels) => {
   const tempCanvas = createCanvas(image.width, image.height);
   const tempCtx = tempCanvas.getContext('2d');
   tempCtx.drawImage(image, 0, 0);

   const imageData = tempCtx.getImageData(0, 0, image.width, image.height);
   const data = imageData.data;
   const multiplier = 2;

   for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * color.red * multiplier);
      data[i + 1] = Math.min(255, data[i + 1] * color.green * multiplier);
      data[i + 2] = Math.min(255, data[i + 2] * color.blue * multiplier);
      data[i + 3] = Math.min(255, data[i + 3] * color.alpha);
   }

   tempCtx.putImageData(imageData, 0, 0);
   return tempCanvas as unknown as Image;
};

const assetsToFixSkew = [31652];
const specialAssets = [43769];
const lightAssets = [305477, 57871, 59247, 805015];
const maskAssets = [
   62942, 404313, 404314, 404315, 404316, 404322, 404327, 404328, 404336, 404337, 404338, 404339,
   404340, 404341, 404343, 404344,
];
const assetsToIgnore = [31634, 305396];

const renderAssets: RenderAssets = async ({ ctx, map, extractAssets }) => {
   const mapId = map.mapId;
   ctx.fillStyle = intToRGBAChannels(map.backgroundColor).hex;
   ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
   const gfxs = [
      ...map.backgroundElements,
      ...map.sortableElements,
      ...map.animatedElements,
      ...map.foregroundElements,
   ];

   for (const data of gfxs) {
      const { gfxId, transform, color, displayBehaviour } = data;
      if (maskAssets.includes(gfxId) || assetsToIgnore.includes(gfxId)) continue;

      const assetPath = assets.get(gfxId);
      if (!assetPath) {
         console.error(`Map ${mapId} - Asset ${gfxId} not found`);
         continue;
      }

      const RGBA = intToRGBAChannels(color.value).channels;
      const buffer = readFileSync(assetPath);
      const image = await loadImage(buffer);
      const asset = applyColorToImage(image, RGBA);

      if (extractAssets) {
         const mapAssetsFolder = join(outputDir, `${mapId}`, `db_${displayBehaviour}`);
         const folderExists = existsSync(mapAssetsFolder);
         if (!folderExists) mkdirSync(mapAssetsFolder, { recursive: true });
         writeFileSync(join(mapAssetsFolder, `${gfxId}.png`), buffer);
      }

      const scaleX = transform.m11;
      const scaleY = transform.m22;

      const skewX = transform.m12;
      let skewY = transform.m21;

      const skewsHaveSameSign = (skewX < 0 && skewY < 0) || (skewX > 0 && skewY > 0);
      const skewsAreEqual = skewX !== 0 && skewX === skewY;
      if (skewsAreEqual || skewsHaveSameSign || assetsToFixSkew.includes(gfxId)) skewY = -skewX;

      const assetCenterX = (asset.width / 2) * scaleX;
      const assetCenterY = (asset.height / 2) * scaleY;

      const offsetX = centerX - assetCenterX + (skewY * asset.height) / 2;
      const offsetY = centerY - assetCenterY + (skewX * asset.width) / 2;

      const traslationX = transform.m31 + offsetX;
      const traslationY = -transform.m32 + offsetY;

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      if (specialAssets.includes(gfxId)) {
         ctx.globalAlpha = 0.4;
         ctx.globalCompositeOperation = 'multiply';
      } else if (displayBehaviour === 1 || lightAssets.includes(gfxId)) {
         ctx.globalAlpha = 0.5;
         ctx.globalCompositeOperation = 'overlay';
      }

      ctx.setTransform(scaleX, skewY, skewX, scaleY, traslationX, traslationY);
      ctx.drawImage(asset as unknown as CanvasImageSource, 0, 0);
      ctx.resetTransform();
   }
};

const buildMap = async (mapId: number, extractAssets?: boolean) => {
   try {
      const path = mapsData.get(mapId);
      if (!path) throw new Error(`Map ${mapId} not found`);
      const data = readFileSync(path, { encoding: 'utf-8' });
      const map = JSON.parse(data) as MapData;
      const canvas = createCanvas(MAP_WIDTH, MAP_HEIGHT);
      const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
      await renderAssets({ ctx, map, extractAssets });
      const out = createWriteStream(join(outputDir, `${mapId}.png`));
      canvas.createPNGStream().pipe(out);
      out.on('finish', () => console.log(`Map ${mapId} rendered!`));
   } catch (error) {
      console.error(`Error building map ${mapId}`, error);
   }
};

readMapDataPaths();
readAssetPaths();
// await buildMap(0, false);
// await buildMap(133132, false);
// await buildMap(151824, false);
// await buildMap(152337, false);
// await buildMap(159746, false);
// await buildMap(73400320, false);
// await buildMap(113770753, false);
// await buildMap(113772033, false);
// await buildMap(115083777, false);
// await buildMap(117965057, false);
// await buildMap(126092035, false);
// await buildMap(139593223, false);
// await buildMap(147062784, false);
// await buildMap(165151749, false);
// await buildMap(169083912, false);
// await buildMap(172098057, false);
// await buildMap(216530950, false);
// await buildMap(220990978, false);
// await buildMap(223480587, false);
// await buildMap(232260608, false);
await buildMap(101844485, false);
await buildMap(134227970, false);

// await buildMap(99752705, false); // not found
