// Supabase Configuration for Harvi Creates
// Replace with your actual Supabase credentials

const SUPABASE_URL = 'https://mmecvljvcacdsxestmvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZWN2bGp2Y2FjZHN4ZXN0bXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzI3MDcsImV4cCI6MjA3MzM0ODcwN30._gaUOAim5AiSkK6kDV2xuehdSoo9d_qIHO2bY-1HQEI';

class SupabaseService {
  constructor() {
    const { createClient } = supabase;
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.adminSupabase = null;
  }

  // Use this method in the admin panel to get an admin-level client
  async asAdmin() {
    const serviceKey = sessionStorage.getItem('supabaseServiceKey');
    if (!serviceKey) {
      alert('Admin key not set. Please enter your key in the Admin Key section.');
      return null;
    }

    if (!this.adminSupabase || this.adminSupabase.rest.headers.apikey !== serviceKey) {
      const { createClient } = supabase;
      this.adminSupabase = createClient(SUPABASE_URL, serviceKey);
    }
    
    return this;
  }

  // Helper to format responses
  handleResponse(error, data) {
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  }

  // Order management
  async createOrder(orderData) {
    const { data, error } = await this.supabase.from('orders').insert([orderData]).select();
    return this.handleResponse(error, data);
  }

  async getOrders() {
    const { data, error } = await this.supabase.from('orders').select('*').order('created_at', { ascending: false });
    return this.handleResponse(error, data);
  }

  async getOrdersByEmail(email) {
    const { data, error } = await this.supabase.from('orders').select('*').eq('email', email).order('created_at', { ascending: false });
    return this.handleResponse(error, data);
  }

  // Product management
  async getProducts() {
    const { data, error } = await this.supabase.from('products').select('*');
    return this.handleResponse(error, data);
  }

  async createProduct(productData) {
    if (!this.adminSupabase) throw new Error('Call asAdmin() before performing this action.');
    const { data, error } = await this.adminSupabase.from('products').insert([productData]).select();
    return this.handleResponse(error, data);
  }

  async deleteProduct(productId) {
    if (!this.adminSupabase) throw new Error('Call asAdmin() before performing this action.');
    const { data, error } = await this.adminSupabase.from('products').delete().eq('id', productId);
    return this.handleResponse(error, data);
  }

  // Category management
  async getCategories() {
    const { data, error } = await this.supabase.from('categories').select('*').order('name');
    return this.handleResponse(error, data);
  }

  async createCategory(categoryData) {
    if (!this.adminSupabase) throw new Error('Call asAdmin() before performing this action.');
    const { data, error } = await this.adminSupabase.from('categories').insert([categoryData]).select();
    return this.handleResponse(error, data);
  }

  async deleteCategory(categoryId) {
    if (!this.adminSupabase) throw new Error('Call asAdmin() before performing this action.');
    const { data, error } = await this.adminSupabase.from('categories').delete().eq('id', categoryId);
    return this.handleResponse(error, data);
  }

}

// Global function to initialize the service
function initializeSupabase() {
  if (!window.supabaseService) {
    window.supabaseService = new SupabaseService();
  }
}

