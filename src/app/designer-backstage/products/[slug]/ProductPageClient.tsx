"use client";

import { useState } from "react";
import type { Product, FabricOption, SizeOption } from "@/data/designer-backstage-products";

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800' fill='%23e8e5df'%3E%3Crect width='800' height='800' fill='%23f3f1ec'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Georgia' font-size='24' fill='%236b6560'%3EProduct Image%3C/text%3E%3C/svg%3E";

interface ProductPageClientProps {
  product: Product;
}

export function ProductPageClient({ product }: ProductPageClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedFabric, setSelectedFabric] = useState<FabricOption>(
    product.fabricOptions[0]
  );
  const [selectedSize, setSelectedSize] = useState<SizeOption>(
    product.sizeOptions[0]
  );

  const displayPrice =
    selectedSize.price + (selectedFabric.priceModifier ?? 0);

  return (
    <div className="db-product">
      {/* Gallery + Details Grid */}
      <div className="db-product-layout">
        {/* Image Gallery */}
        <div className="db-product-gallery">
          <div className="db-product-main-image">
            <img
              src={product.images[selectedImageIndex]}
              alt={product.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER_SVG;
              }}
              className="db-product-image"
            />
          </div>
          {product.images.length > 1 && (
            <div className="db-product-thumbnails">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImageIndex(i)}
                  className={`db-thumb ${i === selectedImageIndex ? "db-thumb-active" : ""}`}
                >
                  <img
                    src={img}
                    alt={`${product.name} view ${i + 1}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = PLACEHOLDER_SVG;
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="db-product-details">
          <h1 className="db-product-title">{product.name}</h1>

          <p className="db-product-price">
            ${displayPrice.toLocaleString()}
          </p>

          <p className="db-product-description">{product.shortDescription}</p>

          {/* Dimensions */}
          <section className="db-product-section">
            <h3 className="db-product-section-title">Dimensions</h3>
            <dl className="db-dims">
              <div>
                <dt>Width</dt>
                <dd>{product.dimensions.width}</dd>
              </div>
              <div>
                <dt>Height</dt>
                <dd>{product.dimensions.height}</dd>
              </div>
              <div>
                <dt>Depth</dt>
                <dd>{product.dimensions.depth}</dd>
              </div>
              {product.dimensions.weight && (
                <div>
                  <dt>Weight</dt>
                  <dd>{product.dimensions.weight}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Size Options */}
          <section className="db-product-section">
            <h3 className="db-product-section-title">Size</h3>
            <div className="db-size-options">
              {product.sizeOptions.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`db-size-btn ${selectedSize.id === size.id ? "db-size-btn-active" : ""}`}
                >
                  <span className="db-size-name">{size.name}</span>
                  <span className="db-size-dims">{size.dimensions}</span>
                  <span className="db-size-price">
                    ${size.price.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Fabric Options */}
          <section className="db-product-section">
            <h3 className="db-product-section-title">Fabric</h3>
            <div className="db-fabric-options">
              {product.fabricOptions.map((fabric) => (
                <button
                  key={fabric.id}
                  type="button"
                  onClick={() => setSelectedFabric(fabric)}
                  className={`db-fabric-btn ${selectedFabric.id === fabric.id ? "db-fabric-btn-active" : ""}`}
                  title={fabric.name}
                >
                  <span
                    className="db-fabric-swatch"
                    style={{ backgroundColor: fabric.color }}
                  />
                  <span className="db-fabric-name">{fabric.name}</span>
                  {fabric.priceModifier ? (
                    <span className="db-fabric-upcharge">
                      +${fabric.priceModifier}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="db-product-actions">
            <button type="button" className="db-btn db-btn-primary">
              Inquire
            </button>
            <button type="button" className="db-btn db-btn-secondary">
              Request Sample
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
