"use client";

import Link from "next/link";
import type { Product } from "@/data/designer-backstage-products";

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600' fill='%23e8e5df'%3E%3Crect width='600' height='600' fill='%23f3f1ec'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Georgia' font-size='18' fill='%236b6560'%3EProduct%3C/text%3E%3C/svg%3E";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/designer-backstage/products/${product.slug}`} className="db-product-card">
      <div className="db-product-card-image">
        <img
          src={product.images[0]}
          alt={product.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER_SVG;
          }}
        />
      </div>
      <div className="db-product-card-content">
        <h3 className="db-product-card-name">{product.name}</h3>
        <p className="db-product-card-price">
          From ${product.price.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
