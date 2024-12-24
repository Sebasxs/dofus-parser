import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import chokidar from 'chokidar';
import { createReadStream, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputDir = join(__dirname, 'map_bundles');
const outputDir = join(__dirname, 'map_data');

let isDeletingFiles = false;
const filesToDelete: string[] = [];

const addFileToDeleteQueue = async (path: string) => {
   filesToDelete.push(path);
   if (isDeletingFiles) return;

   isDeletingFiles = true;
   await sleep(30_000);

   while (filesToDelete.length > 0) {
      const file = filesToDelete.shift();
      const fileExists = file && existsSync(file);
      if (!fileExists) continue;
      try {
         unlinkSync(file);
      } catch (err) {
         await sleep(1_000);
         filesToDelete.push(file);
      }
   }

   isDeletingFiles = false;
};

const formatMapKeys = (data: string, mapId: string) => {
   const dataJSON = JSON.parse(data);
   const mapData = {
      mapId: parseInt(mapId),
      topNeighbourId: dataJSON.mapData.topNeighbourId,
      bottomNeighbourId: dataJSON.mapData.bottomNeighbourId,
      leftNeighbourId: dataJSON.mapData.leftNeighbourId,
      rightNeighbourId: dataJSON.mapData.rightNeighbourId,
      backgroundColor: dataJSON.mapData.backgroundColor.value,
      backgroundElements: dataJSON.mapData.backgroundElements,
      foregroundElements: dataJSON.mapData.foregroundElements,
      sortableElements: dataJSON.mapData.sortableElements,
      animatedElements: dataJSON.mapData.animatedElements,
      boundingBoxes: dataJSON.mapData.boundingBoxes,
      cellsData: dataJSON.mapData.cellsData,
   };
   writeFileSync(join(outputDir, mapId + '.json'), JSON.stringify(mapData, null, 3));
   console.log(`Updated map ${mapId}`);
};

const readJSONFile = async (file: string) => {
   const filename = basename(file);
   if (!filename.endsWith('.json')) return;

   let data = '';
   const mapId = filename.replace(/\D/g, '');
   const fileStream = createReadStream(file, { encoding: 'utf-8' });
   const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

   try {
      for await (const line of rl) {
         if (line.includes('"references": {')) {
            data = data.trimEnd().slice(0, -1) + '}';
            break;
         }
         data += line;
      }

      data = data.replace(/"{3,}/g, '""');
      formatMapKeys(data, mapId);
      addFileToDeleteQueue(file);
   } catch (err) {
      console.error(`Error processing map: ${mapId}`, err);
      writeFileSync(join(outputDir, 'error_' + mapId + '.txt'), data);
   } finally {
      rl.close();
      fileStream.destroy();
   }
};

chokidar.watch(inputDir, { persistent: true }).on('add', readJSONFile);
console.log('Watching for map files in', inputDir);
