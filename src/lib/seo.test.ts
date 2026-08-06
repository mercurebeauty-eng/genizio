import { describe, expect, it } from "vitest";
import { reviewsJsonLd, type ParentReview } from "@/lib/seo";

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
