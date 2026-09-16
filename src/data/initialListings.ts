import { Listing } from "@/types";

export const INITIAL_LISTINGS: Listing[] = [
  {
    id: 1,
    sellerId: "seller1",
    title: "5 Acre Farm Land near Naini",
    type: "agricultural",
    area: 217800,
    price: 15000000,
    description:
      "Fertile soil near Yamuna river. Perfect for organic farming and farmhouse development.",
    lat: 25.398,
    lng: 81.86,
    status: "verified",
    boundary: [
      { lat: 25.399, lng: 81.859 },
      { lat: 25.397, lng: 81.861 },
      { lat: 25.399, lng: 81.861 },
    ],
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1516253593875-bd7ba052fbc5?auto=format&fit=crop&w=600&q=80",
    ],
    documents: [],
  },
  {
    id: 2,
    sellerId: "seller1",
    title: "Civil Lines Commercial Plot",
    type: "commercial",
    area: 5000,
    price: 45000000,
    description:
      "High visibility corner plot in the heart of Civil Lines. Zoning approved for retail or office complex.",
    lat: 25.455,
    lng: 81.835,
    status: "verified",
    images: [
      "https://images.unsplash.com/photo-1516156008625-3a9d60da1aeb?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=600&q=80",
    ],
    documents: [{ name: "Zoning_Permit.pdf", mock: true }],
    boundary: [],
  },
  {
    id: 3,
    sellerId: "seller2",
    title: "Jhunsi Residential View",
    type: "residential",
    area: 2000,
    price: 3500000,
    description:
      "Quiet neighborhood in Jhunsi, ready to build. Close to Sangam area.",
    lat: 25.425,
    lng: 81.91,
    status: "unverified",
    images: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=600&q=80",
    ],
    documents: [{ name: "Land_Title_Deed.pdf", mock: true }],
    boundary: [],
  },
];
