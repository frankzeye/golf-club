import { products } from "@/data/designer-backstage-products";
import { ProductCard } from "./ProductCard";

export default function DesignerBackstageHome() {
  return (
    <div className="db-home">
      <section className="db-hero">
        <h1 className="db-hero-title">Curated for the Discerning</h1>
        <p className="db-hero-sub">
          Bespoke furniture crafted with intention. Each piece tells a story.
        </p>
      </section>
      <section className="db-collection">
        <h2 className="db-section-title">The Collection</h2>
        <div className="db-product-grid">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
