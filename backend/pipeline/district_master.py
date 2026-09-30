# Standardized Indian District Master Database & Normalization Engine
# Maps raw IMD district names to official ISO geographic metadata, terrain types, and meteorological subdivisions.

import re

INDIA_DISTRICT_MASTER = {
    # Maharashtra (Konkan, Madhya Maharashtra, Marathwada, Vidarbha)
    "pune": {"name": "Pune", "state": "Maharashtra", "subdivision": "Madhya Maharashtra", "lat": 18.5204, "lng": 73.8567, "elevation": 560, "terrain": "Orographic/Ghats"},
    "mumbai suburban": {"name": "Mumbai Suburban", "state": "Maharashtra", "subdivision": "Konkan & Goa", "lat": 19.0760, "lng": 72.8777, "elevation": 14, "terrain": "Coastal"},
    "mumbai city": {"name": "Mumbai City", "state": "Maharashtra", "subdivision": "Konkan & Goa", "lat": 18.9388, "lng": 72.8353, "elevation": 10, "terrain": "Coastal"},
    "thane": {"name": "Thane", "state": "Maharashtra", "subdivision": "Konkan & Goa", "lat": 19.2183, "lng": 72.9781, "elevation": 15, "terrain": "Coastal"},
    "raigad": {"name": "Raigad", "state": "Maharashtra", "subdivision": "Konkan & Goa", "lat": 18.5158, "lng": 73.1812, "elevation": 30, "terrain": "Coastal"},
    "ratnagiri": {"name": "Ratnagiri", "state": "Maharashtra", "subdivision": "Konkan & Goa", "lat": 16.9902, "lng": 73.3120, "elevation": 11, "terrain": "Coastal"},
    "sindhudurg": {"name": "Sindhudurg", "state": "Maharashtra", "subdivision": "Konkan & Goa", "lat": 16.1265, "lng": 73.6993, "elevation": 25, "terrain": "Coastal"},
    "nashik": {"name": "Nashik", "state": "Maharashtra", "subdivision": "Madhya Maharashtra", "lat": 19.9975, "lng": 73.7898, "elevation": 600, "terrain": "Orographic/Ghats"},
    "satara": {"name": "Satara", "state": "Maharashtra", "subdivision": "Madhya Maharashtra", "lat": 17.6805, "lng": 74.0183, "elevation": 742, "terrain": "Orographic/Ghats"},
    "kolhapur": {"name": "Kolhapur", "state": "Maharashtra", "subdivision": "Madhya Maharashtra", "lat": 16.7050, "lng": 74.2433, "elevation": 545, "terrain": "Orographic/Ghats"},
    "nagpur": {"name": "Nagpur", "state": "Maharashtra", "subdivision": "Vidarbha", "lat": 21.1458, "lng": 79.0882, "elevation": 310, "terrain": "Plains"},
    "aurangabad": {"name": "Chhatrapati Sambhaji Nagar (Aurangabad)", "state": "Maharashtra", "subdivision": "Marathwada", "lat": 19.8762, "lng": 75.3433, "elevation": 568, "terrain": "Plateau"},
    "solapur": {"name": "Solapur", "state": "Maharashtra", "subdivision": "Madhya Maharashtra", "lat": 17.6599, "lng": 75.9064, "elevation": 458, "terrain": "Plateau"},

    # Kerala
    "wayanad": {"name": "Wayanad", "state": "Kerala", "subdivision": "Kerala & Mahe", "lat": 11.6854, "lng": 76.1320, "elevation": 950, "terrain": "Orographic/Ghats"},
    "idukki": {"name": "Idukki", "state": "Kerala", "subdivision": "Kerala & Mahe", "lat": 9.8497, "lng": 76.9806, "elevation": 1200, "terrain": "Orographic/Ghats"},
    "ernakulam": {"name": "Ernakulam (Kochi)", "state": "Kerala", "subdivision": "Kerala & Mahe", "lat": 9.9816, "lng": 76.2999, "elevation": 4, "terrain": "Coastal"},
    "thiruvananthapuram": {"name": "Thiruvananthapuram", "state": "Kerala", "subdivision": "Kerala & Mahe", "lat": 8.5241, "lng": 76.9366, "elevation": 10, "terrain": "Coastal"},
    "palakkad": {"name": "Palakkad", "state": "Kerala", "subdivision": "Kerala & Mahe", "lat": 10.7867, "lng": 76.6548, "elevation": 84, "terrain": "Plains"},
    "kozhikode": {"name": "Kozhikode", "state": "Kerala", "subdivision": "Kerala & Mahe", "lat": 11.2588, "lng": 75.7804, "elevation": 1, "terrain": "Coastal"},

    # Karnataka & Goa
    "bengaluru urban": {"name": "Bengaluru Urban", "state": "Karnataka", "subdivision": "South Interior Karnataka", "lat": 12.9716, "lng": 77.5946, "elevation": 920, "terrain": "Plateau"},
    "dakshina kannada": {"name": "Dakshina Kannada (Mangaluru)", "state": "Karnataka", "subdivision": "Coastal Karnataka", "lat": 12.9141, "lng": 74.8560, "elevation": 22, "terrain": "Coastal"},
    "uttara kannada": {"name": "Uttara Kannada (Karwar)", "state": "Karnataka", "subdivision": "Coastal Karnataka", "lat": 14.8185, "lng": 74.1416, "elevation": 10, "terrain": "Coastal"},
    "shivamogga": {"name": "Shivamogga (Agumbe)", "state": "Karnataka", "subdivision": "South Interior Karnataka", "lat": 13.9299, "lng": 75.5681, "elevation": 580, "terrain": "Orographic/Ghats"},
    "north goa": {"name": "North Goa (Panaji)", "state": "Goa", "subdivision": "Konkan & Goa", "lat": 15.4909, "lng": 73.8278, "elevation": 7, "terrain": "Coastal"},

    # Tamil Nadu & Puducherry
    "chennai": {"name": "Chennai", "state": "Tamil Nadu", "subdivision": "Tamil Nadu, Puducherry & Karaikal", "lat": 13.0827, "lng": 80.2707, "elevation": 6, "terrain": "Coastal"},
    "nilgiris": {"name": "Nilgiris (Udhagamandalam)", "state": "Tamil Nadu", "subdivision": "Tamil Nadu, Puducherry & Karaikal", "lat": 11.4102, "lng": 76.6950, "elevation": 2240, "terrain": "Orographic/Ghats"},
    "coimbatore": {"name": "Coimbatore", "state": "Tamil Nadu", "subdivision": "Tamil Nadu, Puducherry & Karaikal", "lat": 11.0168, "lng": 76.9558, "elevation": 411, "terrain": "Plains"},
    "madurai": {"name": "Madurai", "state": "Tamil Nadu", "subdivision": "Tamil Nadu, Puducherry & Karaikal", "lat": 9.9252, "lng": 78.1198, "elevation": 101, "terrain": "Plains"},

    # Telangana & Andhra Pradesh
    "hyderabad": {"name": "Hyderabad", "state": "Telangana", "subdivision": "Telangana", "lat": 17.3850, "lng": 78.4867, "elevation": 542, "terrain": "Plateau"},
    "visakhapatnam": {"name": "Visakhapatnam", "state": "Andhra Pradesh", "subdivision": "Coastal Andhra Pradesh & Yanam", "lat": 17.6868, "lng": 83.2185, "elevation": 11, "terrain": "Coastal"},
    "vijayawada": {"name": "NTR (Vijayawada)", "state": "Andhra Pradesh", "subdivision": "Coastal Andhra Pradesh & Yanam", "lat": 16.5062, "lng": 80.6480, "elevation": 23, "terrain": "Plains"},

    # Gujarat & Rajasthan
    "ahmedabad": {"name": "Ahmedabad", "state": "Gujarat", "subdivision": "Gujarat Region", "lat": 23.0225, "lng": 72.5714, "elevation": 53, "terrain": "Plains"},
    "surat": {"name": "Surat", "state": "Gujarat", "subdivision": "Gujarat Region", "lat": 21.1702, "lng": 72.8311, "elevation": 13, "terrain": "Coastal"},
    "kutch": {"name": "Kutch (Bhuj)", "state": "Gujarat", "subdivision": "Saurashtra & Kutch", "lat": 23.2420, "lng": 69.6669, "elevation": 110, "terrain": "Arid Plains"},
    "jaipur": {"name": "Jaipur", "state": "Rajasthan", "subdivision": "East Rajasthan", "lat": 26.9124, "lng": 75.7873, "elevation": 431, "terrain": "Plains"},
    "jodhpur": {"name": "Jodhpur", "state": "Rajasthan", "subdivision": "West Rajasthan", "lat": 26.2389, "lng": 73.0243, "elevation": 231, "terrain": "Arid Plains"},

    # Delhi, Punjab, Haryana, UP, MP
    "new delhi": {"name": "New Delhi", "state": "Delhi", "subdivision": "Haryana, Chandigarh & Delhi", "lat": 28.6139, "lng": 77.2090, "elevation": 216, "terrain": "Plains"},
    "amritsar": {"name": "Amritsar", "state": "Punjab", "subdivision": "Punjab", "lat": 31.6340, "lng": 74.8723, "elevation": 234, "terrain": "Plains"},
    "lucknow": {"name": "Lucknow", "state": "Uttar Pradesh", "subdivision": "East Uttar Pradesh", "lat": 26.8467, "lng": 80.9462, "elevation": 123, "terrain": "Plains"},
    "varanasi": {"name": "Varanasi", "state": "Uttar Pradesh", "subdivision": "East Uttar Pradesh", "lat": 25.3176, "lng": 82.9739, "elevation": 81, "terrain": "Plains"},
    "bhopal": {"name": "Bhopal", "state": "Madhya Pradesh", "subdivision": "West Madhya Pradesh", "lat": 23.2599, "lng": 77.4126, "elevation": 500, "terrain": "Plateau"},

    # Himachal Pradesh, Uttarakhand, J&K
    "shimla": {"name": "Shimla", "state": "Himachal Pradesh", "subdivision": "Himachal Pradesh", "lat": 31.1048, "lng": 77.1734, "elevation": 2276, "terrain": "Himalayan"},
    "kullu": {"name": "Kullu (Manali)", "state": "Himachal Pradesh", "subdivision": "Himachal Pradesh", "lat": 31.9579, "lng": 77.1095, "elevation": 1279, "terrain": "Himalayan"},
    "dehradun": {"name": "Dehradun", "state": "Uttarakhand", "subdivision": "Uttarakhand", "lat": 30.3165, "lng": 78.0322, "elevation": 640, "terrain": "Himalayan"},
    "nainital": {"name": "Nainital", "state": "Uttarakhand", "subdivision": "Uttarakhand", "lat": 29.3919, "lng": 79.4542, "elevation": 2084, "terrain": "Himalayan"},
    "srinagar": {"name": "Srinagar", "state": "Jammu & Kashmir", "subdivision": "Jammu & Kashmir and Ladakh", "lat": 34.0837, "lng": 74.7973, "elevation": 1585, "terrain": "Himalayan"},

    # Odisha, West Bengal, Bihar, Jharkhand
    "cuttack": {"name": "Cuttack", "state": "Odisha", "subdivision": "Odisha", "lat": 20.4625, "lng": 85.8828, "elevation": 36, "terrain": "Plains"},
    "khordha": {"name": "Khordha (Bhubaneswar)", "state": "Odisha", "subdivision": "Odisha", "lat": 20.2961, "lng": 85.8245, "elevation": 45, "terrain": "Plains"},
    "puri": {"name": "Puri", "state": "Odisha", "subdivision": "Odisha", "lat": 19.8135, "lng": 85.8312, "elevation": 10, "terrain": "Coastal"},
    "kolkata": {"name": "Kolkata", "state": "West Bengal", "subdivision": "Gangetic West Bengal", "lat": 22.5726, "lng": 88.3639, "elevation": 9, "terrain": "Coastal"},
    "darjeeling": {"name": "Darjeeling", "state": "West Bengal", "subdivision": "Sub-Himalayan West Bengal", "lat": 27.0410, "lng": 88.2663, "elevation": 2045, "terrain": "Himalayan"},
    "patna": {"name": "Patna", "state": "Bihar", "subdivision": "Bihar", "lat": 25.5941, "lng": 85.1376, "elevation": 53, "terrain": "Plains"},
    "ranchi": {"name": "Ranchi", "state": "Jharkhand", "subdivision": "Jharkhand", "lat": 23.3441, "lng": 85.3096, "elevation": 651, "terrain": "Plateau"},

    # Northeast (Meghalaya, Assam, Sikkim, Tripura)
    "east khasi hills": {"name": "East Khasi Hills (Cherrapunji/Sohra)", "state": "Meghalaya", "subdivision": "NMMT & Meghalaya", "lat": 25.2986, "lng": 91.7324, "elevation": 1484, "terrain": "Orographic/Ghats"},
    "kamrup metropolitan": {"name": "Kamrup Metropolitan (Guwahati)", "state": "Assam", "subdivision": "Assam & Meghalaya", "lat": 26.1445, "lng": 91.7362, "elevation": 55, "terrain": "Plains"},
    "cachar": {"name": "Cachar (Silchar)", "state": "Assam", "subdivision": "Assam & Meghalaya", "lat": 24.8333, "lng": 92.7789, "elevation": 22, "terrain": "Plains"},
    "east sikkim": {"name": "East Sikkim (Gangtok)", "state": "Sikkim", "subdivision": "Sub-Himalayan West Bengal & Sikkim", "lat": 27.3389, "lng": 88.6065, "elevation": 1650, "terrain": "Himalayan"}
}

