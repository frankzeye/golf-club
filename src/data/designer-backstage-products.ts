export interface FabricOption {
  id: string;
  name: string;
  color: string; // CSS color or hex for swatch
  priceModifier?: number; // optional upcharge
}

export interface SizeOption {
  id: string;
  name: string;
  dimensions: string;
  price: number;
}

export interface Product {
  slug: string;
  name: string;
  shortDescription: string;
  price: number;
  images: string[];
  dimensions: {
    width: string;
    height: string;
    depth: string;
    weight?: string;
  };
  fabricOptions: FabricOption[];
  sizeOptions: SizeOption[];
}

export const products: Product[] = [
  {
    slug: "atlas-upholstered-bed",
    name: "Atlas Upholstered Bed",
    shortDescription:
      "A statement piece marrying sculptural presence with understated elegance. Handcrafted in our atelier with sustainable materials, the Atlas Bed transforms the bedroom into a sanctuary of refined comfort.",
    price: 4200,
    images: [
      "/designer-backstage/products/atlas-bed/atlas-1.png",
      "/designer-backstage/products/atlas-bed/atlas-2.png",
      "/designer-backstage/products/atlas-bed/atlas-3.png",
      "/designer-backstage/products/atlas-bed/atlas-4.png",
    ],
    dimensions: {
      width: "87\" (221 cm)",
      height: "58\" (147 cm)",
      depth: "92\" (234 cm) overall",
      weight: "285 lbs (129 kg)",
    },
    fabricOptions: [
      { id: "linen-natural", name: "Linen, Natural", color: "#f5f0e6", priceModifier: 0 },
      { id: "linen-charcoal", name: "Linen, Charcoal", color: "#4a4a4a", priceModifier: 0 },
      { id: "velvet-emerald", name: "Velvet, Emerald", color: "#2d5a4a", priceModifier: 450 },
      { id: "velvet-terracotta", name: "Velvet, Terracotta", color: "#c2725a", priceModifier: 450 },
      { id: "velvet-onyx", name: "Velvet, Onyx", color: "#1a1a1a", priceModifier: 450 },
      { id: "boucle-ivory", name: "Bouclé, Ivory", color: "#faf8f5", priceModifier: 580 },
    ],
    sizeOptions: [
      {
        id: "queen",
        name: "Queen",
        dimensions: "60\" W × 80\" L",
        price: 4200,
      },
      {
        id: "king",
        name: "King",
        dimensions: "76\" W × 80\" L",
        price: 4850,
      },
      {
        id: "cal-king",
        name: "California King",
        dimensions: "72\" W × 84\" L",
        price: 4850,
      },
    ],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
