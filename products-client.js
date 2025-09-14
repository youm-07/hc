async function fetchProducts() {
  try {
    if (window.supabaseService) {
      const response = await window.supabaseService.getProducts();
      // The getProducts function in supabase-config now returns the data array directly
      return response.success ? response.data : [];
    } else {
      return [];
    }
  } catch (e) {
    return []; // Return an empty array on failure
  }
}

async function getProductById(id) {
  const list = await fetchProducts();
  return list.find(p => p.id === id) || list[0];
}
