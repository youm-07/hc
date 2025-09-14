// Inventory Management System for Harvi Creates
class InventoryManager {
  constructor() {
    this.reservations = new Map(); // Temporary reservations during checkout
    this.reservationTimeout = 10 * 60 * 1000; // 10 minutes
  }

  async checkAvailability(productId, quantity = 1) {
    try {
      if (!window.supabaseService) {
        throw new Error('Supabase service not available');
      }

      const { data: product, error } = await window.supabaseService.supabase
        .from('products')
        .select('id, title, stock_quantity')
        .eq('id', productId)
        .single();

      if (error) {
        window.logger?.error('Failed to check product availability', { productId, error });
        return { available: false, error: 'Product not found' };
      }

      const currentStock = product.stock_quantity || 0;
      const reserved = this.getReservedQuantity(productId);
      const availableStock = currentStock - reserved;

      window.logger?.info('Stock check completed', { 
        productId, 
        currentStock, 
        reserved, 
        availableStock, 
        requestedQuantity: quantity 
      });

      return {
        available: availableStock >= quantity,
        availableStock,
        currentStock,
        reserved,
        product
      };
    } catch (error) {
      window.logger?.error('Inventory check failed', { productId, quantity, error: error.message });
      return { available: false, error: error.message };
    }
  }

  async reserveItems(items, sessionId = null) {
    const reservationId = sessionId || this.generateReservationId();
    const reservedItems = [];

    try {
      for (const item of items) {
        const availability = await this.checkAvailability(item.id, item.qty);
        
        if (!availability.available) {
          // Rollback previous reservations
          this.releaseReservation(reservationId);
          return {
            success: false,
            error: `${availability.product?.title || 'Product'} is not available in requested quantity`,
            availableStock: availability.availableStock
          };
        }

        // Create reservation
        const reservation = {
          productId: item.id,
          quantity: item.qty,
          timestamp: Date.now(),
          sessionId: reservationId
        };

        if (!this.reservations.has(item.id)) {
          this.reservations.set(item.id, []);
        }
        this.reservations.get(item.id).push(reservation);
        reservedItems.push(item);

        window.logger?.info('Item reserved', { productId: item.id, quantity: item.qty, reservationId });
      }

      // Set timeout to auto-release reservation
      setTimeout(() => {
        this.releaseReservation(reservationId);
      }, this.reservationTimeout);

      return {
        success: true,
        reservationId,
        reservedItems,
        expiresAt: Date.now() + this.reservationTimeout
      };

    } catch (error) {
      this.releaseReservation(reservationId);
      window.logger?.error('Reservation failed', { items, error: error.message });
      return { success: false, error: error.message };
    }
  }

  getReservedQuantity(productId) {
    const productReservations = this.reservations.get(productId) || [];
    const now = Date.now();
    
    // Clean expired reservations
    const validReservations = productReservations.filter(r => 
      now - r.timestamp < this.reservationTimeout
    );
    this.reservations.set(productId, validReservations);

    return validReservations.reduce((total, reservation) => total + reservation.quantity, 0);
  }

  releaseReservation(reservationId) {
    let releasedCount = 0;
    
    for (const [productId, reservations] of this.reservations.entries()) {
      const filtered = reservations.filter(r => r.sessionId !== reservationId);
      releasedCount += reservations.length - filtered.length;
      
      if (filtered.length === 0) {
        this.reservations.delete(productId);
      } else {
        this.reservations.set(productId, filtered);
      }
    }

    if (releasedCount > 0) {
      window.logger?.info('Reservation released', { reservationId, itemsReleased: releasedCount });
    }
  }

  async confirmPurchase(reservationId, orderData) {
    try {
      if (!window.supabaseService) {
        throw new Error('Supabase service not available');
      }

      // Get reserved items
      const reservedItems = [];
      for (const [productId, reservations] of this.reservations.entries()) {
        const reservation = reservations.find(r => r.sessionId === reservationId);
        if (reservation) {
          reservedItems.push({
            id: productId,
            quantity: reservation.quantity
          });
        }
      }

      if (reservedItems.length === 0) {
        throw new Error('No valid reservation found');
      }

      // Update stock quantities in database
      for (const item of reservedItems) {
        const { error } = await window.supabaseService.supabase
          .from('products')
          .update({ 
            stock_quantity: window.supabaseService.supabase.raw(`stock_quantity - ${item.quantity}`)
          })
          .eq('id', item.id);

        if (error) {
          window.logger?.error('Failed to update stock', { productId: item.id, error });
          throw new Error(`Failed to update stock for product ${item.id}`);
        }
      }

      // Release the reservation
      this.releaseReservation(reservationId);

      window.logger?.info('Purchase confirmed', { reservationId, itemCount: reservedItems.length });
      
      return { success: true, updatedItems: reservedItems };

    } catch (error) {
      window.logger?.error('Purchase confirmation failed', { reservationId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  generateReservationId() {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getReservationStatus(reservationId) {
    const now = Date.now();
    let totalItems = 0;
    let expiresAt = null;

    for (const reservations of this.reservations.values()) {
      const reservation = reservations.find(r => r.sessionId === reservationId);
      if (reservation) {
        totalItems += reservation.quantity;
        const expiry = reservation.timestamp + this.reservationTimeout;
        if (!expiresAt || expiry < expiresAt) {
          expiresAt = expiry;
        }
      }
    }

    return {
      exists: totalItems > 0,
      itemCount: totalItems,
      expiresAt,
      timeRemaining: expiresAt ? Math.max(0, expiresAt - now) : 0,
      expired: expiresAt ? now > expiresAt : false
    };
  }
}

// Initialize global inventory manager
window.inventoryManager = new InventoryManager();

// Enhanced cart functions with inventory management
window.addToCartWithInventory = async function(productId, quantity = 1) {
  try {
    const availability = await window.inventoryManager.checkAvailability(productId, quantity);
    
    if (!availability.available) {
      const message = availability.availableStock > 0 
        ? `Only ${availability.availableStock} items available`
        : 'Product is out of stock';
      
      window.logger?.warn('Add to cart failed - insufficient stock', { productId, quantity, availability });
      alert(message);
      return false;
    }

    // Add to cart normally
    const cart = JSON.parse(localStorage.getItem('hc_cart') || '[]');
    const existing = cart.find(item => item.id === productId);
    
    if (existing) {
      const newQuantity = existing.qty + quantity;
      const newAvailability = await window.inventoryManager.checkAvailability(productId, newQuantity);
      
      if (!newAvailability.available) {
        const maxCanAdd = newAvailability.availableStock - existing.qty;
        if (maxCanAdd > 0) {
          alert(`Can only add ${maxCanAdd} more items. Total available: ${newAvailability.availableStock}`);
        } else {
          alert('Cannot add more items - insufficient stock');
        }
        return false;
      }
      existing.qty = newQuantity;
    } else {
      const products = window.currentProducts || [];
      const product = products.find(p => p.id === productId);
      if (!product) {
        alert('Product not found');
        return false;
      }

      const productImage = (product.images && Array.isArray(product.images) && product.images.length > 0) 
        ? product.images[0] 
        : (product.image || 'placeholder.jpg');

      cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: productImage,
        qty: quantity
      });
    }

    localStorage.setItem('hc_cart', JSON.stringify(cart));
    window.logger?.info('Item added to cart with inventory check', { productId, quantity });
    return true;

  } catch (error) {
    window.logger?.error('Add to cart with inventory failed', { productId, quantity, error: error.message });
    alert('Failed to add item to cart. Please try again.');
    return false;
  }
};
