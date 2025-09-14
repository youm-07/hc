// Payment Integration Testing System for Harvi Creates
class PaymentTester {
  constructor() {
    this.testTransactions = [];
    this.testMode = true;
  }

  generateTestTransactionId() {
    const prefix = 'TEST_';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    return `${prefix}${timestamp}_${random}`;
  }

  validateUPITransactionId(txId) {
    // Basic UPI transaction ID validation
    const patterns = [
      /^TEST_\d+_[a-z0-9]+$/i, // Test transactions
      /^\d{12}$/,              // 12 digit numeric
      /^[A-Z0-9]{10,20}$/,     // Alphanumeric 10-20 chars
      /^\d{4}\d{6}\d{2,6}$/    // Bank specific formats
    ];

    return patterns.some(pattern => pattern.test(txId));
  }

  async simulatePaymentVerification(txId, amount) {
    window.logger?.info('Simulating payment verification', { txId, amount });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test transaction scenarios
    if (txId.startsWith('TEST_FAIL_')) {
      return {
        success: false,
        error: 'Payment verification failed',
        status: 'failed'
      };
    }

    if (txId.startsWith('TEST_PENDING_')) {
      return {
        success: false,
        error: 'Payment is still pending',
        status: 'pending'
      };
    }

    if (txId.startsWith('TEST_') || this.validateUPITransactionId(txId)) {
      const transaction = {
        id: txId,
        amount: amount,
        status: 'success',
        timestamp: new Date().toISOString(),
        method: 'UPI',
        verified: true
      };

      this.testTransactions.push(transaction);
      
      return {
        success: true,
        transaction,
        status: 'success'
      };
    }

    return {
      success: false,
      error: 'Invalid transaction ID format',
      status: 'invalid'
    };
  }

  createTestPaymentInterface() {
    const testPanel = document.createElement('div');
    testPanel.id = 'payment-test-panel';
    testPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: #fff;
      border: 2px solid #87CEEB;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      display: none;
    `;

    testPanel.innerHTML = `
      <h4 style="margin: 0 0 15px 0; color: #333;">Payment Testing</h4>
      <div style="margin-bottom: 10px;">
        <button onclick="window.paymentTester.generateTestTxId()" style="background: #87CEEB; color: #333; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Generate Test ID</button>
        <button onclick="window.paymentTester.togglePanel()" style="background: #ff6b6b; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
      <div style="margin-bottom: 10px;">
        <label>Test Scenarios:</label><br>
        <button onclick="window.paymentTester.fillTestId('TEST_SUCCESS_123')" style="background: #51cf66; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">Success</button>
        <button onclick="window.paymentTester.fillTestId('TEST_FAIL_456')" style="background: #ff6b6b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">Fail</button>
        <button onclick="window.paymentTester.fillTestId('TEST_PENDING_789')" style="background: #ffd43b; color: #333; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin: 2px; font-size: 12px;">Pending</button>
      </div>
      <div id="test-transactions" style="max-height: 200px; overflow-y: auto; border-top: 1px solid #eee; padding-top: 10px;">
        <small style="color: #666;">Test transactions will appear here</small>
      </div>
    `;

    document.body.appendChild(testPanel);
  }

  generateTestTxId() {
    const testId = this.generateTestTransactionId();
    this.fillTestId(testId);
  }

  fillTestId(txId) {
    const txInput = document.getElementById('txid');
    if (txInput) {
      txInput.value = txId;
      txInput.focus();
    }
  }

  togglePanel() {
    const panel = document.getElementById('payment-test-panel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  showTestPanel() {
    const panel = document.getElementById('payment-test-panel');
    if (panel) {
      panel.style.display = 'block';
    }
  }

  updateTransactionsList() {
    const container = document.getElementById('test-transactions');
    if (!container) return;

    if (this.testTransactions.length === 0) {
      container.innerHTML = '<small style="color: #666;">No test transactions yet</small>';
      return;
    }

    const transactionsHtml = this.testTransactions
      .slice(-5) // Show last 5 transactions
      .reverse()
      .map(tx => `
        <div style="padding: 5px; border-bottom: 1px solid #eee; font-size: 12px;">
          <div><strong>${tx.id}</strong></div>
          <div>₹${tx.amount} - ${tx.status}</div>
          <div style="color: #666;">${new Date(tx.timestamp).toLocaleTimeString()}</div>
        </div>
      `).join('');

    container.innerHTML = transactionsHtml;
  }

  async testPaymentFlow(orderData) {
    window.logger?.info('Testing payment flow', orderData);

    try {
      // Simulate order creation
      const orderId = `ORDER_${Date.now()}`;
      
      // Test payment verification
      const paymentResult = await this.simulatePaymentVerification(
        orderData.txid, 
        orderData.total
      );

      if (paymentResult.success) {
        // Test inventory update
        if (window.inventoryManager && orderData.reservationId) {
          const inventoryResult = await window.inventoryManager.confirmPurchase(
            orderData.reservationId, 
            orderData
          );
          
          if (!inventoryResult.success) {
            throw new Error('Inventory update failed: ' + inventoryResult.error);
          }
        }

        this.updateTransactionsList();
        
        return {
          success: true,
          orderId,
          transaction: paymentResult.transaction
        };
      } else {
        throw new Error(paymentResult.error);
      }

    } catch (error) {
      window.logger?.error('Payment flow test failed', { orderData, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Initialize payment tester
window.paymentTester = new PaymentTester();

// Add keyboard shortcut to show test panel (Ctrl+Shift+P)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    if (!document.getElementById('payment-test-panel')) {
      window.paymentTester.createTestPaymentInterface();
    }
    window.paymentTester.togglePanel();
  }
});

window.logger?.info('Payment testing system initialized');
