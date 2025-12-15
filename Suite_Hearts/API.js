// api/propertyService.js

const API_URL = "http://localhost:3000"; // change to your IP if testing on device

// Fetch all properties
export const getProperties = async () => {
  try {
    const response = await fetch(`${API_URL}/properties`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw error;
  }
};

// Get single property
export const getProperty = async (id) => {
  try {
    const response = await fetch(`${API_URL}/properties/${id}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching property:", error);
    throw error;
  }
};

// Filter properties by city
export const searchProperties = async (city) => {
  try {
    const response = await fetch(`${API_URL}/properties?city=${city}`);
    return await response.json();
  } catch (error) {
    console.error("Error searching properties:", error);
    throw error;
  }
};

// Save a favorite property
export const saveProperty = async (property) => {
  try {
    const response = await fetch(`${API_URL}/savedProperties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(property),
    });
    return await response.json();
  } catch (error) {
    console.error("Error saving property:", error);
    throw error;
  }
};

// Get saved properties
export const getSavedProperties = async () => {
  try {
    const response = await fetch(`${API_URL}/savedProperties`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching saved properties:", error);
    throw error;
  }
};
