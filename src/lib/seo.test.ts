import { describe, expect, it } from "vitest";
import { reviewsJsonLd, articleJsonLd, type ParentReview } from "@/lib/seo";

const REVIEWS: ParentReview[] = [
  {
    author: "Aïcha K.",
    authorLocation: "Abidjan, Côte d'Ivoire",
    rating: 5,
    headline: "Un vrai changement",
    reviewBody: "Mon fils a enfin été vu pour ce qu'il sait faire.",
  },
  {
    author: "Moussa D.",
    authorLocation: "Dakar, Sénégal",
    rating: 3,
    headline: "Utile mais perfectible",
    reviewBody: "Bon outil, des défis très concrets.",
  },
];

describe("reviewsJsonLd", () => {
  it("expose chaque avis comme Review avec auteur, localité et note", () => {
    const ld = reviewsJsonLd(REVIEWS);
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.review).toHaveLength(2);
    expect(ld.review[0].author.name).toBe("Aïcha K.");
    expect(ld.review[0].author.address.addressLocality).toBe("Abidjan, Côte d'Ivoire");
    expect(ld.review[0].reviewRating.ratingValue).toBe(5);
  });

  it("calcule la moyenne et le nombre d'avis pour aggregateRating", () => {
    const ld = reviewsJsonLd(REVIEWS);
    expect(ld.aggregateRating.ratingValue).toBe("4.0"); // (5+3)/2
    expect(ld.aggregateRating.reviewCount).toBe(2);
    expect(ld.aggregateRating.bestRating).toBe(5);
  });

  it("gère un tableau vide sans échouer (agrégat à zéro)", () => {
    const ld = reviewsJsonLd([]);
    expect(ld.aggregateRating.ratingValue).toBe("0");
    expect(ld.aggregateRating.reviewCount).toBe(0);
    expect(ld.review).toEqual([]);
  });
});

describe("articleJsonLd", () => {
  it("génère un schéma Article conforme Google avec auteur Person par défaut pour l'E-E-A-T", () => {
    const ld = articleJsonLd({
      headline: "Les 9 formes d'intelligence pour révéler ses talents",
      description: "Guide complet sur Gardner...",
      path: "/guides/intelligences-multiples-gardner",
      datePublished: "2026-08-27",
    });

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe("Les 9 formes d'intelligence pour révéler ses talents");
    expect(ld.author["@type"]).toBe("Person");
    expect(ld.author.name).toBe("Cheick Mohamed TRAORE");
    expect(ld.author.url).toContain("/a-propos");
    expect(ld.publisher["@id"]).toContain("/#organization");
    expect(ld.mainEntityOfPage["@id"]).toContain("/guides/intelligences-multiples-gardner");
  });

  it("supporte un auteur Organization si explicitement demandé", () => {
    const ld = articleJsonLd({
      headline: "Titre test",
      description: "Desc test",
      path: "/guides/test",
      datePublished: "2026-08-27",
      authorType: "Organization",
      authorName: "Génizio Éditions",
    });

    expect(ld.author["@type"]).toBe("Organization");
    expect(ld.author.name).toBe("Génizio Éditions");
  });
});

