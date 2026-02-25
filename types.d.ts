export type MapElement = {
   gfxId: number;
   color: {
      value: number;
   };
   transform: {
      m11: number;
      m12: number;
      m21: number;
      m22: number;
      m31: number;
      m32: number;
   };
   materialIndex: number;
   displayBehaviour: number;
   cellId?: number;
};

export type MaterialData = {
   atlas: AtlasData;
   hdAtlas: AtlasData;
};

export type MapData = {
   mapId: number;
   topNeighbourId: number;
   bottomNeighbourId: number;
   leftNeighbourId: number;
   rightNeighbourId: number;
   backgroundColor: number;
   backgroundElements: MapElement[];
   sortableElements: MapElement[];
   foregroundElements: MapElement[];
   animatedElements: MapElement[];
   boundingBoxes: MapElement[];
};

export type RGBAChannels = {
   red: number;
   green: number;
   blue: number;
   alpha: number;
};

export type RenderAssets = (args: {
   ctx: CanvasRenderingContext2D;
   map: MapData;
   extractAssets?: boolean;
}) => Promise<void>;
