const IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ||
  "https://your-default-host.com/supplai";

export const landingImages = {
  hero: "/landing/hero.jpg",

  suppliers: [
    "/landing/supplier-1.jpg",
    "/landing/supplier-2.jpg",
    "/landing/supplier-3.jpg",
  ],

  steps: [
    "/landing/step-1.jpg",
    "/landing/step-2.jpg",
    "/landing/step-3.jpg",
    "/landing/step-4.jpg",
  ],

  footer: `${IMAGE_BASE_URL}/landing/footer-factory.jpg`,
};
