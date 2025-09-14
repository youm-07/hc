// Loading States Management for Harvi Creates
class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.createGlobalSpinner();
  }

  createGlobalSpinner() {
    // Create global loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'global-loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
    `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #87CEEB;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    const text = document.createElement('div');
    text.id = 'loading-text';
    text.style.cssText = `
      margin-top: 20px;
      color: #333;
      font-family: Arial, sans-serif;
      font-size: 16px;
      text-align: center;
    `;
    text.textContent = 'Loading...';

    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.appendChild(spinner);
    container.appendChild(text);
    overlay.appendChild(container);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  }

  show(message = 'Loading...', id = 'default') {
    this.activeLoaders.add(id);
    const overlay = document.getElementById('global-loading-overlay');
    const text = document.getElementById('loading-text');
    
    if (overlay && text) {
      text.textContent = message;
      overlay.style.display = 'flex';
    }

    window.logger?.info('Loading started', { id, message });
  }

  hide(id = 'default') {
    this.activeLoaders.delete(id);
    
    // Only hide if no other loaders are active
    if (this.activeLoaders.size === 0) {
      const overlay = document.getElementById('global-loading-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    }

    window.logger?.info('Loading completed', { id });
  }

  showButtonLoading(button, originalText = null) {
    if (!button) return;
    
    const text = originalText || button.textContent;
    button.dataset.originalText = text;
    button.textContent = 'Loading...';
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';
  }

  hideButtonLoading(button) {
    if (!button) return;
    
    const originalText = button.dataset.originalText;
    if (originalText) {
      button.textContent = originalText;
      delete button.dataset.originalText;
    }
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  }

  showElementLoading(element, message = 'Loading...') {
    if (!element) return;
    
    const originalContent = element.innerHTML;
    element.dataset.originalContent = originalContent;
    element.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #87CEEB; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></div>
        ${message}
      </div>
    `;
  }

  hideElementLoading(element) {
    if (!element) return;
    
    const originalContent = element.dataset.originalContent;
    if (originalContent) {
      element.innerHTML = originalContent;
      delete element.dataset.originalContent;
    }
  }
}

// Initialize global loading manager
window.loadingManager = new LoadingManager();

// Enhanced async wrapper with loading states
window.withLoading = async function(asyncFunction, options = {}) {
  const {
    message = 'Loading...',
    id = 'default',
    button = null,
    element = null,
    showGlobal = true
  } = options;

  try {
    // Show loading states
    if (showGlobal) {
      window.loadingManager.show(message, id);
    }
    if (button) {
      window.loadingManager.showButtonLoading(button);
    }
    if (element) {
      window.loadingManager.showElementLoading(element, message);
    }

    // Execute the async function
    const result = await asyncFunction();
    return result;

  } catch (error) {
    window.logger?.error('Async operation failed', { message, id, error: error.message });
    throw error;
  } finally {
    // Hide loading states
    if (showGlobal) {
      window.loadingManager.hide(id);
    }
    if (button) {
      window.loadingManager.hideButtonLoading(button);
    }
    if (element) {
      window.loadingManager.hideElementLoading(element);
    }
  }
};