def normalize_district_name(raw_name):
    """Normalize raw district string into standardized key with alias handling"""
    if not raw_name:
        return "unknown"
    clean = raw_name.lower().strip()
    clean = clean.replace("_", " ").replace("-", " ")
    clean = re.sub(r'[^a-z0-9\s]', '', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    
    # Check exact match
    if clean in INDIA_DISTRICT_MASTER:
        return clean
        
    # Alias / alternate names mapping
    aliases = {
        "bombay": "mumbai city",
        "mumbai": "mumbai city",
        "calcutta": "kolkata",
        "madras": "chennai",
        "bangalore": "bengaluru urban",
        "bengaluru": "bengaluru urban",
        "gurugram": "new delhi",
        "gurgaon": "new delhi",
        "noida": "new delhi",
        "cherrapunji": "east khasi hills",
        "sohra": "east khasi hills",
        "guwahati": "kamrup metropolitan",
        "manali": "kullu",
        "bhubaneswar": "khordha",
        "mangalore": "dakshina kannada",
        "mangaluru": "dakshina kannada",
        "ooty": "nilgiris",
        "udhagamandalam": "nilgiris",
        "cochin": "ernakulam",
        "kochi": "ernakulam",
        "trivandrum": "thiruvananthapuram"
    }
    
    if clean in aliases:
        return aliases[clean]

    # Check partial match
    for k in INDIA_DISTRICT_MASTER:
        if k in clean or clean in k:
            return k
            
    return clean

def get_district_metadata(district_key):
    norm_key = normalize_district_name(district_key)
    if norm_key in INDIA_DISTRICT_MASTER:
        return INDIA_DISTRICT_MASTER[norm_key]
    return {
        "name": district_key.title(),
        "state": "India",
        "subdivision": "General Subdivision",
        "lat": 20.5937,
        "lng": 78.9629,
        "elevation": 200,
        "terrain": "Plains"
    }

def get_all_districts_list():
    """Return all districts metadata as a structured list"""
    return [
        {"id": k, **v} for k, v in INDIA_DISTRICT_MASTER.items()
    ]
