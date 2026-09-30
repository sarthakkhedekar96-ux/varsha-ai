// Authoritative 57-District Master for VARSHA AI Portal
// Mirrors backend/pipeline/district_master.py exactly.

export const INDIA_DISTRICTS_57 = [
  // Maharashtra (13)
  { id: "pune", name: "Pune", state: "Maharashtra", subdivision: "Madhya Maharashtra", lat: 18.5204, lng: 73.8567, elevation: 560, terrain: "Orographic/Ghats" },
  { id: "mumbai suburban", name: "Mumbai Suburban", state: "Maharashtra", subdivision: "Konkan & Goa", lat: 19.0760, lng: 72.8777, elevation: 14, terrain: "Coastal" },
  { id: "mumbai city", name: "Mumbai City", state: "Maharashtra", subdivision: "Konkan & Goa", lat: 18.9388, lng: 72.8353, elevation: 10, terrain: "Coastal" },
  { id: "thane", name: "Thane", state: "Maharashtra", subdivision: "Konkan & Goa", lat: 19.2183, lng: 72.9781, elevation: 15, terrain: "Coastal" },
  { id: "raigad", name: "Raigad", state: "Maharashtra", subdivision: "Konkan & Goa", lat: 18.5158, lng: 73.1812, elevation: 30, terrain: "Coastal" },
  { id: "ratnagiri", name: "Ratnagiri", state: "Maharashtra", subdivision: "Konkan & Goa", lat: 16.9902, lng: 73.3120, elevation: 11, terrain: "Coastal" },
  { id: "sindhudurg", name: "Sindhudurg", state: "Maharashtra", subdivision: "Konkan & Goa", lat: 16.1265, lng: 73.6993, elevation: 25, terrain: "Coastal" },
  { id: "nashik", name: "Nashik", state: "Maharashtra", subdivision: "Madhya Maharashtra", lat: 19.9975, lng: 73.7898, elevation: 600, terrain: "Orographic/Ghats" },
  { id: "satara", name: "Satara", state: "Maharashtra", subdivision: "Madhya Maharashtra", lat: 17.6805, lng: 74.0183, elevation: 742, terrain: "Orographic/Ghats" },
  { id: "kolhapur", name: "Kolhapur", state: "Maharashtra", subdivision: "Madhya Maharashtra", lat: 16.7050, lng: 74.2433, elevation: 545, terrain: "Orographic/Ghats" },
  { id: "nagpur", name: "Nagpur", state: "Maharashtra", subdivision: "Vidarbha", lat: 21.1458, lng: 79.0882, elevation: 310, terrain: "Plains" },
  { id: "aurangabad", name: "Chhatrapati Sambhaji Nagar (Aurangabad)", state: "Maharashtra", subdivision: "Marathwada", lat: 19.8762, lng: 75.3433, elevation: 568, terrain: "Plateau" },
  { id: "solapur", name: "Solapur", state: "Maharashtra", subdivision: "Madhya Maharashtra", lat: 17.6599, lng: 75.9064, elevation: 458, terrain: "Plateau" },

  // Kerala (6)
  { id: "wayanad", name: "Wayanad", state: "Kerala", subdivision: "Kerala & Mahe", lat: 11.6854, lng: 76.1320, elevation: 950, terrain: "Orographic/Ghats" },
  { id: "idukki", name: "Idukki", state: "Kerala", subdivision: "Kerala & Mahe", lat: 9.8497, lng: 76.9806, elevation: 1200, terrain: "Orographic/Ghats" },
  { id: "ernakulam", name: "Ernakulam (Kochi)", state: "Kerala", subdivision: "Kerala & Mahe", lat: 9.9816, lng: 76.2999, elevation: 4, terrain: "Coastal" },
  { id: "thiruvananthapuram", name: "Thiruvananthapuram", state: "Kerala", subdivision: "Kerala & Mahe", lat: 8.5241, lng: 76.9366, elevation: 10, terrain: "Coastal" },
  { id: "palakkad", name: "Palakkad", state: "Kerala", subdivision: "Kerala & Mahe", lat: 10.7867, lng: 76.6548, elevation: 84, terrain: "Plains" },
  { id: "kozhikode", name: "Kozhikode", state: "Kerala", subdivision: "Kerala & Mahe", lat: 11.2588, lng: 75.7804, elevation: 1, terrain: "Coastal" },

  // Karnataka & Goa (5)
  { id: "bengaluru urban", name: "Bengaluru Urban", state: "Karnataka", subdivision: "South Interior Karnataka", lat: 12.9716, lng: 77.5946, elevation: 920, terrain: "Plateau" },
  { id: "dakshina kannada", name: "Dakshina Kannada (Mangaluru)", state: "Karnataka", subdivision: "Coastal Karnataka", lat: 12.9141, lng: 74.8560, elevation: 22, terrain: "Coastal" },
  { id: "uttara kannada", name: "Uttara Kannada (Karwar)", state: "Karnataka", subdivision: "Coastal Karnataka", lat: 14.8185, lng: 74.1416, elevation: 10, terrain: "Coastal" },
  { id: "shivamogga", name: "Shivamogga (Agumbe)", state: "Karnataka", subdivision: "South Interior Karnataka", lat: 13.9299, lng: 75.5681, elevation: 580, terrain: "Orographic/Ghats" },
  { id: "north goa", name: "North Goa (Panaji)", state: "Goa", subdivision: "Konkan & Goa", lat: 15.4909, lng: 73.8278, elevation: 7, terrain: "Coastal" },

  // Tamil Nadu & Puducherry (4)
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", subdivision: "Tamil Nadu, Puducherry & Karaikal", lat: 13.0827, lng: 80.2707, elevation: 6, terrain: "Coastal" },
  { id: "nilgiris", name: "Nilgiris (Udhagamandalam)", state: "Tamil Nadu", subdivision: "Tamil Nadu, Puducherry & Karaikal", lat: 11.4102, lng: 76.6950, elevation: 2240, terrain: "Orographic/Ghats" },
  { id: "coimbatore", name: "Coimbatore", state: "Tamil Nadu", subdivision: "Tamil Nadu, Puducherry & Karaikal", lat: 11.0168, lng: 76.9558, elevation: 411, terrain: "Plains" },
  { id: "madurai", name: "Madurai", state: "Tamil Nadu", subdivision: "Tamil Nadu, Puducherry & Karaikal", lat: 9.9252, lng: 78.1198, elevation: 101, terrain: "Plains" },

  // Telangana & Andhra Pradesh (3)
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", subdivision: "Telangana", lat: 17.3850, lng: 78.4867, elevation: 542, terrain: "Plateau" },
  { id: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh", subdivision: "Coastal Andhra Pradesh & Yanam", lat: 17.6868, lng: 83.2185, elevation: 11, terrain: "Coastal" },
  { id: "vijayawada", name: "NTR (Vijayawada)", state: "Andhra Pradesh", subdivision: "Coastal Andhra Pradesh & Yanam", lat: 16.5062, lng: 80.6480, elevation: 23, terrain: "Plains" },

  // Gujarat & Rajasthan (5)
  { id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", subdivision: "Gujarat Region", lat: 23.0225, lng: 72.5714, elevation: 53, terrain: "Plains" },
  { id: "surat", name: "Surat", state: "Gujarat", subdivision: "Gujarat Region", lat: 21.1702, lng: 72.8311, elevation: 13, terrain: "Coastal" },
  { id: "kutch", name: "Kutch (Bhuj)", state: "Gujarat", subdivision: "Saurashtra & Kutch", lat: 23.2420, lng: 69.6669, elevation: 110, terrain: "Arid Plains" },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", subdivision: "East Rajasthan", lat: 26.9124, lng: 75.7873, elevation: 431, terrain: "Plains" },
  { id: "jodhpur", name: "Jodhpur", state: "Rajasthan", subdivision: "West Rajasthan", lat: 26.2389, lng: 73.0243, elevation: 231, terrain: "Arid Plains" },

  // Delhi, Punjab, UP, MP (5)
  { id: "new delhi", name: "New Delhi", state: "Delhi", subdivision: "Haryana, Chandigarh & Delhi", lat: 28.6139, lng: 77.2090, elevation: 216, terrain: "Plains" },
  { id: "amritsar", name: "Amritsar", state: "Punjab", subdivision: "Punjab", lat: 31.6340, lng: 74.8723, elevation: 234, terrain: "Plains" },
  { id: "lucknow", name: "Lucknow", state: "Uttar Pradesh", subdivision: "East Uttar Pradesh", lat: 26.8467, lng: 80.9462, elevation: 123, terrain: "Plains" },
  { id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", subdivision: "East Uttar Pradesh", lat: 25.3176, lng: 82.9739, elevation: 81, terrain: "Plains" },
  { id: "bhopal", name: "Bhopal", state: "Madhya Pradesh", subdivision: "West Madhya Pradesh", lat: 23.2599, lng: 77.4126, elevation: 500, terrain: "Plateau" },

  // Himachal Pradesh, Uttarakhand, J&K (5)
  { id: "shimla", name: "Shimla", state: "Himachal Pradesh", subdivision: "Himachal Pradesh", lat: 31.1048, lng: 77.1734, elevation: 2276, terrain: "Himalayan" },
  { id: "kullu", name: "Kullu (Manali)", state: "Himachal Pradesh", subdivision: "Himachal Pradesh", lat: 31.9579, lng: 77.1095, elevation: 1279, terrain: "Himalayan" },
  { id: "dehradun", name: "Dehradun", state: "Uttarakhand", subdivision: "Uttarakhand", lat: 30.3165, lng: 78.0322, elevation: 640, terrain: "Himalayan" },
  { id: "nainital", name: "Nainital", state: "Uttarakhand", subdivision: "Uttarakhand", lat: 29.3919, lng: 79.4542, elevation: 2084, terrain: "Himalayan" },
  { id: "srinagar", name: "Srinagar", state: "Jammu & Kashmir", subdivision: "Jammu & Kashmir and Ladakh", lat: 34.0837, lng: 74.7973, elevation: 1585, terrain: "Himalayan" },

  // Odisha, West Bengal, Bihar, Jharkhand (7)
  { id: "cuttack", name: "Cuttack", state: "Odisha", subdivision: "Odisha", lat: 20.4625, lng: 85.8828, elevation: 36, terrain: "Plains" },
  { id: "khordha", name: "Khordha (Bhubaneswar)", state: "Odisha", subdivision: "Odisha", lat: 20.2961, lng: 85.8245, elevation: 45, terrain: "Plains" },
  { id: "puri", name: "Puri", state: "Odisha", subdivision: "Odisha", lat: 19.8135, lng: 85.8312, elevation: 10, terrain: "Coastal" },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", subdivision: "Gangetic West Bengal", lat: 22.5726, lng: 88.3639, elevation: 9, terrain: "Coastal" },
  { id: "darjeeling", name: "Darjeeling", state: "West Bengal", subdivision: "Sub-Himalayan West Bengal", lat: 27.0410, lng: 88.2663, elevation: 2045, terrain: "Himalayan" },
  { id: "patna", name: "Patna", state: "Bihar", subdivision: "Bihar", lat: 25.5941, lng: 85.1376, elevation: 53, terrain: "Plains" },
  { id: "ranchi", name: "Ranchi", state: "Jharkhand", subdivision: "Jharkhand", lat: 23.3441, lng: 85.3096, elevation: 651, terrain: "Plateau" },

  // Northeast (4)
  { id: "east khasi hills", name: "East Khasi Hills (Cherrapunji/Sohra)", state: "Meghalaya", subdivision: "NMMT & Meghalaya", lat: 25.2986, lng: 91.7324, elevation: 1484, terrain: "Orographic/Ghats" },
  { id: "kamrup metropolitan", name: "Kamrup Metropolitan (Guwahati)", state: "Assam", subdivision: "Assam & Meghalaya", lat: 26.1445, lng: 91.7362, elevation: 55, terrain: "Plains" },
  { id: "cachar", name: "Cachar (Silchar)", state: "Assam", subdivision: "Assam & Meghalaya", lat: 24.8333, lng: 92.7789, elevation: 22, terrain: "Plains" },
  { id: "east sikkim", name: "East Sikkim (Gangtok)", state: "Sikkim", subdivision: "Sub-Himalayan West Bengal & Sikkim", lat: 27.3389, lng: 88.6065, elevation: 1650, terrain: "Himalayan" }
];

export function getDistrictMeta(id) {
  const norm = String(id || '').toLowerCase().trim();
  return INDIA_DISTRICTS_57.find(d => d.id === norm || d.id.replace(/\s+/g, '') === norm.replace(/\s+/g, '')) || INDIA_DISTRICTS_57[0];
}
